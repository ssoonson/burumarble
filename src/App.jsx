import { useCallback, useEffect, useReducer, useState } from "react";
import QuizUploadStep from "./components/QuizUploadStep.jsx";
import ShareStep from "./components/ShareStep.jsx";
import SetupStep from "./components/SetupStep.jsx";
import GameScreen from "./components/GameScreen.jsx";
import { gameReducer, createInitialGameState } from "./gameEngine.js";
import { EMOJIS, DEFAULT_QUIZZES } from "./constants.js";
import { decodeQuizData } from "./utils.js";

export default function App() {
  const [step, setStep] = useState("quizUpload");
  const [customQuizzes, setCustomQuizzes] = useState([]);
  const [playerCount, setPlayerCount] = useState(4);
  const [selectedEmojis, setSelectedEmojis] = useState(EMOJIS.slice());
  const [game, dispatch] = useReducer(gameReducer, undefined, createInitialGameState);
  const [toastMsg, setToastMsg] = useState(null);

  // On load: try to pull quiz data from the URL (?q=...), which works on any static host.
  // Falls back to Claude's shared artifact storage if available (only inside Claude).
  useEffect(() => {
    let usedUrlQuiz = false;
    try {
      const params = new URLSearchParams(window.location.search);
      const q = params.get("q");
      if (q) {
        const parsed = decodeQuizData(q);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCustomQuizzes(parsed);
          usedUrlQuiz = true;
        }
      }
    } catch (err) {
      // malformed ?q= param, ignore and fall through
    }
    if (usedUrlQuiz) return;
    if (typeof window !== "undefined" && window.storage) {
      window.storage
        .get("shared-quiz-set", true)
        .then((result) => {
          if (result && result.value) {
            const parsed = JSON.parse(result.value);
            if (Array.isArray(parsed) && parsed.length > 0) setCustomQuizzes(parsed);
          }
        })
        .catch(() => { /* no shared quiz set yet */ });
    }
  }, []);

  // Surface toast messages emitted by the game engine.
  useEffect(() => {
    if (!game.toast) return;
    setToastMsg(game.toast);
    dispatch({ type: "CLEAR_TOAST" });
    const t = setTimeout(() => setToastMsg(null), 2500);
    return () => clearTimeout(t);
  }, [game.toast]);

  const handleUploadQuizzes = useCallback((quizzes) => {
    setCustomQuizzes(quizzes);
    if (typeof window !== "undefined" && window.storage) {
      window.storage.set("shared-quiz-set", JSON.stringify(quizzes), true).catch(() => {});
    }
  }, []);

  const handleStartGame = useCallback((emojis) => {
    dispatch({ type: "START_GAME", emojis });
    setStep("game");
  }, []);

  const handleRestart = useCallback(() => {
    setStep("setup");
  }, []);

  const quizPool = customQuizzes.length > 0 ? customQuizzes : DEFAULT_QUIZZES;
  const registeredCount = customQuizzes.length > 0 ? customQuizzes.length : DEFAULT_QUIZZES.length;

  return (
    <>
      <h1 className="app-title">🎲 부루마블</h1>
      <p className="app-subtitle">친구들과 함께 보드판을 돌아보자!</p>

      {step === "quizUpload" && (
        <QuizUploadStep
          customQuizzes={customQuizzes}
          onUpload={handleUploadQuizzes}
          onNext={() => setStep("share")}
        />
      )}

      {step === "share" && (
        <ShareStep
          customQuizzes={customQuizzes}
          onBack={() => setStep("quizUpload")}
          onNext={() => setStep("setup")}
        />
      )}

      {step === "setup" && (
        <SetupStep
          playerCount={playerCount}
          setPlayerCount={setPlayerCount}
          selectedEmojis={selectedEmojis}
          setSelectedEmojis={setSelectedEmojis}
          onBack={() => setStep("share")}
          onStart={handleStartGame}
        />
      )}

      {step === "game" && (
        <GameScreen
          game={game}
          dispatch={dispatch}
          quizPool={quizPool}
          registeredCount={registeredCount}
          usingCustom={customQuizzes.length > 0}
          onRestart={handleRestart}
        />
      )}

      {toastMsg && <div className="toast">{toastMsg}</div>}
    </>
  );
}
