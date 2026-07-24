import { useEffect, useState, useCallback, useRef } from "react";
import {
  collection,
  query,
  where,
  limit,
  getDocs,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./config.js";
import { START_MONEY, TOTAL_PATH } from "../constants.js";

/** URL 의 ?room= 파라미터를 읽어옵니다. */
export function getRoomCodeFromUrl() {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  return params.get("room");
}

/** room code(예: "room_1") 로 실제 방 문서를 찾습니다. */
async function findRoomByCode(code) {
  const q = query(collection(db, "rooms"), where("code", "==", code), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}

/**
 * URL 파라미터를 읽어 학생을 해당 방에 입장시키고,
 * 방 상태 + 플레이어 목록을 실시간 구독하는 훅.
 *
 * 반환:
 *   roomId      실제 Firestore 문서 ID
 *   room        방 문서 (게임 상태 포함, 실시간 갱신)
 *   players     방에 있는 플레이어 배열 (실시간 갱신)
 *   quizzes     이 방에 배정된 문제 목록
 *   status      "idle" | "joining" | "ready" | "not-found" | "error"
 */
export function useRoom(user, selectedEmoji) {
  const [roomId, setRoomId] = useState(null);
  const [room, setRoom] = useState(null);
  const [players, setPlayers] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);
  const joinedRef = useRef(false);

  const roomCode = getRoomCodeFromUrl();

  // ── 1) URL 파라미터 → 방 찾기 → 본인을 players 서브컬렉션에 등록 ──
  useEffect(() => {
    if (!user || !roomCode) {
      setStatus("idle");
      return;
    }
    if (joinedRef.current) return;

    let cancelled = false;
    (async () => {
      setStatus("joining");
      try {
        const found = await findRoomByCode(roomCode);
        if (cancelled) return;

        if (!found) {
          setStatus("not-found");
          return;
        }

        setRoomId(found.id);

        // 본인을 플레이어로 등록 (이미 있으면 merge 로 덮어쓰지 않음)
        const playerRef = doc(db, "rooms", found.id, "players", user.uid);
        await setDoc(
          playerRef,
          {
            uid: user.uid,
            displayName: user.displayName || user.email,
            email: user.email,
            emoji: selectedEmoji || "🐑",
            position: 0,
            money: START_MONEY,
            bankrupt: false,
            skipTurns: 0,
            joinedAt: serverTimestamp(),
          },
          { merge: true }
        );

        joinedRef.current = true;
        if (!cancelled) setStatus("ready");
      } catch (e) {
        if (!cancelled) {
          setError(e.message);
          setStatus("error");
        }
      }
    })();

    return () => { cancelled = true; };
  }, [user, roomCode, selectedEmoji]);

  // ── 2) 방 문서 실시간 구독 (턴, 주사위, 땅 소유 등) ──
  useEffect(() => {
    if (!roomId) return;
    const unsub = onSnapshot(
      doc(db, "rooms", roomId),
      (snap) => {
        if (snap.exists()) setRoom({ id: snap.id, ...snap.data() });
      },
      (e) => { setError(e.message); setStatus("error"); }
    );
    return unsub;
  }, [roomId]);

  // ── 3) 플레이어 목록 실시간 구독 (위치, 잔액 등) ──
  useEffect(() => {
    if (!roomId) return;
    const unsub = onSnapshot(
      collection(db, "rooms", roomId, "players"),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        // joinedAt 순으로 정렬해 턴 순서를 안정적으로 유지
        list.sort((a, b) => {
          const ta = a.joinedAt?.seconds ?? 0;
          const tb = b.joinedAt?.seconds ?? 0;
          return ta - tb;
        });
        setPlayers(list);
      },
      (e) => setError(e.message)
    );
    return unsub;
  }, [roomId]);

  // ── 4) 방에 배정된 문제 세트 로드 ──
  useEffect(() => {
    if (!room?.quizSetId) return;
    let cancelled = false;
    (async () => {
      try {
        const { getDoc } = await import("firebase/firestore");
        const snap = await getDoc(doc(db, "quizSets", room.quizSetId));
        if (!cancelled && snap.exists()) {
          setQuizzes(snap.data().quizzes || []);
        }
      } catch {
        /* 문제 로드 실패 시 기본 문제로 진행 */
      }
    })();
    return () => { cancelled = true; };
  }, [room?.quizSetId]);

  /** 방의 게임 상태를 갱신합니다 (턴 넘김, 주사위 결과 등). */
  const updateRoomState = useCallback(
    async (patch) => {
      if (!roomId) return;
      await updateDoc(doc(db, "rooms", roomId), {
        ...patch,
        lastActionAt: serverTimestamp(),
      });
    },
    [roomId]
  );

  /** 본인 플레이어 문서를 갱신합니다 (위치 이동 등). money 는 규칙상 변경 불가. */
  const updateMyPlayer = useCallback(
    async (patch) => {
      if (!roomId || !user) return;
      await updateDoc(doc(db, "rooms", roomId, "players", user.uid), patch);
    },
    [roomId, user]
  );

  return {
    roomCode,
    roomId,
    room,
    players,
    quizzes,
    status,
    error,
    updateRoomState,
    updateMyPlayer,
  };
}

/** 새 방을 만들 때 사용할 초기 게임 상태 */
export function createInitialRoomState({ name, code, classSessionId, quizSetId, createdBy }) {
  return {
    name,
    code,
    classSessionId,
    quizSetId,
    createdBy,
    createdAt: serverTimestamp(),
    status: "waiting",
    currentPlayerUid: null,
    turnPhase: "idle",
    turnMessage: "",
    diceValues: null,
    pendingLanding: null,
    properties: Array.from({ length: TOTAL_PATH }, () => ({ owner: null, buildingLevel: 0 })),
    playerOrder: [],
    winnerUid: null,
    lastActionAt: serverTimestamp(),
  };
}
