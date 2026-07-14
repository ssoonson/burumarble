import { GRID_SIZE, PATH_GRID_INDICES } from "./constants.js";

// Standard 2:1-ish isometric tile projection.
export const TILE_W = 150;
export const TILE_H = 86;
export const EXTRUDE_DEPTH = 22; // visual "thickness" of each tile block

export function gridIndexToRowCol(gridIndex) {
  return { row: Math.floor(gridIndex / GRID_SIZE), col: gridIndex % GRID_SIZE };
}

export function toIso(row, col) {
  const x = (col - row) * (TILE_W / 2);
  const y = (col + row) * (TILE_H / 2);
  return { x, y };
}

// Returns { x, y } isometric center position for a given path index (0-23).
export function isoPositionForPathIndex(pathIdx) {
  const gridIndex = PATH_GRID_INDICES[pathIdx];
  const { row, col } = gridIndexToRowCol(gridIndex);
  return toIso(row, col);
}

// Computes the bounding box (in iso space) covering all 24 path tiles,
// including each tile's own half-width/half-height and the extrusion depth.
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

// The 4 corner points of the diamond top-face for a tile centered at (x, y).
export function diamondPoints(x, y, halfW = TILE_W / 2, halfH = TILE_H / 2) {
  return [
    [x, y - halfH], // top
    [x + halfW, y], // right
    [x, y + halfH], // bottom
    [x - halfW, y], // left
  ];
}

export function pointsToString(points) {
  return points.map(([px, py]) => `${px},${py}`).join(" ");
}

export function shadeColor(hex, percent) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const adjust = (c) => Math.max(0, Math.min(255, Math.round(c + (percent / 100) * 255)));
  return `rgb(${adjust(r)}, ${adjust(g)}, ${adjust(b)})`;
}

// Center decoration diamond spanning the inner (non-path) area of the board.
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
