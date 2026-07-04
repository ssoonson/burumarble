# 🎲 부루마블 게임 (React 버전)

React + Vite로 만든 교실용 부루마블 게임입니다. 문제 업로드 → 학생용 링크 공유 → 인원수/캐릭터 선택 → 게임 순서로 진행돼요.

## 로컬에서 실행해보기

```bash
npm install
npm run dev
```

터미널에 뜨는 주소(보통 `http://localhost:5173`)를 브라우저에서 열면 바로 확인할 수 있어요.

## 빌드

```bash
npm run build
```

`dist/` 폴더에 정적 파일이 생성돼요. `npm run preview`로 빌드 결과를 미리 볼 수 있어요.

## GitHub + Vercel로 배포하기

1. 이 폴더 전체를 GitHub 저장소에 push하세요 (package.json, src/, index.html 포함 전부).
2. vercel.com → "Add New..." → "Project" → 이 저장소 선택 → Import.
3. Vercel이 Vite 프로젝트를 자동으로 인식해서 별도 설정 없이 빌드/배포합니다.
4. 배포 완료 후 받은 주소를 게임의 "2단계: 학생용 링크 공유" 화면에 붙여넣고 QR코드를 생성하면, 문제 데이터가 링크에 자동으로 담겨서 공유돼요.

## 폴더 구조

```
src/
  constants.js       게임 데이터(칸 이름, 가격, 색상 등) — 순수 데이터
  utils.js           포맷팅/퀴즈 파싱/링크 인코딩 — 순수 함수
  gameEngine.js       게임 규칙(구매/업그레이드/통행료/파산/승리) — 순수 reducer
  App.jsx             단계 전환 + 전체 상태 관리
  components/
    QuizUploadStep.jsx   1단계: 문제 업로드
    ShareStep.jsx        2단계: 링크 공유 + QR코드
    SetupStep.jsx        3단계: 인원수/캐릭터 선택
    GameScreen.jsx        4단계: 실제 게임 화면 (보드+주사위+모달 조립)
    Board.jsx             게임판
    BalancePanel.jsx       잔액 현황판
    QuizModal.jsx / ActionModal.jsx / BankruptModal.jsx / GameOverModal.jsx
```

`gameEngine.js`는 화면과 완전히 분리된 순수 함수라서, 게임 규칙만 따로 테스트하거나 나중에 수정하기 쉬워요.

## 참고

- 문제 자동 공유는 링크 안에 문제 데이터를 담는 방식이라 별도 서버/DB 없이 작동해요.
- Claude 아티팩트 안에서 열었을 때는 추가로 공유 저장소(`window.storage`)도 함께 사용하지만, 필수는 아니에요.
