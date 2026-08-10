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
 * Safely parse JSON response after validating response Content-Type.
 * Prevents SyntaxError: Unexpected token '<' on HTML redirect/error pages.
 */
export async function safeParseJsonResponse<T = any>(res: Response, label = 'GDrive'): Promise<T | null> {
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    try {
      const rawText = await res.clone().text();
      console.warn(`[${label}] Non-JSON response received (status ${res.status}, Content-Type: '${contentType}'). Raw body snippet:`, rawText.slice(0, 500));
    } catch {
      console.warn(`[${label}] Non-JSON response received (status ${res.status}, Content-Type: '${contentType}'). Unable to read body.`);
    }
    return null;
  }
  try {
    return await res.json();
  } catch (err) {
    try {
      const rawText = await res.clone().text();
      console.warn(`[${label}] Failed to parse JSON payload (status ${res.status}):`, err, 'Raw body snippet:', rawText.slice(0, 500));
    } catch {
      console.warn(`[${label}] Failed to parse JSON payload (status ${res.status}):`, err);
    }
    return null;
  }
}

export interface ValidatedApiResponse<T = any> {
  isValid: boolean;
  data: T | null;
  errorNotice: string | null;
  status: number;
}

/**
 * Middleware validation layer for Google API & server responses.
 * Checks if status is 200 (or OK in 200-299 range) and explicitly verifies 'Content-Type' includes 'application/json'.
 * If invalid, logs detailed error info to console and returns a user-facing notice ('Server error, check console').
 */
export async function validateGoogleApiResponse<T = any>(
  res: Response,
  actionLabel = 'Google API'
): Promise<ValidatedApiResponse<T>> {
  const status = res.status;
  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.toLowerCase().includes('application/json');

  if (!isJson) {
    let rawResponseBody = '';
    try {
      rawResponseBody = await res.clone().text();
    } catch {
      rawResponseBody = '[Unable to read raw body]';
    }

    console.error(`[${actionLabel}] Response Middleware Validation Failed (Non-JSON):`, {
      status,
      statusText: res.statusText,
      contentType,
      url: res.url,
      bodySnippet: rawResponseBody.slice(0, 1000),
    });

    let notice = `Server returned status ${status} (Non-JSON).`;
    if (status === 401 || status === 403) {
      notice = 'Google Drive authentication required or expired. Please sign in with Google.';
    } else if (status === 405) {
      notice = 'Method not allowed (HTTP 405). Please verify Google Drive sign-in or endpoint.';
    } else if (status >= 500) {
      notice = `Server error (${status}). Check console for details.`;
    }

    return {
      isValid: false,
      data: null,
      errorNotice: notice,
      status,
    };
  }

  try {
    const data = await res.json();
    if (!res.ok) {
      console.warn(`[${actionLabel}] API returned HTTP ${status} with JSON response:`, data);
      let notice = data.message || data.error || `Request failed with status ${status}`;
      if (status === 401 || status === 403) {
        notice = 'Google Drive authentication required or expired. Please click "Direct Google Sign-In".';
      }
      return {
        isValid: false,
        data,
        errorNotice: notice,
        status,
      };
    }
    return {
      isValid: true,
      data,
      errorNotice: null,
      status,
    };
  } catch (parseError) {
    let rawText = '';
    try {
      rawText = await res.clone().text();
    } catch {
      rawText = '[Unable to read raw body]';
    }

    console.error(`[${actionLabel}] Error parsing JSON payload:`, parseError, 'Raw body snippet:', rawText.slice(0, 1000));
    return {
      isValid: false,
      data: null,
      errorNotice: 'Failed to parse response as JSON. Check console.',
      status,
    };
  }
}

/**
 * Validate an access token with Google's tokeninfo endpoint
 */
export async function validateAccessToken(token: string): Promise<{ valid: boolean; scope?: string; email?: string; expiresIn?: number }> {
  try {
    const res = await fetch(`https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${encodeURIComponent(token)}`, {
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) {
      return { valid: false };
    }
    const data = await safeParseJsonResponse(res);
    if (!data) return { valid: false };
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
 * List Google Drive Folders with explicit Accept: application/json header and robust response validation
 */
export async function fetchGoogleDriveFolders(token?: string | null): Promise<DriveFolder[]> {
  const accessToken = token || getStoredDriveAccessToken();
  const headers: Record<string, string> = {
    'Accept': 'application/json',
  };
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
    headers['x-google-access-token'] = accessToken;
  }

  // Attempt 1: Via express backend proxy
  try {
    const res = await fetch('/api/drive/folders', { headers });
    if (res.ok) {
      const data = await safeParseJsonResponse(res);
      if (data && data.folders && Array.isArray(data.folders)) {
        return data.folders;
      }
    }
  } catch (e) {
    console.warn('[GDrive] Server endpoint failed, falling back to direct REST API', e);
  }

  // Attempt 2: Direct Google Drive REST API call
  if (accessToken) {
    try {
      const q = encodeURIComponent("mimeType = 'application/vnd.google-apps.folder' and trashed = false");
      const directRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,mimeType,size,createdTime,modifiedTime)&pageSize=50&orderBy=name`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json',
          },
        }
      );
      if (directRes.ok) {
        const directData = await safeParseJsonResponse(directRes);
        if (directData) {
          return directData.files || [];
        }
      }
    } catch (e) {
      console.warn('[GDrive] Direct REST API list folders error:', e);
    }
  }

  return [];
}

/**
 * Create a new folder in Google Drive
 */
export async function createGoogleDriveFolder(folderName = 'Termux_Gemini_Live', token?: string | null): Promise<DriveFolder> {
  const accessToken = token || getStoredDriveAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
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
      const data = await safeParseJsonResponse(res);
      if (data && data.folder) return data.folder;
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
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
      }),
    });
    if (directRes.ok) {
      const folderData = await safeParseJsonResponse(directRes);
      if (folderData) return folderData;
    }
    const errData = (await safeParseJsonResponse(directRes)) || {};
    throw new Error(errData.error?.message || 'Failed to create folder on Google Drive');
  }

  throw new Error('Authentication required to create a folder on Google Drive.');
}

/**
 * List files in Google Drive
 */
export async function fetchGoogleDriveFiles(queryStr = '', token?: string | null): Promise<DriveFile[]> {
  const accessToken = token || getStoredDriveAccessToken();
  const headers: Record<string, string> = {
    'Accept': 'application/json',
  };
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
      const data = await safeParseJsonResponse(res);
      if (data && data.files && Array.isArray(data.files)) {
        return data.files;
      }
    }
  } catch (e) {
    console.warn('[GDrive] Server files endpoint failed, falling back to direct REST API', e);
  }

  if (accessToken) {
    try {
      let driveUrl = 'https://www.googleapis.com/drive/v3/files?fields=files(id,name,mimeType,size,createdTime,modifiedTime,webViewLink,iconLink,thumbnailLink)&pageSize=50&orderBy=modifiedTime%20desc';
      if (queryStr.trim()) {
        const searchQuery = `name contains '${queryStr.trim().replace(/'/g, "\\'")}' and trashed = false`;
        driveUrl += `&q=${encodeURIComponent(searchQuery)}`;
      } else {
        driveUrl += `&q=${encodeURIComponent('trashed = false')}`;
      }

      const directRes = await fetch(driveUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
      });
      if (directRes.ok) {
        const directData = await safeParseJsonResponse(directRes);
        if (directData) return directData.files || [];
      }
    } catch (e) {
      console.warn('[GDrive] Direct REST API list files error:', e);
    }
  }

  return [];
}

/**
 * List files inside a specific Google Drive folder ID directly (without live hosting requirement)
 */
export async function fetchGoogleDriveFolderFiles(folderId: string, token?: string | null): Promise<DriveFile[]> {
  const accessToken = token || getStoredDriveAccessToken();
  if (!folderId) return [];

  // Attempt 1: Express backend proxy
  try {
    const headers: Record<string, string> = { 'Accept': 'application/json' };
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
      headers['x-google-access-token'] = accessToken;
    }
    const q = `'${folderId.replace(/'/g, "\\'")}' in parents and trashed = false`;
    const res = await fetch(`/api/drive/files?q=${encodeURIComponent(q)}`, { headers });
    if (res.ok) {
      const data = await safeParseJsonResponse(res);
      if (data && data.files && Array.isArray(data.files)) {
        return data.files;
      }
    }
  } catch (e) {
    console.warn('[GDrive] Server endpoint for folder files failed, using direct REST API', e);
  }

  // Attempt 2: Direct Google Drive REST API
  if (accessToken) {
    try {
      const q = `'${folderId.replace(/'/g, "\\'")}' in parents and trashed = false`;
      const driveUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,size,createdTime,modifiedTime,webViewLink,iconLink,thumbnailLink)&pageSize=100&orderBy=name`;
      const directRes = await fetch(driveUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
      });
      if (directRes.ok) {
        const directData = await safeParseJsonResponse(directRes);
        if (directData) return directData.files || [];
      }
    } catch (e) {
      console.warn('[GDrive] Direct REST API list folder contents error:', e);
    }
  }

  return [];
}

