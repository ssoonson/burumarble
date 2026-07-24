import {
  TOTAL_PATH,
  START_CELL,
  START_MONEY,
  SALARY,
  MAX_BUILDING_LEVEL,
  LAND_PRICES,
  UPGRADE_COSTS,
  TOLLS,
  CELL_NAMES,
  ISLAND_INDEX,
  SPACE_INDEX,
  GOLDENKEY_INDEX,
  SPECIAL_INDICES,
} from "./constants.js";

export function createPlayers(emojis) {
  return emojis.map((emoji) => ({
    emoji,
    position: 0,
    money: START_MONEY,
    bankrupt: false,
    skipTurns: 0,
  }));
}

export function createProperties() {
  return Array.from({ length: TOTAL_PATH }, () => ({
    owner: null,
    buildingLevel: 0,
  }));
}

export function createInitialGameState() {
  return {
    players: [],
    properties: [],
    currentPlayer: 0,
    turnPhase: "idle",
    turnMessage: "",
    pendingLanding: null,
    toast: null,
    winner: null,
  };
}

function activePlayerIndices(players) {
  return players.map((p, i) => i).filter((i) => !players[i].bankrupt);
}

function nextActivePlayer(players, from) {
  const n = players.length;
  for (let i = 1; i <= n; i++) {
    const idx = (from + i) % n;
    if (!players[idx].bankrupt) return idx;
  }
  return from;
}

function stepMove(players, playerIdx, steps) {
  const next = players.map((p) => ({ ...p }));
  const p = next[playerIdx];
  let salaryGained = 0;
  let pos = p.position;
  for (let s = 0; s < steps; s++) {
    pos = (pos + 1) % TOTAL_PATH;
    if (pos === START_CELL) salaryGained += SALARY;
  }
  p.position = pos;
  p.money += salaryGained;
  return { players: next, salaryGained };
}

function determineLanding(players, properties, playerIdx) {
  const pathIdx = players[playerIdx].position;
  if (pathIdx === START_CELL) return { kind: "start", pathIdx };
  if (pathIdx === ISLAND_INDEX) return { kind: "island", pathIdx };
  if (pathIdx === SPACE_INDEX) return { kind: "space", pathIdx };
  if (pathIdx === GOLDENKEY_INDEX) return { kind: "goldenkey", pathIdx };
  const prop = properties[pathIdx];
  if (prop.owner === null) return { kind: "buy", pathIdx };
  if (prop.owner === playerIdx) {
    if (prop.buildingLevel >= MAX_BUILDING_LEVEL) return { kind: "maxed", pathIdx };
    return { kind: "upgrade", pathIdx };
  }
  return { kind: "toll", pathIdx, owner: prop.owner };
}

function advanceTurn(state) {
  const active = activePlayerIndices(state.players);
  if (active.length <= 1) {
    return {
      ...state,
      turnPhase: "gameover",
      winner: active[0] ?? null,
      pendingLanding: null,
      turnMessage: active[0] != null
        ? `🎉 ${state.players[active[0]].emoji} ${active[0] + 1}번 친구 승리!`
        : "",
    };
  }
  let players = state.players;
  let next = nextActivePlayer(players, state.currentPlayer);
  const skipMsgs = [];
  let guard = 0;
  while (players[next].skipTurns > 0 && guard <= players.length) {
    skipMsgs.push(`${players[next].emoji} ${next + 1}번 친구는 무인도에 갇혀 이번 턴을 쉬어요! 😴`);
    players = players.map((p, i) => (i === next ? { ...p, skipTurns: p.skipTurns - 1 } : p));
    next = nextActivePlayer(players, next);
    guard++;
  }
  return {
    ...state,
    players,
    currentPlayer: next,
    turnPhase: "idle",
    pendingLanding: null,
    toast: skipMsgs.length > 0 ? skipMsgs.join(" ") : state.toast,
    turnMessage: `${players[next].emoji} ${next + 1}번 친구 차례예요!`,
  };
}

function applyToll(state, pathIdx, owner) {
  const players = state.players.map((p) => ({ ...p }));
  const prop = state.properties[pathIdx];
  const toll = TOLLS[prop.buildingLevel];
  const payer = state.currentPlayer;
  players[payer].money -= toll;
  players[owner].money += toll;
  let next = { ...state, players, toast: `${players[payer].emoji} → ${players[owner].emoji}에게 통행료 ${toll.toLocaleString("ko-KR")}원` };
  if (players[payer].money <= 0 && !players[payer].bankrupt) {
    players[payer].bankrupt = true;
    return { ...next, turnPhase: "bankrupt", turnMessage: `${players[payer].emoji} ${payer + 1}번 친구가 파산했어요! 😢` };
  }
  return advanceTurn(next);
}

function resolveLanding(state, players, playerIdx, toast) {
  const landing = determineLanding(players, state.properties, playerIdx);
  const p = players[playerIdx];
  const nextState = { ...state, players, toast: toast !== undefined ? toast : state.toast };

  switch (landing.kind) {
    case "start":
      return advanceTurn({ ...nextState, turnMessage: `${p.emoji} 출발지에 도착! 월급은 이미 받았어요 💵` });
    case "island":
    case "space":
    case "goldenkey":
      return { ...nextState, turnPhase: landing.kind, pendingLanding: landing };
    case "maxed":
      return advanceTurn({ ...nextState, turnMessage: `${p.emoji} 랜드마크는 더 이상 업그레이드할 수 없어요! 🏰` });
    case "toll":
      return applyToll(nextState, landing.pathIdx, landing.owner);
    default:
      return { ...nextState, turnPhase: "quiz", pendingLanding: landing };
  }
}

export function gameReducer(state, action) {
  switch (action.type) {
    case "START_GAME": {
      const players = createPlayers(action.emojis);
      return {
        ...createInitialGameState(),
        players,
        properties: createProperties(),
        turnMessage: `${players[0].emoji} 1번 친구 차례예요!`,
      };
    }

    case "MOVE_PLAYER": {
      const { players, salaryGained } = stepMove(state.players, state.currentPlayer, action.steps);
      const p = players[state.currentPlayer];
      const toast = salaryGained > 0
        ? `${p.emoji} 출발지 월급 +${salaryGained.toLocaleString("ko-KR")}원`
        : state.toast;
      return resolveLanding(state, players, state.currentPlayer, toast);
    }

    case "ANSWER_QUIZ": {
      const landing = state.pendingLanding;
      if (!landing) return state;
      const p = state.players[state.currentPlayer];
      if (action.result === "wrong") {
        return advanceTurn({ ...state, turnMessage: `${p.emoji} 오답입니다! 기회를 놓쳤어요.` });
      }
      if (action.result === "pass") {
        return advanceTurn({ ...state, turnMessage: `${p.emoji} 포기했어요.` });
      }
      return { ...state, turnPhase: "action" };
    }

    case "CHOOSE_ACTION": {
      const landing = state.pendingLanding;
      if (!landing) return state;
      const players = state.players.map((pl) => ({ ...pl }));
      const properties = state.properties.map((pr) => ({ ...pr }));
      const playerIdx = state.currentPlayer;
      const p = players[playerIdx];
      const prop = properties[landing.pathIdx];

      if (action.choice === "pass") {
        return advanceTurn({ ...state, turnMessage: `${p.emoji} 포기했어요.` });
      }

      if (landing.kind === "buy" && action.choice === "buy") {
        const price = LAND_PRICES[landing.pathIdx];
        p.money -= price;
        prop.owner = playerIdx;
        let next = { ...state, players, properties, toast: `${p.emoji} "${CELL_NAMES[landing.pathIdx]}" 구매 완료!` };
        if (p.money <= 0) {
          p.bankrupt = true;
          return { ...next, turnPhase: "bankrupt", turnMessage: `${p.emoji} ${playerIdx + 1}번 친구가 파산했어요! 😢` };
        }
        return advanceTurn(next);
      }

      if (landing.kind === "upgrade" && action.choice === "upgrade") {
        const nextLevel = prop.buildingLevel + 1;
        const cost = UPGRADE_COSTS[nextLevel];
        p.money -= cost;
        prop.buildingLevel = nextLevel;
        let next = { ...state, players, properties, toast: `${p.emoji} 업그레이드 완료!` };
        if (p.money <= 0) {
          p.bankrupt = true;
          return { ...next, turnPhase: "bankrupt", turnMessage: `${p.emoji} ${playerIdx + 1}번 친구가 파산했어요! 😢` };
        }
        return advanceTurn(next);
      }

      return state;
    }

    case "ISLAND_ROLL": {
      const playerIdx = state.currentPlayer;
      const players = state.players.map((p) => ({ ...p }));
      const isDouble = action.die1 === action.die2;
      if (isDouble) {
        return advanceTurn({ ...state, players, toast: `${players[playerIdx].emoji} 같은 숫자가 나와서 무인도를 탈출했어요! 🎉` });
      }
      players[playerIdx].skipTurns += 2;
      return advanceTurn({ ...state, players, toast: `${players[playerIdx].emoji} 탈출 실패! 무인도에서 2턴 쉬어요 😭` });
    }

    case "SPACE_ROLL": {
      const playerIdx = state.currentPlayer;
      const { players, salaryGained } = stepMove(state.players, playerIdx, action.steps);
      const p = players[playerIdx];
      const newPos = p.position;
      const baseToast = salaryGained > 0
        ? `${p.emoji} 출발지 통과 +${salaryGained.toLocaleString("ko-KR")}원`
        : null;

      if (newPos === START_CELL || SPECIAL_INDICES.has(newPos)) {
        return advanceTurn({ ...state, players, toast: baseToast ?? `${p.emoji} 우주여행으로 이동했어요! 🚀` });
      }
      const prop = state.properties[newPos];
      if (prop.owner === null) {
        return { ...state, players, turnPhase: "spaceOffer", pendingLanding: { kind: "spaceOffer", pathIdx: newPos }, toast: baseToast };
      }
      if (prop.owner === playerIdx) {
        return advanceTurn({ ...state, players, toast: baseToast ?? `${p.emoji} 이미 내 땅이에요!` });
      }
      return applyToll({ ...state, players, toast: baseToast }, newPos, prop.owner);
    }

    case "RESOLVE_SPACE_OFFER": {
      const landing = state.pendingLanding;
      if (!landing) return state;
      const playerIdx = state.currentPlayer;
      const p = state.players[playerIdx];
      if (action.choice === "accept") {
        const properties = state.properties.map((pr, i) => (i === landing.pathIdx ? { ...pr, owner: playerIdx } : pr));
        return advanceTurn({ ...state, properties, toast: `${p.emoji} 우주여행 보너스로 "${CELL_NAMES[landing.pathIdx]}"을(를) 무료로 얻었어요! 🚀` });
      }
      return advanceTurn({ ...state, turnMessage: `${p.emoji} 이번엔 그냥 넘어갔어요.` });
    }

    case "RESOLVE_GOLDEN_KEY": {
      const { effect } = action;
      const playerIdx = state.currentPlayer;
      const players = state.players.map((pl) => ({ ...pl }));
      const p = players[playerIdx];

      if (effect.type === "fine") {
        p.money -= effect.amount;
        const next = { ...state, players, toast: `${p.emoji} 벌금 ${effect.amount.toLocaleString("ko-KR")}원을 냈어요.` };
        if (p.money <= 0) {
          p.bankrupt = true;
          return { ...next, turnPhase: "bankrupt", turnMessage: `${p.emoji} ${playerIdx + 1}번 친구가 파산했어요! 😢` };
        }
        return advanceTurn(next);
      }
      if (effect.type === "bonus") {
        p.money += effect.amount;
        return advanceTurn({ ...state, players, toast: `${p.emoji} 보너스 ${effect.amount.toLocaleString("ko-KR")}원을 받았어요! 🎁` });
      }
      if (effect.type === "gotoIsland") {
        p.position = ISLAND_INDEX;
        return { ...state, players, turnPhase: "island", pendingLanding: { kind: "island", pathIdx: ISLAND_INDEX } };
      }
      if (effect.type === "gotoSpace") {
        p.position = SPACE_INDEX;
        return { ...state, players, turnPhase: "space", pendingLanding: { kind: "space", pathIdx: SPACE_INDEX } };
      }
      if (effect.type === "moveForward") {
        const moved = stepMove(state.players, playerIdx, effect.steps);
        const mp = moved.players[playerIdx];
        const toast = moved.salaryGained > 0
          ? `${mp.emoji} 출발지 통과 +${moved.salaryGained.toLocaleString("ko-KR")}원`
          : `${mp.emoji} 황금열쇠로 ${effect.steps}칸 이동!`;
        return resolveLanding(state, moved.players, playerIdx, toast);
      }
      if (effect.type === "forfeit") {
        return advanceTurn({ ...state, toast: `${p.emoji} 벌칙 타임! 다 같이 지켜봐주세요 😆` });
      }
      return state;
    }

    case "ACK_BANKRUPT": {
      return advanceTurn({ ...state, turnPhase: "idle" });
    }

    case "CLEAR_TOAST": {
      return { ...state, toast: null };
    }

    default:
      return state;
  }
}
