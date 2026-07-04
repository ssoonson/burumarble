import { CELL_NAMES, LAND_PRICES, UPGRADE_COSTS, BUILDING_LABELS } from "../constants.js";
import { formatMoney } from "../utils.js";

export default function ActionModal({ landing, player, buildingLevel, onChoose }) {
  const isBuy = landing.kind === "buy";
  const name = CELL_NAMES[landing.pathIdx];
  const price = isBuy ? LAND_PRICES[landing.pathIdx] : UPGRADE_COSTS[buildingLevel + 1];
  const nextLabel = isBuy ? null : BUILDING_LABELS[buildingLevel + 1];
  const canAfford = player.money >= price;

  const title = isBuy ? "🏞️ 빈 땅 발견!" : "🏗️ 건물 업그레이드";
  const desc = isBuy
    ? `"${name}" 땅을 살까요?`
    : `"${name}"에 ${nextLabel}(으)로 업그레이드할까요?`;
  const primaryLabel = canAfford
    ? (isBuy ? "사기! 🛒" : "업그레이드! ⬆️")
    : "돈이 부족해요";

  return (
    <div className="overlay">
      <div className="modal-card">
        <h2>{title}</h2>
        <p className="guide-text" style={{ fontSize: "0.95rem", color: "var(--ink)" }}>{desc}</p>
        <div className="action-price">{formatMoney(price)}</div>
        <div className="step-nav" style={{ marginTop: 0 }}>
          <button
            className="btn btn-primary"
            disabled={!canAfford}
            onClick={() => onChoose(isBuy ? "buy" : "upgrade")}
          >
            {primaryLabel}
          </button>
          <button className="btn btn-secondary" onClick={() => onChoose("pass")}>패스</button>
        </div>
      </div>
    </div>
  );
}
