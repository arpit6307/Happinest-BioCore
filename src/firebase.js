// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: Replace with your actual Firebase Project Config later
const firebaseConfig = {
  apiKey: "AIzaSyCinvN2ee7vDSzcvVHDVWR3b0eXK-25D3s",
  authDomain: "happinest-ims.firebaseapp.com",
  projectId: "happinest-ims",
  storageBucket: "happinest-ims.firebasestorage.app",
  messagingSenderId: "97180620992",
  appId: "1:97180620992:web:b9ac917ca4cdd22d86b525"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ✅ IMPORTANT: firebaseConfig ko export karein
export { auth, db, firebaseConfig }; 
export default app;