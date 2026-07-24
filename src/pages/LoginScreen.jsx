import { ALLOWED_DOMAIN } from "../firebase/config.js";

export default function LoginScreen({ onSignIn, error, roomCode }) {
  return (
    <div className="step-screen">
      <div className="modal-card">
        <h2>🎲 부루마블 로그인</h2>
        <p className="guide-text">
          <strong>{ALLOWED_DOMAIN}</strong> 학교 계정으로 로그인해주세요.
        </p>
        {roomCode && (
          <p className="guide-text">
            입장할 방: <strong>{roomCode}</strong>
          </p>
        )}
        <button className="btn btn-primary" onClick={onSignIn}>
          Google 계정으로 로그인
        </button>
        {error && <p className="error-text">{error}</p>}
      </div>
    </div>
  );
}
