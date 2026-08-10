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
 * Trigger Direct Google OAuth Flow (Bypasses Firebase auth/unauthorized-domain completely)
 */
export function signInWithDirectGoogleOAuth(): void {
  const clientId = firebaseConfig.oAuthClientId || '384562200881-satjm3m2p0kp0ij5o9pa7o4atb3ouf2v.apps.googleusercontent.com';
  const redirectUri = window.location.origin + window.location.pathname;
  const scopes = [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
    'openid'
  ].join(' ');

  const targetUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${encodeURIComponent(scopes)}&prompt=select_account`;
  
  window.location.href = targetUrl;
}

/**
 * Check if user returned from Direct Google OAuth redirect with access token in URL hash
 */
export async function checkDirectOAuthHashResult(): Promise<FirebaseLoginResult | null> {
  const hash = window.location.hash;
  if (!hash || !hash.includes('access_token=')) {
    return null;
  }

  const params = new URLSearchParams(hash.substring(1));
  const accessToken = params.get('access_token');
  if (!accessToken) return null;

  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user profile from Google');
    }

    const profile = await response.json();
    const userPayload = {
      id: profile.sub || profile.id || 'google_user',
      email: profile.email || null,
      name: profile.name || profile.given_name || 'Google User',
      picture: profile.picture || null
    };

    localStorage.setItem('google_drive_access_token', accessToken);
    localStorage.setItem('google_user', JSON.stringify(userPayload));

    // Clear location hash without forcing a page reload
    window.history.replaceState(null, '', window.location.pathname + window.location.search);

    await fetch('/api/auth/firebase-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: userPayload, accessToken }),
    }).catch(err => console.warn('Sync notice:', err));

    return {
      user: userPayload,
      accessToken
    };
  } catch (err) {
    console.warn('Direct OAuth hash parsing error:', err);
    return null;
  }
}

/**
 * Handle redirect result on initial page load
 */
export async function checkFirebaseRedirectResult(): Promise<FirebaseLoginResult | null> {
  // First check direct OAuth URL hash
  const directResult = await checkDirectOAuthHashResult();
  if (directResult) return directResult;

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

