export default function GoldenKeyModal({ card, onAck }) {
  return (
    <div className="overlay">
      <div className="modal-card">
        <h2>🔑 황금열쇠!</h2>
        <p className="quiz-question">{card.text}</p>
        <button className="btn btn-primary" onClick={onAck}>확인</button>
      </div>
    </div>
  );
}
