# Firestore 데이터베이스 구조 설계

## 전체 구조 개요

```
/config/app                        앱 전역 설정 (허용 도메인 등)

/admins/{uid}                      교사(관리자) 목록
  email: string
  displayName: string
  createdAt: timestamp

/quizSets/{quizSetId}              업로드된 문제 세트
  title: string
  createdBy: string (uid)
  createdAt: timestamp
  quizzes: [ { question: string, answer: string }, ... ]

/rooms/{roomId}                    모둠별 게임 방
  name: string                     "1모둠"
  code: string                     URL 파라미터용 (예: "room_1")
  classSessionId: string           같이 만들어진 방 묶음 ID
  quizSetId: string                이 방이 사용할 문제 세트
  createdBy: string (uid)
  createdAt: timestamp
  status: "waiting" | "playing" | "finished"

  # ── 게임 상태 (모든 참가자에게 실시간 동기화) ──
  currentPlayerUid: string | null
  turnPhase: "idle" | "quiz" | "action" | "island" | "space"
             | "spaceOffer" | "goldenkey" | "bankrupt" | "gameover"
  turnMessage: string
  diceValues: [number, number] | null
  pendingLanding: { kind: string, pathIdx: number, owner?: string } | null
  properties: [ { owner: string|null, buildingLevel: number }, ... ]  # 24칸
  playerOrder: [uid, uid, ...]     턴 순서
  winnerUid: string | null
  lastActionAt: timestamp          동시성 충돌 감지용

/rooms/{roomId}/players/{uid}      방에 입장한 학생들 (서브컬렉션)
  uid: string
  displayName: string
  email: string
  emoji: string                    캐릭터 식별자
  position: number                 0~23
  money: number
  bankrupt: boolean
  skipTurns: number
  joinedAt: timestamp

/rooms/{roomId}/events/{eventId}   (선택) 주사위/거래 로그 — 감사 및 리플레이용
  type: "roll" | "buy" | "upgrade" | "toll" | "adminAdjust" | ...
  byUid: string
  payload: map
  createdAt: timestamp
```

## 설계 의도

**게임 상태를 `rooms/{roomId}` 문서 하나에 모은 이유**
턴·주사위·땅 소유 정보는 항상 함께 바뀌기 때문에, 한 문서에 담으면 하나의 스냅샷 구독으로 원자적으로 동기화됩니다. 24칸 배열은 Firestore 문서 크기 제한(1MB)에 비해 매우 작아 안전합니다.

**플레이어를 서브컬렉션으로 분리한 이유**
학생별 잔액은 교사가 개별적으로 수정하며, 학생 각자도 자주 갱신됩니다. 별도 문서로 두면 한 학생의 변경이 다른 학생 문서와 충돌하지 않고, 보안 규칙도 "본인 문서만 수정 가능"처럼 세밀하게 걸 수 있습니다.

**`code` 필드를 따로 둔 이유**
URL은 `?room=room_1`처럼 짧고 읽기 쉬워야 하지만, 문서 ID는 자동 생성 ID를 쓰는 편이 충돌이 없습니다. `code`로 조회해서 실제 문서를 찾는 구조입니다.

## 보안 관련 (중요)

**클라이언트 검사만으로는 보안이 되지 않습니다.** 아래 두 가지는 반드시 Firestore 보안 규칙(`firestore.rules`)으로 서버 측에서 강제해야 합니다.

1. **도메인 제한** — 프론트엔드에서 이메일 도메인을 확인하는 코드는 사용자가 우회할 수 있습니다. 규칙에서 `request.auth.token.email`을 검사해야 실제로 막힙니다.
2. **교사 권한** — `/admin` 라우트를 숨기는 것만으로는 학생이 직접 Firestore를 호출하는 것을 막지 못합니다. 잔액 수정 권한은 규칙에서 `/admins/{uid}` 문서 존재 여부로 확인해야 합니다.

`firestore.rules` 파일에 두 가지 모두 구현해두었습니다.
