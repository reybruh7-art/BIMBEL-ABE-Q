import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBxwcCyA9mH_XDifE5-k_abnDRUONcsaZo",
  authDomain: "bimbel-abe-q.firebaseapp.com",
  projectId: "bimbel-abe-q",
  storageBucket: "bimbel-abe-q.firebasestorage.app",
  messagingSenderId: "440197163678",
  appId: "1:440197163678:web:2c7fa96e80fe4d83b3698f",
  measurementId: "G-FZPGMS5N4M"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
