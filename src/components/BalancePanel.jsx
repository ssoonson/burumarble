import { PLAYER_COLORS } from "../constants.js";
import { formatMoney } from "../utils.js";
import CharacterAvatar from "./CharacterAvatar.jsx";

export default function BalancePanel({ players, currentPlayer }) {
  return (
    <aside className="balance-panel">
      <h3>💰 잔액 현황</h3>
      <div className="balance-list">
        {players.map((p, idx) => (
          <div
            key={idx}
            className={`balance-item${idx === currentPlayer ? " active" : ""}${p.bankrupt ? " bankrupt" : ""}`}
          >
            <div className="color-dot" style={{ background: PLAYER_COLORS[idx].dark }} />
            <CharacterAvatar emoji={p.emoji} className="balance-emoji" />
            <div className="balance-info">
              <div className="balance-name">{idx + 1}번 친구{p.bankrupt ? " (파산)" : ""}</div>
              <div className={`balance-money${p.money <= 100000 && !p.bankrupt ? " low" : ""}`}>
                {formatMoney(p.money)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
