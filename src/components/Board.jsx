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
  roundedPolygonPath,
  shadeColor,
  gridIndexToRowCol,
} from "../isoMath.js";
import { PATH_GRID_INDICES } from "../constants.js";
import { formatMoneyShort, buildingIcons, buildingLabel } from "../utils.js";
import DiceFace from "./DiceFace.jsx";
import CharacterAvatar from "./CharacterAvatar.jsx";

const CORNER_PATH_INDICES = new Set([0, 6, 12, 18]);
const DEFAULT_TOP_COLOR = "#f2f3fa";
const CORNER_TOP_COLOR = "#e8d0b0";
const START_TOP_COLOR = "#a8c4e8";
const PAD = 24;

const PAINT_ORDER = Array.from({ length: 24 }, (_, pathIdx) => pathIdx).sort((a, b) => {
  const rcA = gridIndexToRowCol(PATH_GRID_INDICES[a]);
  const rcB = gridIndexToRowCol(PATH_GRID_INDICES[b]);
  return (rcA.row + rcA.col) - (rcB.row + rcB.col);
});

function TileFace({ x, y, topColor, isCorner }) {
  const hw = TILE_W / 2;
  const hh = TILE_H / 2;
  const top = diamondPoints(x, y);
  const leftFace = [[x - hw, y], [x, y + hh], [x, y + hh + EXTRUDE_DEPTH], [x - hw, y + EXTRUDE_DEPTH]];
  const rightFace = [[x + hw, y], [x, y + hh], [x, y + hh + EXTRUDE_DEPTH], [x + hw, y + EXTRUDE_DEPTH]];
  const strokeColor = isCorner ? "#d4b896" : "#e2e5f2";
  const highlightId = `tileHighlight-${Math.round(x)}-${Math.round(y)}`;

  return (
    <g>
      <path d={roundedPolygonPath(leftFace, 7)} fill={shadeColor(topColor, -26)} />
      <path d={roundedPolygonPath(rightFace, 7)} fill={shadeColor(topColor, -13)} />
      <path
        d={roundedPolygonPath(top, 14)}
        fill={topColor}
        stroke={strokeColor}
        strokeWidth={isCorner ? 3 : 2}
      />
      {/* soft puffy highlight — brighter toward the upper-left, mimicking matte clay light */}
      <defs>
        <radialGradient id={highlightId} cx="32%" cy="28%" r="75%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <path d={roundedPolygonPath(top, 14)} fill={`url(#${highlightId})`} />
    </g>
  );
}

export default function Board({ properties, players, displayPositions, diceRolling, diceValues, flickerValues = [1, 1] }) {
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
                <TileFace x={x} y={y} topColor={topColor} isCorner={isCorner} />
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
                          const offsetX = (stackIdx % 2) * 24 - 12;
                          const offsetY = Math.floor(stackIdx / 2) * 10 - 5;
                          return (
                            <span
                              key={playerIdx}
                              className="iso-token-piece"
                              style={{
                                left: `calc(50% + ${offsetX}px)`,
                                top: `calc(42% + ${offsetY}px)`,
                              }}
                            >
                              <span
                                className="iso-token-head"
                                style={{ borderColor: PLAYER_COLORS[playerIdx].dark }}
                              >
                                <CharacterAvatar emoji={players[playerIdx].emoji} className="iso-token-emoji" />
                              </span>
                              <span
                                className="iso-token-base"
                                style={{ background: PLAYER_COLORS[playerIdx].dark }}
                              />
                              <span className="iso-token-shadow" />
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

          <foreignObject x={-140} y={190} width={280} height={180}>
            <div xmlns="http://www.w3.org/1999/xhtml" className="iso-center-content">
              {diceRolling ? (
                <div className="iso-center-dice-roll rolling">
                  <div className="iso-center-die"><DiceFace value={flickerValues[0]} /></div>
                  <div className="iso-center-die"><DiceFace value={flickerValues[1]} /></div>
                </div>
              ) : diceValues ? (
                <div className="iso-center-dice-roll">
                  <div className="iso-center-die"><DiceFace value={diceValues[0]} /></div>
                  <div className="iso-center-die"><DiceFace value={diceValues[1]} /></div>
                </div>
              ) : (
                <>
                  <span className="iso-center-dice">🎲</span>
                  <span className="iso-center-title">부루마블</span>
                </>
              )}
            </div>
          </foreignObject>
        </svg>
      </div>
    </div>
  );
}
