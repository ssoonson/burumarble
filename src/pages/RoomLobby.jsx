import CharacterAvatar from "../components/CharacterAvatar.jsx";
import { EMOJIS } from "../constants.js";

export default function RoomLobby({ room, players, me, selectedEmoji, onPickEmoji, onStart, isTeacher }) {
  const takenEmojis = new Set(
    players.filter((p) => p.uid !== me?.uid).map((p) => p.emoji)
  );

  return (
    <div className="step-screen">
      <div className="modal-card">
        <h2>{room?.name || "게임 방"} 대기 중</h2>
        <p className="guide-text">
          같은 링크로 들어온 친구들이 모두 모이면 시작해요. ({players.length}명 접속)
        </p>

        <div className="setup-block">
          <label>내 캐릭터 고르기</label>
          <div className="emoji-options" style={{ justifyContent: "center" }}>
            {EMOJIS.map((emoji) => {
              const isTaken = takenEmojis.has(emoji);
              const isMine = selectedEmoji === emoji;
              return (
                <button
                  key={emoji}
                  className={`emoji-btn${isMine ? " selected" : ""}`}
                  disabled={isTaken}
                  onClick={() => onPickEmoji(emoji)}
                >
                  <CharacterAvatar emoji={emoji} className="emoji-btn-avatar" />
                </button>
              );
            })}
          </div>
        </div>

        <div className="setup-block">
          <label>접속한 친구들</label>
          {players.map((p) => (
            <div key={p.uid} className="lobby-player">
              <CharacterAvatar emoji={p.emoji} className="balance-emoji" />
              <span>{p.displayName}</span>
              {p.uid === me?.uid && <span className="badge">나</span>}
            </div>
          ))}
        </div>

        {players.length >= 2 ? (
          <button className="btn btn-primary" onClick={onStart}>게임 시작! 🚀</button>
        ) : (
          <p className="guide-text">최소 2명이 모여야 시작할 수 있어요.</p>
        )}
      </div>
    </div>
  );
}
