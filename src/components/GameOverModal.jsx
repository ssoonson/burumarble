export default function GameOverModal({ winner, onRestart }) {
  return (
    <div className="overlay">
      <div className="modal-card">
        <h2>🎉 게임 종료!</h2>
        {winner ? (
          <p className="guide-text" style={{ fontSize: "1.1rem", color: "var(--ink)" }}>
            {winner.emoji} 우승을 축하해요!
          </p>
        ) : (
          <p className="guide-text" style={{ fontSize: "1.1rem", color: "var(--ink)" }}>
            게임이 끝났어요!
          </p>
        )}
        <button className="btn btn-primary" onClick={onRestart}>새 게임 시작</button>
      </div>
    </div>
  );
}
