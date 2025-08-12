import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBcMhi8hxgr9PAlbUuANvyvkk95fkPZ7BA",
  authDomain: "auth-697e2.firebaseapp.com",
  projectId: "auth-697e2",
  storageBucket: "auth-697e2.firebasestorage.app",
  messagingSenderId: "38931048485",
  appId: "1:38931048485:web:974086d563558f105937cc",
  measurementId: "G-H341K6FR83"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export { signInWithPopup };
