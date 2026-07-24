const PIP_LAYOUTS = {
  1: [[2, 2]],
  2: [[1, 1], [3, 3]],
  3: [[1, 1], [2, 2], [3, 3]],
  4: [[1, 1], [1, 3], [3, 1], [3, 3]],
  5: [[1, 1], [1, 3], [2, 2], [3, 1], [3, 3]],
  6: [[1, 1], [1, 3], [2, 1], [2, 3], [3, 1], [3, 3]],
};

export default function DiceFace({ value }) {
  const pips = PIP_LAYOUTS[value] || [];
  return (
    <div className="dice-face">
      {pips.map(([row, col], i) => (
        <span key={i} className="dice-pip" style={{ gridRow: row, gridColumn: col }} />
      ))}
    </div>
  );
}
