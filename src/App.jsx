import { useEffect, useState, useCallback } from "react";
import { useAuth } from "./firebase/useAuth.js";
import { useRoom, getRoomCodeFromUrl } from "./firebase/useRoom.js";
import AdminPage from "./pages/AdminPage.jsx";
import LoginScreen from "./pages/LoginScreen.jsx";
import RoomLobby from "./pages/RoomLobby.jsx";
import MultiplayerGame from "./pages/MultiplayerGame.jsx";
import AppLocal from "./AppLocal.jsx";
import { EMOJIS } from "./constants.js";

/**
 * 라우팅 규칙
 *   /admin        → 교사용 관리자 페이지 (로그인 필요)
 *   ?room=xxx     → 해당 모둠 방으로 실시간 멀티플레이 입장 (로그인 필요)
 *   그 외          → 기존 오프라인(로컬) 모드 그대로 동작
 */
export default function App() {
  const [path, setPath] = useState(
    typeof window !== "undefined" ? window.location.pathname : "/"
  );
  const roomCode = getRoomCodeFromUrl();

  // 뒤로가기/앞으로가기 대응
  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const isAdminRoute = path.replace(/\/+$/, "") === "/admin";

  // Firebase 설정이 없으면(로컬 개발 등) 오프라인 모드로 우회
  const firebaseConfigured = Boolean(import.meta.env.VITE_FIREBASE_PROJECT_ID);

  if (!firebaseConfigured) {
    if (isAdminRoute || roomCode) {
      return (
        <div className="step-screen">
          <div className="modal-card">
            <h2>Firebase 설정 필요</h2>
            <p className="guide-text">
              실시간 멀티플레이와 관리자 기능을 사용하려면 <code>.env</code> 파일에
              Firebase 설정을 입력해주세요. (<code>.env.example</code> 참고)
            </p>
            <a className="btn btn-secondary" href="/">오프라인 모드로 이동</a>
          </div>
        </div>
      );
    }
    return <AppLocal />;
  }

  if (isAdminRoute) return <AdminRoute />;
  if (roomCode) return <RoomRoute />;
  return <AppLocal />;
}

function AdminRoute() {
  const { user, isTeacher, loading, error, signIn, signOut } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <LoginScreen onSignIn={signIn} error={error} />;
  return <AdminPage user={user} isTeacher={isTeacher} onSignOut={signOut} />;
}

function RoomRoute() {
  const { user, isTeacher, loading, error, signIn, signOut } = useAuth();
  const [selectedEmoji, setSelectedEmoji] = useState(EMOJIS[0]);

  const {
    roomCode, roomId, room, players, quizzes, status,
    error: roomError, updateRoomState, updateMyPlayer,
  } = useRoom(user, selectedEmoji);

  const handlePickEmoji = useCallback(async (emoji) => {
    setSelectedEmoji(emoji);
    await updateMyPlayer({ emoji }).catch(() => {});
  }, [updateMyPlayer]);

  const handleStart = useCallback(async () => {
    const order = players.map((p) => p.uid);
    await updateRoomState({
      status: "playing",
      playerOrder: order,
      currentPlayerUid: order[0] ?? null,
      turnPhase: "idle",
      turnMessage: `${players[0]?.displayName ?? ""} 차례예요!`,
    });
  }, [players, updateRoomState]);

  if (loading) return <Loading />;
  if (!user) return <LoginScreen onSignIn={signIn} error={error} roomCode={roomCode} />;

  if (status === "not-found") {
    return (
      <Message
        title="방을 찾을 수 없어요"
        body={`"${roomCode}" 방이 존재하지 않아요. 선생님께 링크를 다시 확인해주세요.`}
        onSignOut={signOut}
      />
    );
  }
  if (status === "error") {
    return <Message title="문제가 발생했어요" body={roomError} onSignOut={signOut} />;
  }
  if (status !== "ready" || !room) return <Loading />;

  const me = players.find((p) => p.uid === user.uid);

  if (room.status !== "playing") {
    return (
      <RoomLobby
        room={room}
        players={players}
        me={me}
        selectedEmoji={me?.emoji ?? selectedEmoji}
        onPickEmoji={handlePickEmoji}
        onStart={handleStart}
        isTeacher={isTeacher}
      />
    );
  }

  return (
    <MultiplayerGame
      user={user}
      room={room}
      roomId={roomId}
      players={players}
      quizzes={quizzes}
      updateRoomState={updateRoomState}
      updateMyPlayer={updateMyPlayer}
      onSignOut={signOut}
    />
  );
}

function Loading() {
  return (
    <div className="step-screen">
      <div className="modal-card">
        <h2>불러오는 중...</h2>
      </div>
    </div>
  );
}

function Message({ title, body, onSignOut }) {
  return (
    <div className="step-screen">
      <div className="modal-card">
        <h2>{title}</h2>
        <p className="guide-text">{body}</p>
        <button className="btn btn-secondary" onClick={onSignOut}>로그아웃</button>
      </div>
    </div>
  );
}
