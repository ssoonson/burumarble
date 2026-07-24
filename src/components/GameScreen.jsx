import { useEffect, useRef, useState } from "react";
import Board from "./Board.jsx";
import DiceFace from "./DiceFace.jsx";
import CharacterAvatar from "./CharacterAvatar.jsx";
import BalancePanel from "./BalancePanel.jsx";
import QuizModal from "./QuizModal.jsx";
import ActionModal from "./ActionModal.jsx";
import BankruptModal from "./BankruptModal.jsx";
import GameOverModal from "./GameOverModal.jsx";
import IslandModal from "./IslandModal.jsx";
import SpaceTravelModal from "./SpaceTravelModal.jsx";
import SpaceOfferModal from "./SpaceOfferModal.jsx";
import GoldenKeyModal from "./GoldenKeyModal.jsx";
import { PLAYER_COLORS, TOTAL_PATH, DEFAULT_QUIZZES, GOLDEN_KEY_CARDS } from "../constants.js";

const MOVE_STEP_MS = 350;
const ROLL_ANIMATION_MS = 500;

function rollDie() {
  return Math.floor(Math.random() * 6) + 1;
}

export default function GameScreen({ game, dispatch, quizPool, registeredCount, usingCustom, onRestart }) {
  const [diceRolling, setDiceRolling] = useState(false);
  const [diceValues, setDiceValues] = useState(null); // [die1, die2]
  const [flickerValues, setFlickerValues] = useState([1, 1]); // rapid random faces while rolling
  const [isAnimating, setIsAnimating] = useState(false);
  const [animatingPos, setAnimatingPos] = useState(null);
  const [movingMessage, setMovingMessage] = useState(null);
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [activeCard, setActiveCard] = useState(null);
  const moveTimerRef = useRef(null);
  const flickerTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (moveTimerRef.current) clearInterval(moveTimerRef.current);
      if (flickerTimerRef.current) clearInterval(flickerTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (game.turnPhase === "quiz") {
      const pool = quizPool.length > 0 ? quizPool : DEFAULT_QUIZZES;
      setActiveQuiz(pool[Math.floor(Math.random() * pool.length)]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.turnPhase === "quiz", game.pendingLanding]);

  useEffect(() => {
    if (game.turnPhase === "goldenkey") {
      setActiveCard(GOLDEN_KEY_CARDS[Math.floor(Math.random() * GOLDEN_KEY_CARDS.length)]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.turnPhase === "goldenkey", game.pendingLanding]);

  function handleRoll() {
    if (game.turnPhase !== "idle" || isAnimating || diceRolling) return;
    const die1 = rollDie();
    const die2 = rollDie();
    setDiceRolling(true);
    setDiceValues(null);
    flickerTimerRef.current = setInterval(() => {
      setFlickerValues([rollDie(), rollDie()]);
    }, 90);
    setTimeout(() => {
      clearInterval(flickerTimerRef.current);
      flickerTimerRef.current = null;
      setDiceRolling(false);
      setDiceValues([die1, die2]);
      animateMove(die1 + die2, die1, die2);
    }, ROLL_ANIMATION_MS);
  }

  function animateMove(steps, die1, die2) {
    const playerIdx = game.currentPlayer;
    const startPos = game.players[playerIdx].position;
    const emoji = game.players[playerIdx].emoji;
    setMovingMessage(`${emoji}이(가) 주사위 ${die1}+${die2}=${steps}칸 이동해요!`);
    setIsAnimating(true);
    let stepCount = 0;
    moveTimerRef.current = setInterval(() => {
      stepCount++;
      const pos = (startPos + stepCount) % TOTAL_PATH;
      setAnimatingPos({ playerIdx, pos });
      if (stepCount >= steps) {
        clearInterval(moveTimerRef.current);
        moveTimerRef.current = null;
        setIsAnimating(false);
        setAnimatingPos(null);
        setMovingMessage(null);
        dispatch({ type: "MOVE_PLAYER", steps });
      }
    }, MOVE_STEP_MS);
  }

  const displayPositions = {};
  if (animatingPos) displayPositions[animatingPos.playerIdx] = animatingPos.pos;

  const currentPlayer = game.players[game.currentPlayer];
  const rollDisabled = game.turnPhase !== "idle" || isAnimating || diceRolling;
  const badgeLabel = usingCustom ? `총 ${registeredCount}개 문제 등록됨` : `기본 문제 ${registeredCount}개`;

  const landingProperty = game.pendingLanding && game.pendingLanding.pathIdx != null
    ? game.properties[game.pendingLanding.pathIdx]
    : null;

  return (
    <div className="game-shell">
      <div className="quiz-status-bar">📝 등록된 문제: <span className="badge">{badgeLabel}</span></div>

      <div className="game-main">
        <BalancePanel players={game.players} currentPlayer={game.currentPlayer} />

        <div className="board-column">
          <Board
            properties={game.properties}
            players={game.players}
            displayPositions={displayPositions}
            diceRolling={diceRolling}
            diceValues={diceValues}
            flickerValues={flickerValues}
          />

          <div className="controls">
            <div className="player-status">
              {game.players.map((p, idx) => (
                <div
                  key={idx}
                  className={`player-badge${idx === game.currentPlayer ? " active" : ""}${p.bankrupt ? " bankrupt" : ""}`}
                  style={{ borderColor: idx === game.currentPlayer ? PLAYER_COLORS[idx].dark : undefined }}
                >
                  <CharacterAvatar emoji={p.emoji} className="emoji" />
                  <span>{idx + 1}번</span>
                </div>
              ))}
            </div>

            <p className="turn-message">{movingMessage || game.turnMessage}</p>

            <div className="dice-area">
              <div className={`dice-display${diceRolling ? " rolling" : ""}`}>
                {diceRolling ? <DiceFace value={flickerValues[0]} /> : (diceValues ? <DiceFace value={diceValues[0]} /> : "?")}
              </div>
              <div className={`dice-display${diceRolling ? " rolling" : ""}`}>
                {diceRolling ? <DiceFace value={flickerValues[1]} /> : (diceValues ? <DiceFace value={diceValues[1]} /> : "?")}
              </div>
              <button className="roll-btn" disabled={rollDisabled} onClick={handleRoll}>
                🎲 주사위 굴리기
              </button>
            </div>
          </div>
        </div>
      </div>

      {game.turnPhase === "quiz" && activeQuiz && (
        <QuizModal
          quiz={activeQuiz}
          onResolve={(result) => dispatch({ type: "ANSWER_QUIZ", result })}
        />
      )}

      {game.turnPhase === "action" && game.pendingLanding && landingProperty && (
        <ActionModal
          landing={game.pendingLanding}
          player={currentPlayer}
          buildingLevel={landingProperty.buildingLevel}
          onChoose={(choice) => dispatch({ type: "CHOOSE_ACTION", choice })}
        />
      )}

      {game.turnPhase === "bankrupt" && (
        <BankruptModal
          player={currentPlayer}
          playerIndex={game.currentPlayer}
          onAck={() => dispatch({ type: "ACK_BANKRUPT" })}
        />
      )}

      {game.turnPhase === "island" && (
        <IslandModal
          onResolve={(die1, die2) => dispatch({ type: "ISLAND_ROLL", die1, die2 })}
        />
      )}

      {game.turnPhase === "space" && (
        <SpaceTravelModal
          onResolve={(steps) => dispatch({ type: "SPACE_ROLL", steps })}
        />
      )}

      {game.turnPhase === "spaceOffer" && game.pendingLanding && (
        <SpaceOfferModal
          landing={game.pendingLanding}
          onChoose={(choice) => dispatch({ type: "RESOLVE_SPACE_OFFER", choice })}
        />
      )}

      {game.turnPhase === "goldenkey" && activeCard && (
        <GoldenKeyModal
          card={activeCard}
          onAck={() => dispatch({ type: "RESOLVE_GOLDEN_KEY", effect: activeCard.effect })}
        />
      )}

      {game.turnPhase === "gameover" && (
        <GameOverModal
          winner={game.winner != null ? game.players[game.winner] : null}
          onRestart={onRestart}
        />
      )}
    </div>
  );
}
