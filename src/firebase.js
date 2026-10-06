import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBkyPVWXGb8yLop3FEBGmYWcux8K1459k4", // Added quotes around the key here
  authDomain: "valex-farms.firebaseapp.com",
  projectId: "valex-farms",
  storageBucket: "valex-farms.firebasestorage.app",
  messagingSenderId: "501904563745",
  appId: "1:501904563745:web:b6f175ac7a540412ab4d60",
  measurementId: "G-HPTDV6ZS7Q"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);