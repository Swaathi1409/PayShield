// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from 'firebase/auth';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDOQAXqrgeOC2U-aVBRR3c9Kjvhf5k3wsc",
  authDomain: "pay-shield.firebaseapp.com",
  projectId: "pay-shield",
  storageBucket: "pay-shield.firebasestorage.app",
  messagingSenderId: "565852511343",
  appId: "1:565852511343:web:a8a8a6cba0c28b66e6c19a",
  measurementId: "G-LV9247JLLW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
