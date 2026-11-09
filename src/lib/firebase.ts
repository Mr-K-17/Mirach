import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  initializeAuth,
  inMemoryPersistence,
  type Auth
} from "firebase/auth";

/**
 * Public Firebase Web Configuration (Architecture §15.4).
 * Values originate from public VITE_* environment variables.
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ""
};

/**
 * Singleton Firebase app instance.
 */
export const firebaseApp: FirebaseApp =
  getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

/**
 * Mirach Auth instance initialized with inMemoryPersistence (Rules §9, Architecture §5.2).
 * The ID token exists only long enough to establish a Mirach server-side session.
 * No Firebase tokens or credentials are ever stored in localStorage or IndexedDB.
 */
export const auth: Auth = initializeAuth(firebaseApp, {
  persistence: inMemoryPersistence
});
