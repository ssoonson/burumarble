import { useEffect, useRef, useState } from "react";
import { normalizeAnswer } from "../utils.js";

export default function QuizModal({ quiz, onResolve }) {
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState(null); // { text, kind: 'correct'|'wrong' }
  const [locked, setLocked] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function submit() {
    if (locked) return;
    const userAnswer = normalizeAnswer(answer);
    if (!userAnswer) {
      setResult({ text: "정답을 입력해주세요!", kind: "wrong" });
      return;
    }
    if (userAnswer === normalizeAnswer(quiz.answer)) {
      setResult({ text: "정답입니다! 🎉", kind: "correct" });
      setLocked(true);
      setTimeout(() => onResolve("correct"), 900);
    } else {
      setResult({ text: `오답입니다! 😢 (정답: ${quiz.answer})`, kind: "wrong" });
      setLocked(true);
      setTimeout(() => onResolve("wrong"), 1400);
    }
  }

  return (
    <div className="overlay">
      <div className="modal-card" style={{ maxWidth: 440 }}>
        <h2>📝 문제를 풀어보세요!</h2>
        <p className="quiz-question">{quiz.question}</p>
        <input
          ref={inputRef}
          type="text"
          className="quiz-input"
          placeholder="정답을 입력하세요"
          autoComplete="off"
          value={answer}
          disabled={locked}
          onChange={(e) => setAnswer(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
        />
        <div className="step-nav" style={{ marginTop: 0 }}>
          <button className="btn btn-primary" disabled={locked} onClick={submit}>정답 제출 ✏️</button>
          <button className="btn btn-secondary" disabled={locked} onClick={() => onResolve("pass")}>그냥 넘어가기</button>
        </div>
        {result && <p className={`quiz-result ${result.kind}`}>{result.text}</p>}
      </div>
    </div>
  );
}
