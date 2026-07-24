import { useMemo, useCallback, useState } from "react";
import Board from "../components/Board.jsx";
import DiceFace from "../components/DiceFace.jsx";
import CharacterAvatar from "../components/CharacterAvatar.jsx";
import QuizModal from "../components/QuizModal.jsx";
import { formatMoney } from "../utils.js";
import { TOTAL_PATH, SALARY, START_CELL, LAND_PRICES, TOLLS, DEFAULT_QUIZZES } from "../constants.js";

const ROLL_MS = 500;

function rollDie() {
  return Math.floor(Math.random() * 6) + 1;
}

/**
 * 실시간 멀티플레이 게임 화면.
 *
 * 핵심 원칙: 모든 게임 상태는 Firestore 의 room 문서에서 읽습니다.
 * 내 턴일 때만 쓰기가 가능하고, 쓰면 같은 방의 모든 학생 화면에 즉시 반영됩니다.
 */
export default function MultiplayerGame({
  user, room, roomId, players, quizzes, updateRoomState, updateMyPlayer, onSignOut,
}) {
  const [diceRolling, setDiceRolling] = useState(false);
  const [flicker, setFlicker] = useState([1, 1]);
  const [localQuiz, setLocalQuiz] = useState(null);

  const isMyTurn = room.currentPlayerUid === user.uid;
  const me = players.find((p) => p.uid === user.uid);

  // Board 컴포넌트가 기대하는 형태로 변환
  const boardPlayers = useMemo(
    () => players.map((p) => ({
      emoji: p.emoji,
      position: p.position ?? 0,
      money: p.money ?? 0,
      bankrupt: p.bankrupt ?? false,
    })),
    [players]
  );

  const properties = room.properties ?? [];
  const quizPool = quizzes.length > 0 ? quizzes : DEFAULT_QUIZZES;

  const handleRoll = useCallback(async () => {
    if (!isMyTurn || diceRolling || room.turnPhase !== "idle") return;

    const d1 = rollDie();
    const d2 = rollDie();
    setDiceRolling(true);

    const flickerTimer = setInterval(() => setFlicker([rollDie(), rollDie()]), 90);

    setTimeout(async () => {
      clearInterval(flickerTimer);
      setDiceRolling(false);

      const steps = d1 + d2;
      const startPos = me?.position ?? 0;
      let pos = startPos;
      let salary = 0;
      for (let i = 0; i < steps; i++) {
        pos = (pos + 1) % TOTAL_PATH;
        if (pos === START_CELL) salary += SALARY;
      }

      // 내 위치 갱신 (money 는 규칙상 학생이 못 바꾸므로 교사/서버 로직이 필요하면 별도 처리)
      await updateMyPlayer({ position: pos });

      // 방 전체 상태 갱신 — 같은 방 모두에게 실시간 전파
      const prop = properties[pos];
      let nextPhase = "idle";
      let pendingLanding = null;

      if (pos !== START_CELL && prop && prop.owner === null) {
        nextPhase = "quiz";
        pendingLanding = { kind: "buy", pathIdx: pos };
      } else if (prop && prop.owner === user.uid) {
        nextPhase = "quiz";
        pendingLanding = { kind: "upgrade", pathIdx: pos };
      }

      await updateRoomState({
        diceValues: [d1, d2],
        turnPhase: nextPhase,
        pendingLanding,
        turnMessage: `${me?.displayName ?? ""} 주사위 ${d1}+${d2}=${steps}칸 이동!`,
      });

      if (nextPhase === "quiz") {
        setLocalQuiz(quizPool[Math.floor(Math.random() * quizPool.length)]);
      } else {
        await passTurn();
      }
    }, ROLL_MS);
  }, [isMyTurn, diceRolling, room, me, properties, quizPool, updateMyPlayer, updateRoomState, user.uid]);

  const passTurn = useCallback(async () => {
    const order = room.playerOrder ?? players.map((p) => p.uid);
    const alive = order.filter((uid) => {
      const p = players.find((x) => x.uid === uid);
      return p && !p.bankrupt;
    });
    if (alive.length <= 1) {
      await updateRoomState({
        turnPhase: "gameover",
        winnerUid: alive[0] ?? null,
        pendingLanding: null,
      });
      return;
    }
    const idx = alive.indexOf(room.currentPlayerUid);
    const nextUid = alive[(idx + 1) % alive.length];
    const nextPlayer = players.find((p) => p.uid === nextUid);
    await updateRoomState({
      currentPlayerUid: nextUid,
      turnPhase: "idle",
      pendingLanding: null,
      turnMessage: `${nextPlayer?.displayName ?? ""} 차례예요!`,
    });
  }, [room, players, updateRoomState]);

  const handleQuizResolve = useCallback(async (result) => {
    setLocalQuiz(null);
    const landing = room.pendingLanding;

    if (result === "correct" && landing) {
      const next = properties.map((pr, i) =>
        i === landing.pathIdx
          ? landing.kind === "buy"
            ? { ...pr, owner: user.uid }
            : { ...pr, buildingLevel: Math.min(7, (pr.buildingLevel ?? 0) + 1) }
          : pr
      );
      await updateRoomState({ properties: next });
    }
    await passTurn();
  }, [room, properties, user.uid, updateRoomState, passTurn]);

  const currentPlayerName =
    players.find((p) => p.uid === room.currentPlayerUid)?.displayName ?? "";

  return (
    <div className="game-shell">
      <div className="quiz-status-bar">
        {room.name} · 📝 문제 {quizPool.length}개 ·
        <span className="badge" style={{ marginLeft: 8 }}>
          {isMyTurn ? "내 차례!" : `${currentPlayerName} 차례`}
        </span>
        <button className="btn btn-secondary admin-btn-sm" style={{ marginLeft: 12 }} onClick={onSignOut}>
          나가기
        </button>
      </div>

      <div className="game-main">
        <aside className="balance-panel">
          <h3>💰 잔액 현황</h3>
          <div className="balance-list">
            {players.map((p) => (
              <div
                key={p.uid}
                className={`balance-item${p.uid === room.currentPlayerUid ? " active" : ""}${p.bankrupt ? " bankrupt" : ""}`}
              >
                <CharacterAvatar emoji={p.emoji} className="balance-emoji" />
                <div className="balance-info">
                  <div className="balance-name">
                    {p.displayName}{p.uid === user.uid ? " (나)" : ""}
                  </div>
                  <div className={`balance-money${(p.money ?? 0) <= 100000 ? " low" : ""}`}>
                    {formatMoney(p.money ?? 0)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </aside>

        <div className="board-column">
          <Board
            properties={properties}
            players={boardPlayers}
            displayPositions={{}}
            diceRolling={diceRolling}
            diceValues={room.diceValues}
            flickerValues={flicker}
          />

          <div className="controls">
            <p className="turn-message">{room.turnMessage}</p>
            <div className="dice-area">
              <div className={`dice-display${diceRolling ? " rolling" : ""}`}>
                {diceRolling ? <DiceFace value={flicker[0]} />
                  : room.diceValues ? <DiceFace value={room.diceValues[0]} /> : "?"}
              </div>
              <div className={`dice-display${diceRolling ? " rolling" : ""}`}>
                {diceRolling ? <DiceFace value={flicker[1]} />
                  : room.diceValues ? <DiceFace value={room.diceValues[1]} /> : "?"}
              </div>
              <button
                className="roll-btn"
                disabled={!isMyTurn || diceRolling || room.turnPhase !== "idle"}
                onClick={handleRoll}
              >
                {isMyTurn ? "🎲 주사위 굴리기" : "다른 친구 차례예요"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {localQuiz && isMyTurn && (
        <QuizModal quiz={localQuiz} onResolve={handleQuizResolve} />
      )}
    </div>
  );
}
