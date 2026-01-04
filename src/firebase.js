import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// TODO: Replace with your actual Firebase Project Config later
const firebaseConfig = {
  apiKey: "AIzaSyCinvN2ee7vDSzcvVHDVWR3b0eXK-25D3s",
  authDomain: "happinest-ims.firebaseapp.com",
  projectId: "happinest-ims",
  storageBucket: "happinest-ims.firebasestorage.app",
  messagingSenderId: "97180620992",
  appId: "1:97180620992:web:b9ac917ca4cdd22d86b525"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);