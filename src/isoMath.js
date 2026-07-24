import { GRID_SIZE, PATH_GRID_INDICES } from "./constants.js";

export const TILE_W = 150;
export const TILE_H = 86;
export const EXTRUDE_DEPTH = 32;

export function gridIndexToRowCol(gridIndex) {
  return { row: Math.floor(gridIndex / GRID_SIZE), col: gridIndex % GRID_SIZE };
}

export function toIso(row, col) {
  const x = (col - row) * (TILE_W / 2);
  const y = (col + row) * (TILE_H / 2);
  return { x, y };
}

export function isoPositionForPathIndex(pathIdx) {
  const gridIndex = PATH_GRID_INDICES[pathIdx];
  const { row, col } = gridIndexToRowCol(gridIndex);
  return toIso(row, col);
}

export function computeBoardBounds() {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let pathIdx = 0; pathIdx < PATH_GRID_INDICES.length; pathIdx++) {
    const { x, y } = isoPositionForPathIndex(pathIdx);
    minX = Math.min(minX, x - TILE_W / 2);
    maxX = Math.max(maxX, x + TILE_W / 2);
    minY = Math.min(minY, y - TILE_H / 2);
    maxY = Math.max(maxY, y + TILE_H / 2 + EXTRUDE_DEPTH);
  }
  return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY };
}

export function diamondPoints(x, y, halfW = TILE_W / 2, halfH = TILE_H / 2) {
  return [
    [x, y - halfH],
    [x + halfW, y],
    [x, y + halfH],
    [x - halfW, y],
  ];
}

export function pointsToString(points) {
  return points.map(([px, py]) => `${px},${py}`).join(" ");
}

// Builds an SVG path with rounded corners for a convex polygon — gives tiles
// a soft, puffy clay-like edge instead of sharp geometric corners.
export function roundedPolygonPath(points, radius) {
  const n = points.length;
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
  const norm = (v) => {
    const len = Math.hypot(v[0], v[1]);
    return len === 0 ? [0, 0] : [v[0] / len, v[1] / len];
  };
  const scale = (v, s) => [v[0] * s, v[1] * s];

  let d = "";
  for (let i = 0; i < n; i++) {
    const prev = points[(i - 1 + n) % n];
    const curr = points[i];
    const next = points[(i + 1) % n];

    const edgeLenPrev = Math.hypot(...sub(prev, curr));
    const edgeLenNext = Math.hypot(...sub(next, curr));
    const r = Math.min(radius, edgeLenPrev / 2, edgeLenNext / 2);

    const toPrev = norm(sub(prev, curr));
    const toNext = norm(sub(next, curr));
    const p1 = add(curr, scale(toPrev, r));
    const p2 = add(curr, scale(toNext, r));

    d += i === 0 ? `M ${p1[0]},${p1[1]} ` : `L ${p1[0]},${p1[1]} `;
    d += `Q ${curr[0]},${curr[1]} ${p2[0]},${p2[1]} `;
  }
  d += "Z";
  return d;
}

export function shadeColor(hex, percent) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const adjust = (c) => Math.max(0, Math.min(255, Math.round(c + (percent / 100) * 255)));
  return `rgb(${adjust(r)}, ${adjust(g)}, ${adjust(b)})`;
}

export function computeCenterDiamond() {
  const inner = [1, 5];
  const corners = [
    toIso(inner[0], inner[0]),
    toIso(inner[0], inner[1]),
    toIso(inner[1], inner[1]),
    toIso(inner[1], inner[0]),
  ];
  return corners.map(({ x, y }) => [x, y]);
}
