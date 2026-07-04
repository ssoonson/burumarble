export default function BankruptModal({ player, playerIndex, onAck }) {
  return (
    <div className="overlay">
      <div className="modal-card">
        <h2>😢 파산!</h2>
        <p className="guide-text" style={{ fontSize: "0.95rem", color: "var(--ink)" }}>
          {player.emoji} {playerIndex + 1}번 친구가 돈이 다 떨어져서 파산했어요! 😢
        </p>
        <button className="btn btn-primary" onClick={onAck}>확인</button>
      </div>
    </div>
  );
}
