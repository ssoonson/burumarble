import { useEffect, useState, useCallback } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/config.js";
import {
  adjustPlayerMoney,
  setPlayerMoney,
  setAllPlayersMoney,
  uploadQuizSet,
  parseQuizJson,
  parsePlainText,
  createRooms,
  listMyQuizSets,
  listMyRooms,
} from "../firebase/adminApi.js";
import { parseQuizRows, parseCsvText, formatMoney } from "../utils.js";
import { START_MONEY } from "../constants.js";

const QUICK_AMOUNTS = [100000, 50000, -50000, -100000];

/** 방 하나의 학생 목록 + 잔액 조정 UI */
function RoomPlayerPanel({ room, teacherUid }) {
  const [players, setPlayers] = useState([]);
  const [busyUid, setBusyUid] = useState(null);
  const [inputs, setInputs] = useState({});
  const [msg, setMsg] = useState(null);

  // 학생 목록 실시간 구독
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "rooms", room.id, "players"), (snap) => {
      setPlayers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [room.id]);

  const handleAdjust = useCallback(async (uid, delta) => {
    setBusyUid(uid);
    setMsg(null);
    try {
      await adjustPlayerMoney(room.id, uid, delta, teacherUid);
    } catch (e) {
      setMsg(e.message);
    } finally {
      setBusyUid(null);
    }
  }, [room.id, teacherUid]);

  const handleSet = useCallback(async (uid) => {
    const raw = inputs[uid];
    const amount = Number(String(raw).replace(/[^\d]/g, ""));
    if (!Number.isFinite(amount)) {
      setMsg("숫자를 입력해주세요.");
      return;
    }
    setBusyUid(uid);
    setMsg(null);
    try {
      await setPlayerMoney(room.id, uid, amount, teacherUid);
      setInputs((p) => ({ ...p, [uid]: "" }));
    } catch (e) {
      setMsg(e.message);
    } finally {
      setBusyUid(null);
    }
  }, [room.id, teacherUid, inputs]);

  const handleResetAll = useCallback(async () => {
    setMsg(null);
    try {
      const n = await setAllPlayersMoney(room.id, START_MONEY, teacherUid);
      setMsg(`${n}명의 잔액을 초기화했어요.`);
    } catch (e) {
      setMsg(e.message);
    }
  }, [room.id, teacherUid]);

  return (
    <div className="admin-room-card">
      <div className="admin-room-header">
        <h3>{room.name}</h3>
        <span className="badge">{players.length}명 접속</span>
        <button className="btn btn-secondary admin-btn-sm" onClick={handleResetAll}>
          전체 초기화
        </button>
      </div>

      <div className="admin-room-link">
        <input readOnly value={`${window.location.origin}?room=${room.code}`} className="share-input" />
        <button
          className="btn btn-secondary admin-btn-sm"
          onClick={() => navigator.clipboard?.writeText(`${window.location.origin}?room=${room.code}`)}
        >
          복사
        </button>
      </div>

      {players.length === 0 ? (
        <p className="guide-text">아직 접속한 학생이 없어요.</p>
      ) : (
        players.map((p) => (
          <div key={p.id} className="admin-player-row">
            <div className="admin-player-info">
              <strong>{p.displayName}</strong>
              <span className={`admin-money${p.money <= 100000 ? " low" : ""}`}>
                {formatMoney(p.money ?? 0)}
              </span>
              {p.bankrupt && <span className="admin-bankrupt">파산</span>}
            </div>

            <div className="admin-controls">
              {QUICK_AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  className={`admin-chip${amt > 0 ? " plus" : " minus"}`}
                  disabled={busyUid === p.id}
                  onClick={() => handleAdjust(p.id, amt)}
                >
                  {amt > 0 ? "+" : "−"}{Math.abs(amt / 10000)}만
                </button>
              ))}
              <input
                className="admin-amount-input"
                placeholder="직접 입력"
                value={inputs[p.id] ?? ""}
                onChange={(e) => setInputs((prev) => ({ ...prev, [p.id]: e.target.value }))}
                onKeyDown={(e) => { if (e.key === "Enter") handleSet(p.id); }}
              />
              <button
                className="btn btn-primary admin-btn-sm"
                disabled={busyUid === p.id}
                onClick={() => handleSet(p.id)}
              >
                설정
              </button>
            </div>
          </div>
        ))
      )}

      {msg && <p className="error-text">{msg}</p>}
    </div>
  );
}

export default function AdminPage({ user, isTeacher, onSignOut }) {
  const [quizSets, setQuizSets] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [selectedQuizSet, setSelectedQuizSet] = useState("");
  const [roomCount, setRoomCount] = useState(5);
  const [status, setStatus] = useState(null);
  const [pastedText, setPastedText] = useState("");

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const [qs, rs] = await Promise.all([listMyQuizSets(user.uid), listMyRooms(user.uid)]);
      setQuizSets(qs);
      setRooms(rs);
      if (!selectedQuizSet && qs.length > 0) setSelectedQuizSet(qs[0].id);
    } catch (e) {
      setStatus(`목록을 불러오지 못했어요: ${e.message}`);
    }
  }, [user, selectedQuizSet]);

  useEffect(() => { refresh(); }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isTeacher) {
    return (
      <div className="step-screen">
        <div className="modal-card">
          <h2>접근 권한 없음</h2>
          <p className="guide-text">
            이 페이지는 교사 계정만 사용할 수 있어요.
            {user && <><br />현재 로그인: {user.email}</>}
          </p>
          {user && <button className="btn btn-secondary" onClick={onSignOut}>로그아웃</button>}
        </div>
      </div>
    );
  }

  async function handleFileUpload(e) {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    setStatus("업로드 중...");
    try {
      const ext = file.name.split(".").pop().toLowerCase();
      const text = await file.text();
      let quizzes;
      if (ext === "json") quizzes = parseQuizJson(text);
      else quizzes = parseQuizRows(parseCsvText(text));

      if (quizzes.length === 0) throw new Error("문제를 찾을 수 없어요.");
      const id = await uploadQuizSet(file.name, quizzes, user.uid);
      setSelectedQuizSet(id);
      setStatus(`${quizzes.length}개 문제를 등록했어요.`);
      refresh();
    } catch (err) {
      setStatus(`업로드 실패: ${err.message}`);
    }
  }

  async function handleTextUpload() {
    if (!pastedText.trim()) return;
    setStatus("등록 중...");
    try {
      const quizzes = parsePlainText(pastedText);
      if (quizzes.length === 0) throw new Error("문제를 찾을 수 없어요.");
      const id = await uploadQuizSet("직접 입력", quizzes, user.uid);
      setSelectedQuizSet(id);
      setPastedText("");
      setStatus(`${quizzes.length}개 문제를 등록했어요.`);
      refresh();
    } catch (err) {
      setStatus(`등록 실패: ${err.message}`);
    }
  }

  async function handleCreateRooms() {
    if (!selectedQuizSet) {
      setStatus("먼저 문제 세트를 선택해주세요.");
      return;
    }
    setStatus("방 생성 중...");
    try {
      const { rooms: created } = await createRooms(
        roomCount, selectedQuizSet, user.uid, window.location.origin
      );
      setStatus(`${created.length}개 모둠 방을 만들었어요.`);
      refresh();
    } catch (err) {
      setStatus(`방 생성 실패: ${err.message}`);
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-topbar">
        <h1 className="app-title">교사용 관리자</h1>
        <div>
          <span className="guide-text">{user.email}</span>
          <button className="btn btn-secondary admin-btn-sm" onClick={onSignOut}>로그아웃</button>
        </div>
      </div>

      {/* 1) 문제 업로드 */}
      <section className="admin-section">
        <h2>1️⃣ 문제 업로드</h2>
        <div className="upload-row">
          <label className="upload-btn">
            📂 CSV / JSON 파일
            <input type="file" accept=".csv,.json,.txt" onChange={handleFileUpload} />
          </label>
        </div>
        <textarea
          className="admin-textarea"
          placeholder={"직접 붙여넣기 (한 줄에 하나씩)\n예) 대한민국의 수도는?,서울"}
          value={pastedText}
          onChange={(e) => setPastedText(e.target.value)}
        />
        <button className="btn btn-primary" onClick={handleTextUpload}>텍스트로 등록</button>
      </section>

      {/* 2) 모둠 방 생성 */}
      <section className="admin-section">
        <h2>2️⃣ 모둠 방 생성</h2>
        <div className="admin-inline">
          <label>
            문제 세트
            <select
              className="admin-select"
              value={selectedQuizSet}
              onChange={(e) => setSelectedQuizSet(e.target.value)}
            >
              <option value="">선택하세요</option>
              {quizSets.map((qs) => (
                <option key={qs.id} value={qs.id}>
                  {qs.title} ({qs.quizzes?.length ?? 0}문제)
                </option>
              ))}
            </select>
          </label>
          <label>
            방 개수
            <select
              className="admin-select"
              value={roomCount}
              onChange={(e) => setRoomCount(Number(e.target.value))}
            >
              {[2,3,4,5,6,7,8].map((n) => <option key={n} value={n}>{n}개</option>)}
            </select>
          </label>
          <button className="btn btn-primary" onClick={handleCreateRooms}>모둠 방 생성</button>
        </div>
      </section>

      {/* 3) 실시간 게임머니 조정 */}
      <section className="admin-section">
        <h2>3️⃣ 실시간 게임머니 조정</h2>
        {rooms.length === 0 ? (
          <p className="guide-text">아직 만든 방이 없어요.</p>
        ) : (
          rooms.map((room) => (
            <RoomPlayerPanel key={room.id} room={room} teacherUid={user.uid} />
          ))
        )}
      </section>

      {status && <p className="admin-status">{status}</p>}
    </div>
  );
}
