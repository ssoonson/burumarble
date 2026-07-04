import {
  GRID_SIZE,
  START_CELL,
  CELL_NAMES,
  LAND_PRICES,
  TOLLS,
  PATH_GRID_INDICES,
  CENTER_INDICES,
  PLAYER_COLORS,
} from "../constants.js";
import { formatMoneyShort, buildingIcons, buildingLabel } from "../utils.js";

const CORNER_PATH_INDICES = new Set([0, 6, 12, 18]);

function gridToPlacement(index) {
  return { row: Math.floor(index / GRID_SIZE) + 1, col: (index % GRID_SIZE) + 1 };
}

export default function Board({ properties, players, displayPositions }) {
  // group players by which path index they're currently displayed on
  const tokensByPath = {};
  players.forEach((p, idx) => {
    if (p.bankrupt) return;
    const pos = displayPositions[idx] ?? p.position;
    if (!tokensByPath[pos]) tokensByPath[pos] = [];
    tokensByPath[pos].push(idx);
  });

  const cells = [];
  for (let gi = 0; gi < GRID_SIZE * GRID_SIZE; gi++) {
    if (CENTER_INDICES.has(gi)) continue;
    const pathIdx = PATH_GRID_INDICES.indexOf(gi);
    const { row, col } = gridToPlacement(gi);
    const prop = pathIdx >= 0 ? properties[pathIdx] : null;
    const owned = prop && prop.owner !== null;
    const isCorner = pathIdx >= 0 && CORNER_PATH_INDICES.has(pathIdx);
    const cellStyle = { gridRow: row, gridColumn: col };
    if (owned) {
      const color = PLAYER_COLORS[prop.owner];
      cellStyle.background = color.bg;
      cellStyle.borderColor = color.dark;
    }

    const tokens = pathIdx >= 0 ? (tokensByPath[pathIdx] || []) : [];

    cells.push(
      <div
        className={`cell${isCorner ? " corner" : ""}`}
        key={gi}
        style={cellStyle}
      >
        {pathIdx >= 0 && (
          <>
            <span className="cell-number">{pathIdx}</span>
            <span className="cell-name">{CELL_NAMES[pathIdx]}</span>
            <div className="cell-buildings">
              {prop.buildingLevel > 0 ? (
                <>
                  {buildingIcons(prop.buildingLevel).map((icon, i) => (
                    <span className={`bldg-icon${prop.buildingLevel >= 7 ? " landmark" : ""}`} key={i}>{icon}</span>
                  ))}
                  <span className="bldg-label">{buildingLabel(prop.buildingLevel)}</span>
                </>
              ) : owned && pathIdx !== START_CELL ? (
                <>
                  <span className="bldg-icon">🚩</span>
                  <span className="bldg-label">구매완료</span>
                </>
              ) : null}
            </div>
            {pathIdx !== START_CELL && (
              <div className="cell-fee">
                {owned ? (
                  <><span className="fee-type">통행료</span>{formatMoneyShort(TOLLS[prop.buildingLevel])}</>
                ) : (
                  <><span className="fee-type">땅값</span>{formatMoneyShort(LAND_PRICES[pathIdx])}</>
                )}
              </div>
            )}
            {tokens.length > 0 && (
              <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
                {tokens.map((playerIdx, stackIdx) => {
                  const offsetX = (stackIdx % 2) * 14 - 7;
                  const offsetY = Math.floor(stackIdx / 2) * 14 - 7;
                  return (
                    <span
                      key={playerIdx}
                      className="token"
                      style={{ left: `calc(50% + ${offsetX}px)`, top: `calc(50% + ${offsetY}px)` }}
                    >
                      {players[playerIdx].emoji}
                    </span>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="board-frame">
      <div className="board-wrapper">
        <div className="board">
          <div className="cell center" style={{ gridRow: "2 / span 5", gridColumn: "2 / span 5" }}>
            <span className="center-dice">🎲</span>
            <span className="center-title">부루마블</span>
          </div>
          {cells}
        </div>
      </div>
    </div>
  );
}

