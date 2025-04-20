// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";

// 사용자 제공 정보
const firebaseConfig = {
  apiKey: "AIzaSyBzkoyKiSBrhC-leS0FeVCnHQzAUBtOYBw",
  authDomain: "shalom-manpower.firebaseapp.com",
  projectId: "shalom-manpower",
  storageBucket: "shalom-manpower.firebasestorage.app",
  messagingSenderId: "554580073535",
  appId: "1:554580073535:web:49899724ce3dd926c22c8a",
  measurementId: "G-NT2CFFLQLR"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export { auth, signInWithEmailAndPassword };