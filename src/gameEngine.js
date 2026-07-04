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
} from "./constants.js";

export function createPlayers(emojis) {
  return emojis.map((emoji) => ({
    emoji,
    position: 0,
    money: START_MONEY,
    bankrupt: false,
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
    turnPhase: "idle", // idle | quiz | action | bankrupt | gameover
    turnMessage: "",
    pendingLanding: null, // { kind: 'buy'|'upgrade'|'toll'|'start'|'maxed', pathIdx }
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

function determineLanding(players, properties, playerIdx) {
  const pathIdx = players[playerIdx].position;
  if (pathIdx === START_CELL) return { kind: "start", pathIdx };
  const prop = properties[pathIdx];
  if (prop.owner === null) return { kind: "buy", pathIdx };
  if (prop.owner === playerIdx) {
    if (prop.buildingLevel >= MAX_BUILDING_LEVEL) return { kind: "maxed", pathIdx };
    return { kind: "upgrade", pathIdx };
  }
  return { kind: "toll", pathIdx, owner: prop.owner };
}

// Advances the turn to the next player, or ends the game if only one player remains.
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
  const next = nextActivePlayer(state.players, state.currentPlayer);
  return {
    ...state,
    currentPlayer: next,
    turnPhase: "idle",
    pendingLanding: null,
    diceValue: null,
    turnMessage: `${state.players[next].emoji} ${next + 1}번 친구 차례예요!`,
  };
}

function applyToll(state, pathIdx, owner) {
  const players = state.players.map((p) => ({ ...p }));
  const properties = state.properties;
  const prop = properties[pathIdx];
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
      const players = state.players.map((p) => ({ ...p }));
      const p = players[state.currentPlayer];
      let salaryGained = 0;
      let pos = p.position;
      for (let s = 0; s < action.steps; s++) {
        pos = (pos + 1) % TOTAL_PATH;
        if (pos === START_CELL) salaryGained += SALARY;
      }
      p.position = pos;
      p.money += salaryGained;

      const landing = determineLanding(players, state.properties, state.currentPlayer);
      let nextState = {
        ...state,
        players,
        toast: salaryGained > 0 ? `${p.emoji} 출발지 월급 +${salaryGained.toLocaleString("ko-KR")}원` : state.toast,
      };

      if (landing.kind === "start") {
        nextState = { ...nextState, turnMessage: `${p.emoji} 출발지에 도착! 월급은 이미 받았어요 💵` };
        return advanceTurn(nextState);
      }
      if (landing.kind === "maxed") {
        nextState = { ...nextState, turnMessage: `${p.emoji} 랜드마크는 더 이상 업그레이드할 수 없어요! 🏰` };
        return advanceTurn(nextState);
      }
      if (landing.kind === "toll") {
        return applyToll(nextState, landing.pathIdx, landing.owner);
      }
      // buy or upgrade: quiz first
      return { ...nextState, turnPhase: "quiz", pendingLanding: landing };
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
      // correct -> show buy/upgrade action modal
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
