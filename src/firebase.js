/**
 * firebase.js
 * Firebase 초기화 — 환경변수에서 설정 읽기
 *
 * 로컬 개발: .env.local 파일에 아래 키 입력
 * GitHub Pages: Repository Settings → Secrets and variables → Actions
 */
import { initializeApp }  from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { getFirestore, collection, doc, onSnapshot,
         addDoc, updateDoc, deleteDoc, query,
         where, orderBy, serverTimestamp } from "firebase/firestore";

const FB_CONFIG = {
  apiKey:            import.meta.env.VITE_FB_API_KEY            || "",
  authDomain:        import.meta.env.VITE_FB_AUTH_DOMAIN        || "",
  projectId:         import.meta.env.VITE_FB_PROJECT_ID         || "",
  storageBucket:     import.meta.env.VITE_FB_STORAGE_BUCKET     || "",
  messagingSenderId: import.meta.env.VITE_FB_MESSAGING_SENDER_ID|| "",
  appId:             import.meta.env.VITE_FB_APP_ID             || "",
};

export const USE_FIREBASE = !!FB_CONFIG.apiKey;

let auth, db;

if (USE_FIREBASE) {
  const app = initializeApp(FB_CONFIG);
  auth = getAuth(app);
  db   = getFirestore(app);
}

export {
  auth, db,
  GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged,
  collection, doc, onSnapshot, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, serverTimestamp,
};
