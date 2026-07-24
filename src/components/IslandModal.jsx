import { useState } from "react";

export default function IslandModal({ onResolve }) {
  const [rolling, setRolling] = useState(false);
  const [result, setResult] = useState(null);

  function handleRoll() {
    if (rolling) return;
    setRolling(true);
    setTimeout(() => {
      const die1 = Math.floor(Math.random() * 6) + 1;
      const die2 = Math.floor(Math.random() * 6) + 1;
      setResult({ die1, die2 });
      setRolling(false);
      setTimeout(() => onResolve(die1, die2), 1100);
    }, 600);
  }

  return (
    <div className="overlay">
      <div className="modal-card">
        <h2>🏝️ 무인도에 도착!</h2>
        <p className="guide-text" style={{ fontSize: "0.95rem", color: "var(--ink)" }}>
          주사위 두 개를 굴려서 <strong>같은 숫자</strong>가 나오면 탈출! 아니면 2턴을 쉬어야 해요.
        </p>
        {result ? (
          <p className={`quiz-result ${result.die1 === result.die2 ? "correct" : "wrong"}`}>
            🎲 {result.die1} / 🎲 {result.die2}
            {result.die1 === result.die2 ? " — 탈출 성공! 🎉" : " — 탈출 실패 😭"}
          </p>
        ) : (
          <button className="btn btn-primary" disabled={rolling} onClick={handleRoll}>
            {rolling ? "굴리는 중..." : "탈출 시도! 🎲"}
          </button>
        )}
      </div>
    </div>
  );
}
