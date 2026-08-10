import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut, 
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Initialize Firestore (using databaseId if specified in config)
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Configure Google Auth Provider with Google Drive scopes
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/drive.file');
googleProvider.addScope('https://www.googleapis.com/auth/drive.readonly');
googleProvider.addScope('https://www.googleapis.com/auth/userinfo.email');
googleProvider.addScope('https://www.googleapis.com/auth/userinfo.profile');
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export interface FirebaseLoginResult {
  user: {
    id: string;
    email: string | null;
    name: string | null;
    picture: string | null;
  };
  accessToken: string | null;
}

/**
 * Handle redirect result on initial page load
 */
export async function checkFirebaseRedirectResult(): Promise<FirebaseLoginResult | null> {
  try {
    const result = await getRedirectResult(auth);
    if (!result) return null;

    const credential = GoogleAuthProvider.credentialFromResult(result);
    const accessToken = credential?.accessToken || null;
    const firebaseUser = result.user;
    const userPayload = {
      id: firebaseUser.uid,
      email: firebaseUser.email,
      name: firebaseUser.displayName,
      picture: firebaseUser.photoURL,
    };

    if (accessToken) {
      await fetch('/api/auth/firebase-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: userPayload, accessToken }),
      }).catch(err => console.warn('Failed to sync Firebase redirect session:', err));
    }

    return { user: userPayload, accessToken };
  } catch (err: any) {
    console.warn('Firebase redirect sign-in error:', err);
    throw err;
  }
}

/**
 * Trigger Firebase Google Sign-In with Google Drive access token via Popup
 */
export async function signInWithFirebaseGoogle(): Promise<FirebaseLoginResult> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const accessToken = credential?.accessToken || null;

    const firebaseUser = result.user;
    const userPayload = {
      id: firebaseUser.uid,
      email: firebaseUser.email,
      name: firebaseUser.displayName,
      picture: firebaseUser.photoURL,
    };

    // Sync session with Express server backend so Drive APIs can use accessToken
    if (accessToken) {
      await fetch('/api/auth/firebase-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: userPayload, accessToken }),
      }).catch(err => console.warn('Failed to sync Firebase session with server backend:', err));
    }

    return {
      user: userPayload,
      accessToken,
    };
  } catch (err: any) {
    console.warn('Firebase Google Sign-In notice:', err?.code, err?.message || err);
    throw err;
  }
}

/**
 * Trigger Firebase Google Sign-In via Full Page Redirect (Bypasses popup restrictions)
 */
export async function signInWithFirebaseRedirectMode(): Promise<void> {
  await signInWithRedirect(auth, googleProvider);
}

/**
 * Sign out from Firebase and sync server
 */
export async function logoutFirebase(): Promise<void> {
  await firebaseSignOut(auth);
  await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
}

export { onAuthStateChanged };
export type { User };

