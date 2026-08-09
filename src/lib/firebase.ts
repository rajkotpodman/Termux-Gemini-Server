import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
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
 * Trigger Firebase Google Sign-In with Google Drive access token
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
    if (
      err?.code === 'auth/popup-closed-by-user' ||
      err?.code === 'auth/cancelled-popup-request' ||
      err?.code === 'auth/popup-blocked'
    ) {
      console.info('Firebase Google Sign-In popup closed or cancelled by user.');
    } else {
      console.warn('Firebase Google Sign-In notice:', err?.message || err);
    }
    throw err;
  }
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
