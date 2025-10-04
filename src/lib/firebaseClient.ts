import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyBLg5K7xOvpJ4zJBQXNZDEgnPaZSQoY2PQ",
  authDomain: "hisab-54f88.firebaseapp.com",
  projectId: "hisab-54f88",
  storageBucket: "hisab-54f88.firebasestorage.app",
  messagingSenderId: "1054563635179",
  appId: "1:1054563635179:web:f2eedfcbf89ea8e60753ae",
  measurementId: "G-NMMK878KN8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('profile');
googleProvider.addScope('email');

export default app;