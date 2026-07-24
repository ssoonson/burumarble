import {
  START_CELL,
  CELL_NAMES,
  LAND_PRICES,
  TOLLS,
  PLAYER_COLORS,
  SPECIAL_INDICES,
  SPECIAL_CELL_ICONS,
  CHARACTER_IMAGES,
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

function TokenPiece({ x, y, color, emoji }) {
  const dark = shadeColor(color, -30);
  const light = shadeColor(color, 22);
  const faceHref = CHARACTER_IMAGES[emoji];
  const uid = `${Math.round(x)}-${Math.round(y)}-${emoji.codePointAt(0)}`;
  const gradId = `pieceGrad-${uid}`;
  const clipId = `faceClip-${uid}`;

  return (
    <g>
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={light} />
          <stop offset="100%" stopColor={dark} />
        </linearGradient>
        <clipPath id={clipId}>
          <circle cx={x} cy={y - 22} r={7.5} />
        </clipPath>
      </defs>
      {/* ground shadow */}
      <ellipse cx={x} cy={y + 15} rx={15} ry={3.5} fill="rgba(70,60,90,0.28)" />
      {/* two-tier base */}
      <ellipse cx={x} cy={y + 11} rx={14} ry={4.5} fill={dark} />
      <ellipse cx={x} cy={y + 8} rx={11} ry={3.5} fill={`url(#${gradId})`} />
      {/* tapered body */}
      <path
        d={`M ${x - 10},${y + 9} C ${x - 10},${y} ${x - 6},${y - 8} ${x - 4},${y - 8} L ${x + 4},${y - 8} C ${x + 6},${y - 8} ${x + 10},${y} ${x + 10},${y + 9} Z`}
        fill={`url(#${gradId})`}
      />
      {/* neck */}
      <ellipse cx={x} cy={y - 8} rx={4.5} ry={2} fill={dark} />
      {/* head */}
      <circle cx={x} cy={y - 22} r={9} fill={`url(#${gradId})`} stroke="#ffffff" strokeWidth={1.5} />
      {faceHref && (
        <image
          href={faceHref}
          x={x - 7.5}
          y={y - 29.5}
          width={15}
          height={15}
          preserveAspectRatio="xMidYMid slice"
          clipPath={`url(#${clipId})`}
        />
      )}
    </g>
  );
}

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
            if (owned) {
              const ownerIdx = typeof prop.owner === "number"
                ? prop.owner
                : players.findIndex((_, i) => i === prop.owner);
              const safeIdx = Math.max(0, Math.min(ownerIdx, PLAYER_COLORS.length - 1));
              topColor = PLAYER_COLORS[safeIdx]?.bg ?? DEFAULT_TOP_COLOR;
            }

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
                  </div>
                </foreignObject>
              </g>
            );
          })}

          {/* Player pieces rendered as a final pass (pure SVG, always on top, immune to foreignObject clipping) */}
          {PAINT_ORDER.map((pathIdx) => {
            const { x, y } = isoPositionForPathIndex(pathIdx);
            const tokens = tokensByPath[pathIdx] || [];
            return tokens.map((playerIdx, stackIdx) => {
              const offsetX = (stackIdx % 2) * 22 - 11;
              const offsetY = Math.floor(stackIdx / 2) * 14 - 7;
              const safeColorIdx = Math.max(0, Math.min(playerIdx, PLAYER_COLORS.length - 1));
              const color = PLAYER_COLORS[safeColorIdx]?.bg ?? "#b9b2e8";
              const emoji = players[playerIdx]?.emoji ?? "🐑";
              return (
                <TokenPiece
                  key={`${pathIdx}-${playerIdx}`}
                  x={x + offsetX}
                  y={y + offsetY}
                  color={color}
                  emoji={emoji}
                />
              );
            });
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
