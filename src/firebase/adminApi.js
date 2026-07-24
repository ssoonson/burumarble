import {
  collection,
  doc,
  addDoc,
  getDocs,
  getDoc,
  writeBatch,
  runTransaction,
  serverTimestamp,
  query,
  where,
} from "firebase/firestore";
import { db } from "./config.js";
import { createInitialRoomState } from "./useRoom.js";

// ============================================================================
// 요청사항 3 — 교사가 학생의 게임머니를 임의로 수정하는 핵심 함수
// ============================================================================

/**
 * 학생의 게임머니를 증감시킵니다. (+10만 / -5만 버튼용)
 *
 * 트랜잭션을 쓰는 이유: 학생이 통행료를 내는 순간 교사가 동시에 금액을 조정하면
 * "읽고 → 계산 → 쓰기" 사이에 값이 바뀌어 한쪽 변경이 사라질 수 있습니다.
 * 트랜잭션은 충돌 시 자동으로 다시 읽어 계산하므로 두 변경이 모두 반영됩니다.
 *
 * @param {string} roomId
 * @param {string} playerUid
 * @param {number} delta      증감액 (음수 가능)
 * @param {string} byUid      조정한 교사 uid (로그용)
 * @returns {Promise<number>} 조정 후 잔액
 */
export async function adjustPlayerMoney(roomId, playerUid, delta, byUid) {
  if (!Number.isFinite(delta)) throw new Error("증감액이 올바르지 않습니다.");

  const playerRef = doc(db, "rooms", roomId, "players", playerUid);

  const newMoney = await runTransaction(db, async (tx) => {
    const snap = await tx.get(playerRef);
    if (!snap.exists()) throw new Error("해당 학생을 찾을 수 없습니다.");

    const current = snap.data().money ?? 0;
    const next = Math.max(0, current + delta); // 음수 잔액 방지

    tx.update(playerRef, {
      money: next,
      // 잔액이 생기면 파산 상태 해제 (교사가 되살려주는 경우)
      bankrupt: next <= 0 ? snap.data().bankrupt : false,
    });
    return next;
  });

  // 감사 로그 (누가 언제 얼마를 조정했는지)
  await addDoc(collection(db, "rooms", roomId, "events"), {
    type: "adminAdjust",
    byUid,
    payload: { playerUid, delta, resultMoney: newMoney },
    createdAt: serverTimestamp(),
  });

  return newMoney;
}

/**
 * 학생의 게임머니를 특정 금액으로 직접 설정합니다. (직접 입력용)
 *
 * @param {string} roomId
 * @param {string} playerUid
 * @param {number} amount     설정할 금액
 * @param {string} byUid      조정한 교사 uid
 * @returns {Promise<number>} 설정된 잔액
 */
export async function setPlayerMoney(roomId, playerUid, amount, byUid) {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("금액은 0 이상의 숫자여야 합니다.");
  }

  const playerRef = doc(db, "rooms", roomId, "players", playerUid);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(playerRef);
    if (!snap.exists()) throw new Error("해당 학생을 찾을 수 없습니다.");
    tx.update(playerRef, {
      money: amount,
      bankrupt: amount <= 0,
    });
  });

  await addDoc(collection(db, "rooms", roomId, "events"), {
    type: "adminSet",
    byUid,
    payload: { playerUid, amount },
    createdAt: serverTimestamp(),
  });

  return amount;
}

/** 방 안 모든 학생의 잔액을 한 번에 설정합니다. (일괄 초기화용) */
export async function setAllPlayersMoney(roomId, amount, byUid) {
  const playersSnap = await getDocs(collection(db, "rooms", roomId, "players"));
  const batch = writeBatch(db);
  playersSnap.docs.forEach((d) => {
    batch.update(d.ref, { money: amount, bankrupt: amount <= 0 });
  });
  await batch.commit();

  await addDoc(collection(db, "rooms", roomId, "events"), {
    type: "adminSetAll",
    byUid,
    payload: { amount, count: playersSnap.size },
    createdAt: serverTimestamp(),
  });

  return playersSnap.size;
}

// ============================================================================
// 문제 세트 업로드
// ============================================================================

/**
 * 문제 목록을 Firestore 에 저장합니다.
 * @param {Array<{question:string, answer:string}>} quizzes
 */
export async function uploadQuizSet(title, quizzes, createdBy) {
  if (!Array.isArray(quizzes) || quizzes.length === 0) {
    throw new Error("문제가 비어 있습니다.");
  }
  const ref = await addDoc(collection(db, "quizSets"), {
    title: title || `문제 세트 ${new Date().toLocaleString("ko-KR")}`,
    quizzes,
    createdBy,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

/** JSON 텍스트를 문제 배열로 파싱합니다. */
export function parseQuizJson(text) {
  const data = JSON.parse(text);
  const arr = Array.isArray(data) ? data : data.quizzes;
  if (!Array.isArray(arr)) throw new Error("JSON 형식이 올바르지 않습니다.");
  return arr
    .map((row) => ({
      question: String(row.question ?? row.q ?? "").trim(),
      answer: String(row.answer ?? row.a ?? "").trim(),
    }))
    .filter((r) => r.question && r.answer);
}

/** "질문,정답" 또는 "질문\t정답" 형태의 일반 텍스트를 파싱합니다. */
export function parsePlainText(text) {
  return text
    .split(/\r?\n/)
    .map((line) => {
      const parts = line.includes("\t") ? line.split("\t") : line.split(",");
      return {
        question: String(parts[0] ?? "").trim(),
        answer: String(parts.slice(1).join(",") ?? "").trim(),
      };
    })
    .filter((r, i) => {
      if (!r.question || !r.answer) return false;
      if (i === 0 && /질문|문제|question/i.test(r.question)) return false;
      return true;
    });
}

// ============================================================================
// 모둠 방 일괄 생성
// ============================================================================

/**
 * 4~6개의 독립된 게임 방을 한 번에 생성합니다.
 * @param {number} count       생성할 방 개수 (4~6)
 * @param {string} quizSetId   방들이 사용할 문제 세트
 * @param {string} createdBy   교사 uid
 * @returns {Promise<Array<{id, code, name, url}>>}
 */
export async function createRooms(count, quizSetId, createdBy, baseUrl) {
  if (count < 2 || count > 10) throw new Error("방 개수는 2~10개 사이여야 합니다.");

  const classSessionId = `session_${Date.now()}`;
  const batch = writeBatch(db);
  const created = [];

  for (let i = 1; i <= count; i++) {
    const code = `${classSessionId}_room_${i}`;
    const roomRef = doc(collection(db, "rooms"));
    batch.set(
      roomRef,
      createInitialRoomState({
        name: `${i}모둠`,
        code,
        classSessionId,
        quizSetId,
        createdBy,
      })
    );
    created.push({
      id: roomRef.id,
      code,
      name: `${i}모둠`,
      url: `${baseUrl}?room=${encodeURIComponent(code)}`,
    });
  }

  await batch.commit();
  return { classSessionId, rooms: created };
}

/** 특정 수업 세션의 방 목록을 불러옵니다. */
export async function listRoomsBySession(classSessionId) {
  const q = query(
    collection(db, "rooms"),
    where("classSessionId", "==", classSessionId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** 교사가 만든 모든 방을 최신순으로 불러옵니다. */
export async function listMyRooms(createdBy) {
  const q = query(
    collection(db, "rooms"),
    where("createdBy", "==", createdBy)
  );
  const snap = await getDocs(q);
  const rooms = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  // 클라이언트에서 정렬 (복합 인덱스 불필요)
  rooms.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
  return rooms;
}

/** 교사가 만든 문제 세트 목록 */
export async function listMyQuizSets(createdBy) {
  const q = query(
    collection(db, "quizSets"),
    where("createdBy", "==", createdBy)
  );
  const snap = await getDocs(q);
  const sets = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  // 클라이언트에서 정렬 (복합 인덱스 불필요)
  sets.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
  return sets;
}
