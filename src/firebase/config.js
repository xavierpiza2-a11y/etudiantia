// src/firebase/config.js
// ⚠️  Remplace ces valeurs par celles de ta console Firebase
// https://console.firebase.google.com → Paramètres du projet → Vos applications

import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app);

// Structure Firestore :
// users/{uid}/
//   courses/{courseId}/
//     - imageURL: string
//     - summary: object
//     - createdAt: timestamp
//     - quizId: string
//   quizzes/{quizId}/
//     - questions: array
//     - courseId: string
//   results/{resultId}/
//     - quizId: string
//     - score: number
//     - maxScore: number
//     - answers: array
//     - completedAt: timestamp
//   profile/
//     - xp: number
//     - level: number
//     - badges: array
//     - streak: number
