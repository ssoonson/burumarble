import { BUILDING_LABELS } from "./constants.js";

export function formatMoney(n) {
  if (n < 0) return `-${formatMoney(-n)}`;
  return n.toLocaleString("ko-KR") + "원";
}

export function formatMoneyShort(n) {
  if (n >= 10000) {
    const man = n / 10000;
    return (Number.isInteger(man) ? man : man.toFixed(1)) + "만";
  }
  return n.toLocaleString("ko-KR") + "원";
}

export function getBuildingEmoji(level) {
  if (level <= 0) return "";
  if (level <= 3) return "🏡".repeat(level);
  if (level <= 6) return "🏢".repeat(level - 3);
  return "🏰";
}

export function buildingIcons(level) {
  if (level <= 0) return [];
  if (level <= 3) return Array.from({ length: level }, () => "🏡");
  if (level <= 6) return Array.from({ length: level - 3 }, () => "🏢");
  return ["🏰"];
}

export function buildingLabel(level) {
  return BUILDING_LABELS[level] || "";
}

export function normalizeAnswer(text) {
  return String(text).trim().toLowerCase().replace(/\s+/g, "");
}

export function parseQuizRows(rows) {
  const quizzes = [];
  rows.forEach((row, idx) => {
    const question = String(row[0] ?? "").trim();
    const answer = String(row[1] ?? "").trim();
    if (!question || !answer) return;
    if (idx === 0 && /질문|문제|question/i.test(question)) return;
    quizzes.push({ question, answer });
  });
  return quizzes;
}

export function parseCsvText(text) {
  return text.split(/\r?\n/).map((line) => {
    const cols = line.split(",");
    return [cols[0], cols.slice(1).join(",")];
  });
}

export function encodeQuizData(quizzes) {
  const json = JSON.stringify(quizzes);
  return btoa(unescape(encodeURIComponent(json)));
}

export function decodeQuizData(str) {
  const json = decodeURIComponent(escape(atob(str)));
  return JSON.parse(json);
}

export function buildShareableUrl(baseUrlStr, quizzes) {
  const u = new URL(baseUrlStr);
  if (quizzes.length > 0) {
    u.searchParams.set("q", encodeQuizData(quizzes));
  } else {
    u.searchParams.delete("q");
  }
  return u.toString();
}
