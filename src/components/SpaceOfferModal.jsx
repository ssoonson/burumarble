import { CELL_NAMES } from "../constants.js";

export default function SpaceOfferModal({ landing, onChoose }) {
  const name = CELL_NAMES[landing.pathIdx];
  return (
    <div className="overlay">
      <div className="modal-card">
        <h2>🚀 우주여행 보너스!</h2>
        <p className="guide-text" style={{ fontSize: "0.95rem", color: "var(--ink)" }}>
          "{name}"에 도착했어요! 이 땅을 무료로 가질까요?
        </p>
        <div className="step-nav" style={{ marginTop: 0 }}>
          <button className="btn btn-primary" onClick={() => onChoose("accept")}>무료로 갖기! 🎁</button>
          <button className="btn btn-secondary" onClick={() => onChoose("decline")}>사양할게요</button>
        </div>
      </div>
    </div>
  );
}
