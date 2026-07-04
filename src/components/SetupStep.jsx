import { useState } from "react";
import { EMOJIS } from "../constants.js";

export default function SetupStep({ playerCount, setPlayerCount, selectedEmojis, setSelectedEmojis, onBack, onStart }) {
  const [error, setError] = useState("");

  function handleCountChange(count) {
    setPlayerCount(count);
    setError("");
  }

  function handleEmojiPick(playerIdx, emoji) {
    const next = selectedEmojis.slice();
    next[playerIdx] = emoji;
    setSelectedEmojis(next);
    setError("");
  }

  function handleStart() {
    const chosen = selectedEmojis.slice(0, playerCount);
    if (new Set(chosen).size < playerCount) {
      setError("모든 친구가 다른 동물을 골라야 해요!");
      return;
    }
    onStart(chosen);
  }

  const usedEmojis = new Set(selectedEmojis.slice(0, playerCount));

  return (
    <div className="step-screen">
      <div className="modal-card">
        <h2>3️⃣ 게임 준비 🌈</h2>
        <div className="setup-block">
          <label>몇 명이서 할까요? (2~6명)</label>
          <div className="count-row">
            {[2, 3, 4, 5, 6].map((count) => (
              <button
                key={count}
                className={`count-btn${playerCount === count ? " selected" : ""}`}
                onClick={() => handleCountChange(count)}
              >
                {count}
              </button>
            ))}
          </div>
        </div>
        <div className="setup-block">
          <label>동물 친구를 골라주세요!</label>
          <div className="emoji-picker">
            {Array.from({ length: playerCount }, (_, playerIdx) => (
              <div className="player-row" key={playerIdx}>
                <span className="player-label">{playerIdx + 1}번 친구</span>
                <div className="emoji-options">
                  {EMOJIS.map((emoji) => {
                    const isSelected = selectedEmojis[playerIdx] === emoji;
                    const isDisabled = usedEmojis.has(emoji) && !isSelected;
                    return (
                      <button
                        key={emoji}
                        className={`emoji-btn${isSelected ? " selected" : ""}`}
                        disabled={isDisabled}
                        onClick={() => handleEmojiPick(playerIdx, emoji)}
                      >
                        {emoji}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="step-nav">
          <button className="btn btn-secondary" onClick={onBack}>◀ 이전</button>
          <button className="btn btn-primary" onClick={handleStart}>게임 시작! 🚀</button>
        </div>
        <p className="error-text">{error}</p>
      </div>
    </div>
  );
}
