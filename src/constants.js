export const GRID_SIZE = 7;
export const TOTAL_PATH = 24;
export const START_CELL = 0;
export const START_MONEY = 2000000;
export const SALARY = 200000;
export const MAX_BUILDING_LEVEL = 7;

export const EMOJIS = ["🐶", "🐱", "🦊", "🐰", "🐻", "🐼"];

export const PLAYER_COLORS = [
  { bg: "#ffb3c6", dark: "#ff7eb3" },
  { bg: "#a8d4ff", dark: "#5a9fd4" },
  { bg: "#b3f0b3", dark: "#5cb85c" },
  { bg: "#ffd9a8", dark: "#e8a040" },
  { bg: "#d9b3ff", dark: "#9b59b6" },
  { bg: "#b3fff0", dark: "#2fa88f" },
];

export const CELL_NAMES = [
  "서울", "도쿄", "베이징", "방콕", "하노이", "뉴델리",
  "무인도", "파리", "베를린", "로마", "마드리드", "모스크바",
  "우주여행", "오타와", "멕시코시티", "브라질리아", "부에노스아이레스", "캔버라",
  "황금열쇠", "나이로비", "프리토리아", "아테네", "암스테르담", "헬싱키",
];

export const ISLAND_INDEX = 6;
export const SPACE_INDEX = 12;
export const GOLDENKEY_INDEX = 18;
export const SPECIAL_INDICES = new Set([ISLAND_INDEX, SPACE_INDEX, GOLDENKEY_INDEX]);

export const SPECIAL_CELL_ICONS = {
  [ISLAND_INDEX]: "🏝️",
  [SPACE_INDEX]: "🚀",
  [GOLDENKEY_INDEX]: "🔑",
};

export const GOLDEN_KEY_CARDS = [
  { id: "fine", text: "세금 조사에 걸렸어요! 벌금 100,000원을 내세요.", effect: { type: "fine", amount: 100000 } },
  { id: "bonus", text: "깜짝 보너스! 150,000원을 받으세요.", effect: { type: "bonus", amount: 150000 } },
  { id: "toIsland", text: "길을 잘못 들었어요! 무인도로 직행하세요.", effect: { type: "gotoIsland" } },
  { id: "toSpace", text: "우주선에 탑승했어요! 우주여행 칸으로 직행하세요.", effect: { type: "gotoSpace" } },
  { id: "forward", text: "순간 이동! 3칸 앞으로 전진하세요.", effect: { type: "moveForward", steps: 3 } },
  { id: "forfeit", text: "벌칙 타임! 친구들 앞에서 3초 동안 사자처럼 포효하세요! 🦁", effect: { type: "forfeit" } },
];

export const LAND_PRICES = CELL_NAMES.map((_, i) =>
  i === 0 || SPECIAL_INDICES.has(i) ? 0 : 60000 + Math.floor(i * 8000)
);

export const UPGRADE_COSTS = [0, 50000, 70000, 100000, 150000, 220000, 320000, 500000];
export const TOLLS = [15000, 35000, 55000, 80000, 120000, 170000, 240000, 400000];

export const BUILDING_LABELS = [
  "", "주택 1개", "주택 2개", "주택 3개",
  "빌딩 1개", "빌딩 2개", "빌딩 3개", "랜드마크",
];

export const DEFAULT_QUIZZES = [
  { question: "대한민국의 수도는 어디일까요?", answer: "서울" },
  { question: "1년은 몇 개월일까요?", answer: "12" },
  { question: "태양계에서 가장 큰 행성은 무엇일까요?", answer: "목성" },
];

// Boustrophedon path around the 7x7 grid (index 0 = top-left, going clockwise)
export const PATH_GRID_INDICES = [
  0, 1, 2, 3, 4, 5, 6,
  13, 20, 27, 34, 41,
  48, 47, 46, 45, 44, 43, 42,
  35, 28, 21, 14, 7,
];

export const CENTER_INDICES = new Set();
for (let r = 1; r <= 5; r++) {
  for (let c = 1; c <= 5; c++) {
    CENTER_INDICES.add(r * GRID_SIZE + c);
  }
}

export const PATH_INDEX_BY_GRID = {};
PATH_GRID_INDICES.forEach((gi, pi) => {
  PATH_INDEX_BY_GRID[gi] = pi;
});
