import { useState } from "react";

export default function SpaceTravelModal({ onResolve }) {
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
      setTimeout(() => onResolve(die1 + die2), 1100);
    }, 600);
  }

  return (
    <div className="overlay">
      <div className="modal-card">
        <h2>🚀 우주여행!</h2>
        <p className="guide-text" style={{ fontSize: "0.95rem", color: "var(--ink)" }}>
          주사위를 한 번 더 굴려서 나온 수만큼 이동해요. 도착한 칸이 빈 도시면 무료로 가질 수 있어요!
        </p>
        {result ? (
          <p className="quiz-result correct">
            🎲 {result.die1} + 🎲 {result.die2} = {result.die1 + result.die2}칸 이동!
          </p>
        ) : (
          <button className="btn btn-primary" disabled={rolling} onClick={handleRoll}>
            {rolling ? "굴리는 중..." : "우주 이동 굴리기! 🎲"}
          </button>
        )}
      </div>
    </div>
  );
}
