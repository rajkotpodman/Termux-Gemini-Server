/**
 * Google Drive OAuth2 & API Helper Library
 * Handles authentication, token validation, scope checking, folder listing, and folder creation.
 */

export const DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'openid',
];

export interface DriveFolder {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime?: string;
  modifiedTime?: string;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime?: string;
  modifiedTime?: string;
  webViewLink?: string;
  thumbnailLink?: string;
}

/**
 * Store Google Access Token in localStorage
 */
export function setStoredDriveAccessToken(token: string): void {
  if (token) {
    localStorage.setItem('google_drive_access_token', token);
  }
}

/**
 * Get stored Access Token
 */
export function getStoredDriveAccessToken(): string | null {
  return localStorage.getItem('google_drive_access_token');
}

/**
 * Clear stored Access Token
 */
export function clearStoredDriveAccessToken(): void {
  localStorage.removeItem('google_drive_access_token');
}

/**
 * Validate an access token with Google's tokeninfo endpoint
 */
export async function validateAccessToken(token: string): Promise<{ valid: boolean; scope?: string; email?: string; expiresIn?: number }> {
  try {
    const res = await fetch(`https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${encodeURIComponent(token)}`);
    if (!res.ok) {
      return { valid: false };
    }
    const data = await res.json();
    return {
      valid: true,
      scope: data.scope,
      email: data.email,
      expiresIn: Number(data.expires_in || 0),
    };
  } catch (err) {
    console.error('[GDrive] Token validation error:', err);
    return { valid: false };
  }
}

/**
 * Trigger direct Google OAuth2 Sign-In redirect with full Drive scopes
 */
export function initiateGoogleDriveOAuth(clientId?: string): void {
  const cid = clientId || '384562200881-satjm3m2p0kp0ij5o9pa7o4atb3ouf2v.apps.googleusercontent.com';
  const redirectUri = window.location.origin + window.location.pathname;
  const scopes = DRIVE_SCOPES.join(' ');
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(cid)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${encodeURIComponent(scopes)}&prompt=select_account`;
  
  window.location.href = authUrl;
}

/**
 * List Google Drive Folders
 */
export async function fetchGoogleDriveFolders(token?: string | null): Promise<DriveFolder[]> {
  const accessToken = token || getStoredDriveAccessToken();
  const headers: Record<string, string> = {};
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
    headers['x-google-access-token'] = accessToken;
  }

  // Attempt 1: Via express backend proxy
  try {
    const res = await fetch('/api/drive/folders', { headers });
    if (res.ok) {
      const data = await res.json();
      if (data.folders && Array.isArray(data.folders)) {
        return data.folders;
      }
    }
  } catch (e) {
    console.warn('[GDrive] Server endpoint failed, falling back to direct REST API', e);
  }

  // Attempt 2: Direct Google Drive REST API call
  if (accessToken) {
    const q = encodeURIComponent("mimeType = 'application/vnd.google-apps.folder' and trashed = false");
    const directRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,mimeType,size,createdTime,modifiedTime)&pageSize=50&orderBy=name`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    if (directRes.ok) {
      const directData = await directRes.json();
      return directData.files || [];
    }
  }

  return [];
}

/**
 * Create a new folder in Google Drive
 */
export async function createGoogleDriveFolder(folderName = 'Termux_Gemini_Live', token?: string | null): Promise<DriveFolder> {
  const accessToken = token || getStoredDriveAccessToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
    headers['x-google-access-token'] = accessToken;
  }

  // Attempt 1: Server proxy endpoint
  try {
    const res = await fetch('/api/drive/folders', {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: folderName }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.folder) return data.folder;
    }
  } catch (e) {
    console.warn('[GDrive] Server create folder endpoint failed, trying direct Google REST API', e);
  }

  // Attempt 2: Direct Google Drive REST API
  if (accessToken) {
    const directRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
      }),
    });
    if (directRes.ok) {
      const folderData = await directRes.json();
      return folderData;
    }
    const errData = await directRes.json().catch(() => ({}));
    throw new Error(errData.error?.message || 'Failed to create folder on Google Drive');
  }

  throw new Error('Authentication required to create a folder on Google Drive.');
}

/**
 * List files in Google Drive
 */
export async function fetchGoogleDriveFiles(queryStr = '', token?: string | null): Promise<DriveFile[]> {
  const accessToken = token || getStoredDriveAccessToken();
  const headers: Record<string, string> = {};
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
    headers['x-google-access-token'] = accessToken;
  }

  try {
    let url = '/api/drive/files';
    if (queryStr.trim()) {
      url += `?q=${encodeURIComponent(queryStr.trim())}`;
    }
    const res = await fetch(url, { headers });
    if (res.ok) {
      const data = await res.json();
      if (data.files && Array.isArray(data.files)) {
        return data.files;
      }
    }
  } catch (e) {
    console.warn('[GDrive] Server files endpoint failed, falling back to direct REST API', e);
  }

  if (accessToken) {
    let driveUrl = 'https://www.googleapis.com/drive/v3/files?fields=files(id,name,mimeType,size,createdTime,modifiedTime,webViewLink,iconLink,thumbnailLink)&pageSize=50&orderBy=modifiedTime%20desc';
    if (queryStr.trim()) {
      const searchQuery = `name contains '${queryStr.trim().replace(/'/g, "\\'")}' and trashed = false`;
      driveUrl += `&q=${encodeURIComponent(searchQuery)}`;
    } else {
      driveUrl += `&q=${encodeURIComponent('trashed = false')}`;
    }

    const directRes = await fetch(driveUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (directRes.ok) {
      const directData = await directRes.json();
      return directData.files || [];
    }
  }

  return [];
}
