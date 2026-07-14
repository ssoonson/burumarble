import {
  START_CELL,
  CELL_NAMES,
  LAND_PRICES,
  TOLLS,
  PLAYER_COLORS,
  SPECIAL_INDICES,
  SPECIAL_CELL_ICONS,
} from "../constants.js";
import {
  TILE_W,
  TILE_H,
  EXTRUDE_DEPTH,
  isoPositionForPathIndex,
  computeBoardBounds,
  computeCenterDiamond,
  diamondPoints,
  pointsToString,
  shadeColor,
  gridIndexToRowCol,
} from "../isoMath.js";
import { PATH_GRID_INDICES } from "../constants.js";
import { formatMoneyShort, buildingIcons, buildingLabel } from "../utils.js";

const CORNER_PATH_INDICES = new Set([0, 6, 12, 18]);
const DEFAULT_TOP_COLOR = "#fffaf2";
const CORNER_TOP_COLOR = "#ffe8c2";
const START_TOP_COLOR = "#d6f5ff";
const PAD = 24;

// Isometric tiles must be painted back-to-front (by row+col "depth") so that
// each tile's extruded side faces correctly overlap the tiles behind it.
// Path order (0-23 around the board perimeter) does NOT match this depth
// order, so we compute a dedicated paint order here.
const PAINT_ORDER = Array.from({ length: 24 }, (_, pathIdx) => pathIdx).sort((a, b) => {
  const rcA = gridIndexToRowCol(PATH_GRID_INDICES[a]);
  const rcB = gridIndexToRowCol(PATH_GRID_INDICES[b]);
  return (rcA.row + rcA.col) - (rcB.row + rcB.col);
});

function TileFace({ pathIdx, x, y, topColor, isCorner }) {
  const hw = TILE_W / 2;
  const hh = TILE_H / 2;
  const top = diamondPoints(x, y);
  const leftFace = [[x - hw, y], [x, y + hh], [x, y + hh + EXTRUDE_DEPTH], [x - hw, y + EXTRUDE_DEPTH]];
  const rightFace = [[x + hw, y], [x, y + hh], [x, y + hh + EXTRUDE_DEPTH], [x + hw, y + EXTRUDE_DEPTH]];
  const strokeColor = isCorner ? "#e8a040" : "#ffffff";

  return (
    <g>
      <polygon points={pointsToString(leftFace)} fill={shadeColor(topColor, -22)} />
      <polygon points={pointsToString(rightFace)} fill={shadeColor(topColor, -10)} />
      <polygon
        points={pointsToString(top)}
        fill={topColor}
        stroke={strokeColor}
        strokeWidth={isCorner ? 3 : 2}
      />
    </g>
  );
}

export default function Board({ properties, players, displayPositions }) {
  const bounds = computeBoardBounds();
  const vbWidth = bounds.width + PAD * 2;
  const vbHeight = bounds.height + PAD * 2;
  const viewBox = `${bounds.minX - PAD} ${bounds.minY - PAD} ${vbWidth} ${vbHeight}`;

  const tokensByPath = {};
  players.forEach((p, idx) => {
    if (p.bankrupt) return;
    const pos = displayPositions[idx] ?? p.position;
    if (!tokensByPath[pos]) tokensByPath[pos] = [];
    tokensByPath[pos].push(idx);
  });

  const centerDiamond = computeCenterDiamond();
  const hw = TILE_W / 2;
  const hh = TILE_H / 2;

  return (
    <div className="board-frame">
      <div className="iso-board-wrapper" style={{ aspectRatio: `${vbWidth} / ${vbHeight}` }}>
        <svg viewBox={viewBox} className="iso-svg" xmlns="http://www.w3.org/2000/svg">
          <polygon
            points={pointsToString(centerDiamond)}
            className="iso-center-diamond"
          />

          {PAINT_ORDER.map((pathIdx) => {
            const { x, y } = isoPositionForPathIndex(pathIdx);
            const prop = properties[pathIdx];
            const owned = prop.owner !== null;
            const isCorner = CORNER_PATH_INDICES.has(pathIdx);
            const isSpecial = SPECIAL_INDICES.has(pathIdx);
            let topColor = isSpecial ? CORNER_TOP_COLOR : DEFAULT_TOP_COLOR;
            if (pathIdx === START_CELL) topColor = START_TOP_COLOR;
            if (owned) topColor = PLAYER_COLORS[prop.owner].bg;

            const tokens = tokensByPath[pathIdx] || [];

            return (
              <g key={pathIdx}>
                <TileFace pathIdx={pathIdx} x={x} y={y} topColor={topColor} isCorner={isCorner} />
                <foreignObject x={x - hw} y={y - hh} width={TILE_W} height={TILE_H}>
                  <div xmlns="http://www.w3.org/1999/xhtml" className="iso-cell-content">
                    <span className="iso-cell-name">{CELL_NAMES[pathIdx]}</span>
                    {isSpecial ? (
                      <div className="iso-special-icon">{SPECIAL_CELL_ICONS[pathIdx]}</div>
                    ) : (
                      <>
                        <div className="iso-cell-buildings">
                          {prop.buildingLevel > 0 ? (
                            <>
                              {buildingIcons(prop.buildingLevel).map((icon, i) => (
                                <span key={i} className={`iso-bldg-icon${prop.buildingLevel >= 7 ? " landmark" : ""}`}>{icon}</span>
                              ))}
                              <span className="iso-bldg-label">{buildingLabel(prop.buildingLevel)}</span>
                            </>
                          ) : owned && pathIdx !== START_CELL ? (
                            <>
                              <span className="iso-bldg-icon">🚩</span>
                              <span className="iso-bldg-label">구매완료</span>
                            </>
                          ) : null}
                        </div>
                        {pathIdx !== START_CELL && (
                          <div className="iso-cell-fee">
                            {owned ? (
                              <><span className="iso-fee-type">통행료</span>{formatMoneyShort(TOLLS[prop.buildingLevel])}</>
                            ) : (
                              <><span className="iso-fee-type">땅값</span>{formatMoneyShort(LAND_PRICES[pathIdx])}</>
                            )}
                          </div>
                        )}
                      </>
                    )}
                    {tokens.length > 0 && (
                      <div className="iso-tokens">
                        {tokens.map((playerIdx, stackIdx) => {
                          const offsetX = (stackIdx % 2) * 16 - 8;
                          const offsetY = Math.floor(stackIdx / 2) * 16 - 8;
                          return (
                            <span
                              key={playerIdx}
                              className="iso-token"
                              style={{ left: `calc(50% + ${offsetX}px)`, top: `calc(40% + ${offsetY}px)` }}
                            >
                              {players[playerIdx].emoji}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </foreignObject>
              </g>
            );
          })}

          <foreignObject
            x={-140}
            y={190}
            width={280}
            height={180}
          >
            <div xmlns="http://www.w3.org/1999/xhtml" className="iso-center-content">
              <span className="iso-center-dice">🎲</span>
              <span className="iso-center-title">부루마블</span>
            </div>
          </foreignObject>
        </svg>
      </div>
    </div>
  );
}
