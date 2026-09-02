import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut
} from 'firebase/auth';

// Your web app's Firebase configuration
// IMPORTANT: You will need to replace these with your actual Firebase project config
const firebaseConfig = {
  apiKey: "AIzaSyAtf1JaN2xRMbRPjllE2XEVACpjh-hZ63Q",
  authDomain: "kinchronicles-d99ed.firebaseapp.com",
  projectId: "kinchronicles-d99ed",
  storageBucket: "kinchronicles-d99ed.firebasestorage.app",
  messagingSenderId: "201391304972",
  appId: "1:201391304972:web:473026b61276ddcd571929",
  measurementId: "G-D5EW3DQ233"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Authentication Helpers
const googleProvider = new GoogleAuthProvider();

export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return { user: result.user, error: null };
  } catch (error) {
    return { user: null, error: error.message };
  }
};

export const loginWithEmail = async (email, password) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return { user: result.user, error: null };
  } catch (error) {
    return { user: null, error: error.message };
  }
};

export const signupWithEmail = async (email, password) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    return { user: result.user, error: null };
  } catch (error) {
    return { user: null, error: error.message };
  }
};

export const logout = async () => {
  await signOut(auth);
};
