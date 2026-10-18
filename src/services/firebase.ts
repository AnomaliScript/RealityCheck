import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, initializeAuth, type Auth } from "firebase/auth";
// @ts-ignore — exported at runtime by firebase/auth's React Native build,
// but its TypeScript types don't declare it. Known Firebase issue.
import { getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Not a secret: this identifies your project. The security rules protect the data.
const firebaseConfig = {
  apiKey: "AIzaSyAuPKKXGOgSrKWPe2a64lPzS3yRshmRJmI",
  authDomain: "realitycheck-35376.firebaseapp.com",
  projectId: "realitycheck-35376",
  storageBucket: "realitycheck-35376.firebasestorage.app",
  messagingSenderId: "470296437709",
  appId: "1:470296437709:web:e019bfc13658fa092bda84",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

function createAuth(): Auth {
  try {
    // Keeps people signed in across app restarts on iOS/Android.
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    // Two cases land here, both fine: Fast Refresh re-ran this file and auth
    // already exists, or we're on web, where the browser handles persistence.
    return getAuth(app);
  }
}

export const auth = createAuth();
export const db = getFirestore(app);
