// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDv6QALxp7OqwTaS6shB4SZ1n2fmSwvM1E",
  authDomain: "filehaven-aae7f.firebaseapp.com",
  projectId: "filehaven-aae7f",
  storageBucket: "filehaven-aae7f.firebasestorage.app",
  messagingSenderId: "651173413232",
  appId: "1:651173413232:web:4d5478f6bb5fa8427ecfb5",
  measurementId: "G-S2KQMF1SLK"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };