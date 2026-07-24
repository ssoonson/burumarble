# Firebase 설정 가이드

실시간 멀티플레이와 교사용 관리자 기능을 쓰려면 아래 설정이 필요해요.
(설정 전에는 기존 오프라인 모드로 그대로 동작합니다.)

## 1. Firebase 프로젝트 만들기

1. [console.firebase.google.com](https://console.firebase.google.com) 접속 → **프로젝트 추가**
2. 프로젝트 이름 입력 (예: `burumarble-class`) → 만들기

## 2. 웹 앱 등록

1. 프로젝트 개요 화면에서 **웹 아이콘(`</>`)** 클릭
2. 앱 닉네임 입력 후 등록
3. 화면에 나오는 `firebaseConfig` 값들을 복사해두세요

## 3. 환경변수 설정

프로젝트 폴더의 `.env.example`을 복사해서 `.env`로 만들고, 복사한 값을 채웁니다.

```
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=burumarble-class.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=burumarble-class
VITE_FIREBASE_STORAGE_BUCKET=burumarble-class.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123...:web:abc...
VITE_ALLOWED_DOMAIN=우리학교도메인.kr
```

**Vercel 배포 시**: Vercel 대시보드 → 프로젝트 → Settings → Environment Variables 에
위 값들을 똑같이 등록해야 합니다. (`.env` 파일은 git에 올라가지 않아요)

## 4. Google 로그인 켜기

1. Firebase 콘솔 → **Authentication** → 시작하기
2. **Sign-in method** 탭 → **Google** 사용 설정
3. **Settings → 승인된 도메인**에 Vercel 주소(`내프로젝트.vercel.app`) 추가

## 5. Firestore 만들기

1. Firebase 콘솔 → **Firestore Database** → 데이터베이스 만들기
2. **프로덕션 모드**로 시작 (테스트 모드는 누구나 읽고 쓸 수 있어 위험해요)
3. 위치는 `asia-northeast3 (서울)` 권장

## 6. 보안 규칙 적용 (중요!)

1. Firestore → **규칙** 탭
2. 프로젝트의 `firestore.rules` 파일 내용을 **전체 복사해서 붙여넣기**
3. 파일 안의 `allowedDomain()` 함수에서 도메인을 우리 학교 도메인으로 수정
4. **게시** 클릭

> ⚠️ 이 단계를 건너뛰면 누구나 데이터를 마음대로 읽고 쓸 수 있습니다.
> 프론트엔드의 도메인 검사만으로는 보안이 되지 않아요.

## 7. 교사 계정 등록

교사 권한은 Firestore에 직접 등록해야 합니다.

1. 먼저 선생님 계정으로 게임에 한 번 로그인 (`/admin` 접속 → Google 로그인)
2. Firebase 콘솔 → **Authentication → 사용자** 에서 본인 계정의 **사용자 UID** 복사
3. Firestore → 컬렉션 시작 → 컬렉션 ID: `admins`
4. 문서 ID에 방금 복사한 **UID**를 붙여넣고, 필드 추가:
   - `email` (문자열): 선생님 이메일
   - `displayName` (문자열): 선생님 이름
5. 저장 후 `/admin` 새로고침하면 관리자 화면이 나옵니다

## 8. 사용 흐름

**교사**
1. `내주소.vercel.app/admin` 접속 → 로그인
2. 문제 파일 업로드 (CSV / JSON / 직접 입력)
3. 방 개수 선택 → **모둠 방 생성**
4. 생성된 방마다 링크 복사해서 각 모둠에게 전달
5. 같은 화면에서 학생별 게임머니 실시간 조정

**학생**
1. 선생님이 준 링크(`내주소.vercel.app/?room=xxx`) 접속
2. 학교 계정으로 Google 로그인
3. 자동으로 해당 모둠 방 입장 → 캐릭터 선택 → 게임 시작

## 참고: 무료 사용량

Firebase 무료 플랜(Spark) 기준 하루 읽기 5만 회 / 쓰기 2만 회입니다.
한 학급(30명) 수업 기준으로는 충분하지만, 여러 학급이 동시에 장시간 사용하면
사용량을 확인해보시는 게 좋아요.
