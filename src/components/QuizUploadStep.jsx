import { useState } from "react";
import * as XLSX from "xlsx";
import { parseQuizRows, parseCsvText } from "../utils.js";
import { DEFAULT_QUIZZES } from "../constants.js";

export default function QuizUploadStep({ customQuizzes, onUpload, onNext }) {
  const [status, setStatus] = useState(null);

  const registeredCount = customQuizzes.length > 0 ? customQuizzes.length : DEFAULT_QUIZZES.length;
  const badgeLabel = customQuizzes.length > 0
    ? `총 ${registeredCount}개 문제 등록됨`
    : `기본 문제 ${registeredCount}개`;

  async function handleFile(e) {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    try {
      const ext = file.name.split(".").pop().toLowerCase();
      let rows;
      if (ext === "csv") {
        const text = await file.text();
        rows = parseCsvText(text);
      } else {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
      }
      const parsed = parseQuizRows(rows);
      if (parsed.length === 0) {
        setStatus({ type: "error", text: "문제를 찾을 수 없어요. A열(질문), B열(정답)을 확인해주세요!" });
        return;
      }
      onUpload(parsed);
      setStatus({ type: "success", text: `총 ${parsed.length}개의 문제가 등록되었습니다!` });
    } catch (err) {
      setStatus({ type: "error", text: "파일을 읽는 중 오류가 발생했어요. 다시 시도해주세요." });
    }
  }

  return (
    <div className="step-screen">
      <div className="modal-card">
        <h2>1️⃣ 문제 준비하기 📝</h2>
        <div className="setup-block">
          <p className="guide-text">
            📚 A열: 질문, B열: 정답 양식의 엑셀/CSV 파일을 업로드하세요.
            (업로드하지 않으면 기본 문제 3개가 사용돼요)
          </p>
          <div className="upload-row">
            <label className="upload-btn">
              📂 문제 파일 업로드
              <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} />
            </label>
            <span className="badge">{badgeLabel}</span>
          </div>
          {status && (
            <p className={status.type === "error" ? "error-text" : "guide-text"} style={{ marginTop: 10, marginBottom: 0 }}>
              {status.text}
            </p>
          )}
        </div>
        <div className="step-nav">
          <button className="btn btn-primary" onClick={onNext}>다음 ▶</button>
        </div>
      </div>
    </div>
  );
}
