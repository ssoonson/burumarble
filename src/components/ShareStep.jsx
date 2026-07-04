import { useState } from "react";
import QRCode from "qrcode";
import { buildShareableUrl } from "../utils.js";

export default function ShareStep({ customQuizzes, onBack, onNext }) {
  const [linkValue, setLinkValue] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [message, setMessage] = useState("👆 링크를 붙여넣고 QR코드 만들기를 눌러주세요");
  const [messageType, setMessageType] = useState("info");

  async function handleGenerate() {
    const raw = linkValue.trim();
    setQrDataUrl(null);
    if (!raw) {
      setMessage("👆 링크를 붙여넣고 QR코드 만들기를 눌러주세요");
      setMessageType("info");
      return;
    }
    if (!/^https?:\/\//i.test(raw)) {
      setMessage("⚠️ http:// 또는 https://로 시작하는 링크를 입력해주세요.");
      setMessageType("error");
      return;
    }
    let finalUrl;
    try {
      finalUrl = buildShareableUrl(raw, customQuizzes);
    } catch (err) {
      setMessage("⚠️ 링크 형식이 올바르지 않아요. 다시 확인해주세요.");
      setMessageType("error");
      return;
    }
    if (finalUrl.length > 1800) {
      setMessage("⚠️ 문제 수가 너무 많아서 QR코드로 담기 어려워요. 문제 개수를 줄여주세요.");
      setMessageType("error");
      return;
    }
    setLinkValue(finalUrl);
    try {
      const dataUrl = await QRCode.toDataURL(finalUrl, { width: 180, margin: 1 });
      setQrDataUrl(dataUrl);
    } catch (err) {
      setMessage("QR 코드를 만들지 못했어요. 링크를 다시 확인해주세요.");
      setMessageType("error");
    }
  }

  async function handleCopy() {
    if (!linkValue.trim()) return;
    try {
      await navigator.clipboard.writeText(linkValue);
    } catch (err) {
      // clipboard API unavailable; ignore silently, user can still select+copy manually
    }
  }

  return (
    <div className="step-screen">
      <div className="modal-card">
        <h2>2️⃣ 학생용 링크 공유 🔗</h2>
        <p className="guide-text">
          배포한 사이트 주소(예: Vercel 링크)를 아래에 붙여넣고 <strong>"QR코드 만들기"</strong>를 누르면
          방금 등록한 문제가 링크에 자동으로 담겨요.
        </p>
        <input
          type="text"
          className="share-input"
          placeholder="여기에 배포된 사이트 주소를 붙여넣으세요 (https://...)"
          value={linkValue}
          onChange={(e) => setLinkValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleGenerate(); }}
        />
        <div className="step-nav" style={{ marginTop: 0, marginBottom: 8 }}>
          <button className="btn btn-primary" onClick={handleGenerate}>QR코드 만들기 ✨</button>
          <button className="btn btn-secondary" onClick={handleCopy}>복사 📋</button>
        </div>
        <div className="qr-box">
          {qrDataUrl ? <img src={qrDataUrl} alt="공유 QR 코드" /> : message}
        </div>
        <div className="step-nav">
          <button className="btn btn-secondary" onClick={onBack}>◀ 이전</button>
          <button className="btn btn-primary" onClick={onNext}>다음 ▶</button>
        </div>
      </div>
    </div>
  );
}
