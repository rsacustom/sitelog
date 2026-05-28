import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Skip initialization during build when credentials are not yet configured
const hasConfig = !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

let _app: FirebaseApp | null = null;
if (hasConfig) {
  _app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
}

// Cast to the real types — will be populated once env vars are set
export const db: Firestore = _app ? getFirestore(_app) : ({} as Firestore);
export const auth: Auth = _app ? getAuth(_app) : ({} as Auth);
