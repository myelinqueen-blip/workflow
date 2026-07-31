# WorkFlow v2.1.0

> i4u Works 전용 프로젝트 관리 앱  
> Task · Month & Weekly · Personal 습관 · Rest 트렌드

---

## 🚀 GitHub Pages 배포 (5단계)

### 1. 레포지토리 생성

```bash
# GitHub에서 새 레포 생성 후
git clone https://github.com/myelinqueen-blip/workflow-app.git
cd workflow-app

# 이 폴더 내용 전체 복사 후
git add .
git commit -m "initial: WorkFlow v2.1.0"
git push origin main
```

### 2. Firebase 프로젝트 설정

1. [Firebase 콘솔](https://console.firebase.google.com) → 프로젝트 생성
2. **Authentication** → Google 로그인 활성화
3. **Firestore** → 데이터베이스 생성 (프로덕션 모드)
4. **프로젝트 설정** → 웹앱 추가 → 설정값 복사

### 3. Firestore Security Rules

Firebase 콘솔 → Firestore → Rules 탭에 아래 내용 붙여넣기:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isSignedIn() { return request.auth != null; }
    function isOwner(cid) { return isSignedIn() && get(/databases/$(database)/documents/clients/$(cid)).data.ownerId == request.auth.uid; }
    function isInvited(cid) { return isSignedIn() && request.auth.token.email in get(/databases/$(database)/documents/clients/$(cid)).data.invitedEmails; }
    function hasAccess(cid) { return isOwner(cid) || isInvited(cid); }

    match /users/{uid}       { allow read: if isSignedIn(); allow write: if request.auth.uid == uid; }
    match /clients/{cid}     { allow read: if hasAccess(cid); allow create: if isSignedIn() && request.resource.data.ownerId == request.auth.uid; allow update, delete: if isOwner(cid); }
    match /clients/{cid}/projects/{pid} { allow read, create, update: if hasAccess(cid); allow delete: if isOwner(cid); }
    match /clients/{cid}/projects/{pid}/tasks/{tid} { allow read, create, update: if hasAccess(cid); allow delete: if isOwner(cid); }
    match /clients/{cid}/projects/{pid}/tasks/{tid}/subtasks/{sid} { allow read, create, update: if hasAccess(cid); allow delete: if isOwner(cid); }
    match /personalTodos/{uid}/{doc=**} { allow read, write: if request.auth.uid == uid; }
    match /gmailFilterRules/{uid}/{doc=**} { allow read, write: if request.auth.uid == uid; }
    match /cheerMessages/{uid}/{doc=**} { allow read, write: if request.auth.uid == uid; }
  }
}
```

### 4. GitHub Secrets 등록

GitHub 레포 → **Settings → Secrets and variables → Actions → New repository secret**

| Secret 이름 | 값 |
|-------------|---|
| `VITE_FB_API_KEY` | Firebase apiKey |
| `VITE_FB_AUTH_DOMAIN` | Firebase authDomain |
| `VITE_FB_PROJECT_ID` | Firebase projectId |
| `VITE_FB_STORAGE_BUCKET` | Firebase storageBucket |
| `VITE_FB_MESSAGING_SENDER_ID` | Firebase messagingSenderId |
| `VITE_FB_APP_ID` | Firebase appId |

### 5. GitHub Pages 활성화

GitHub 레포 → **Settings → Pages**  
Source: **GitHub Actions**

→ `main` 브랜치에 push하면 자동 배포 시작  
→ 배포 완료 후 URL: `https://myelinqueen-blip.github.io/workflow-app/`

---

## 💻 로컬 개발

```bash
# 1. 의존성 설치
npm install

# 2. 환경변수 설정
cp .env.local.example .env.local
# .env.local 파일 열어서 Firebase 값 입력

# 3. 개발 서버 실행
npm run dev
# → http://localhost:5173/workflow-app/
```

Firebase 미설정 시 로컬 샘플 데이터로 자동 실행됨.

---

## 📁 프로젝트 구조

```
workflow-app/
├── src/
│   ├── App.jsx          # 루트: Auth + 탭 라우팅
│   ├── firebase.js      # Firebase 초기화
│   ├── utils.js         # 공통 유틸 + Seed 데이터
│   ├── index.css        # Tailwind + 전역 스타일
│   └── tabs/
│       ├── TaskTab.jsx       # Task 칸반/리스트
│       ├── CalendarTab.jsx   # Month & Weekly
│       ├── PersonalTab.jsx   # 개인 습관 트래커
│       └── RestTab.jsx       # 트렌드 · 밈 · 칭찬판
├── .github/
│   └── workflows/
│       └── deploy.yml   # GitHub Actions 자동 배포
├── .env.local.example   # 환경변수 템플릿
├── vite.config.js
├── tailwind.config.js
└── package.json
```

---

## 🔄 업데이트 방법

```bash
# 파일 수정 후
git add .
git commit -m "feat: 기능 설명"
git push origin main
# → GitHub Actions가 자동으로 빌드 + 배포
```

---

## 📋 버전 히스토리

| 버전 | 날짜 | 내용 |
|------|------|------|
| v2.1.0 | 2025-04 | Firebase Auth + Firestore 실시간 연동 |
| v2.0.0 | 2025-04 | 전체 탭 통합 (Task·Calendar·Personal·Rest) |
| v1.x   | 2025-04 | 탭별 개별 개발 |
