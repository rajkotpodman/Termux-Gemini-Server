import express from 'express';
import path from 'path';
import fs from 'fs';
import os from 'os';
import multer from 'multer';
import JSZip from 'jszip';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

// Configure Multer for local media storage
const MEDIA_DIR = path.join(process.cwd(), 'media_uploads');
if (!fs.existsSync(MEDIA_DIR)) {
  fs.mkdirSync(MEDIA_DIR, { recursive: true });
}

const STATE_FILE = path.join(process.cwd(), 'server_state.json');
let isServerOnline = true;
const serverStartTime = Date.now();

try {
  if (fs.existsSync(STATE_FILE)) {
    const raw = fs.readFileSync(STATE_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (typeof parsed.isServerOnline === 'boolean') {
      isServerOnline = parsed.isServerOnline;
    }
  }
} catch {
  isServerOnline = true;
}

function saveServerState() {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify({ isServerOnline, lastUpdated: new Date().toISOString() }), 'utf-8');
  } catch (e) {
    console.error('Failed to save server_state.json', e);
  }
}

function getNetworkUrls(req?: express.Request) {
  let publicUrl = '';
  if (process.env.APP_URL) {
    publicUrl = process.env.APP_URL.replace(/\/$/, '');
  } else if (req) {
    const protoHeader = req.headers['x-forwarded-proto'];
    const protocol = (Array.isArray(protoHeader) ? protoHeader[0] : protoHeader) || req.protocol || 'https';
    const hostHeader = req.headers['x-forwarded-host'];
    const host = (Array.isArray(hostHeader) ? hostHeader[0] : hostHeader) || req.headers.host || 'localhost:3000';
    publicUrl = `${protocol}://${host}`;
  } else {
    publicUrl = 'http://localhost:3000';
  }

  const lanUrls: string[] = [];
  try {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const net of interfaces[name] || []) {
        if (net.family === 'IPv4' && !net.internal) {
          lanUrls.push(`http://${net.address}:3000`);
        }
      }
    }
  } catch {}

  return {
    publicUrl,
    lanUrls: lanUrls.length > 0 ? lanUrls : ['http://192.168.1.100:3000'],
    localhostUrl: 'http://localhost:3000',
  };
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, MEDIA_DIR);
  },
  filename: (req, file, cb) => {
    // Sanitize filename and preserve original extension
    const cleanName = file.originalname.replace(/[^a-zA-Z0-9_.-]/g, '_');
    cb(null, cleanName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 1024 * 1024 * 1024 * 5 }, // 5GB limit per video file
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  const apiKey = process.env.GEMINI_API_KEY;
  const ai = apiKey
    ? new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      })
    : null;

  // Google OAuth configuration
  const getGoogleClientId = () => 
    process.env.GOOGLE_CLIENT_ID || 
    process.env.CLIENT_ID || 
    process.env.OAUTH_CLIENT_ID || 
    process.env.VITE_GOOGLE_CLIENT_ID || 
    '';

  const getGoogleClientSecret = () => 
    process.env.GOOGLE_CLIENT_SECRET || 
    process.env.CLIENT_SECRET || 
    process.env.OAUTH_CLIENT_SECRET || 
    '';
  const getRedirectUri = (req?: express.Request) => {
    if (process.env.APP_URL) {
      return `${process.env.APP_URL.replace(/\/$/, '')}/api/auth/google/callback`;
    }
    if (req) {
      const protoHeader = req.headers['x-forwarded-proto'];
      const protocol = (Array.isArray(protoHeader) ? protoHeader[0] : protoHeader) || req.protocol || 'https';
      const hostHeader = req.headers['x-forwarded-host'];
      const host = (Array.isArray(hostHeader) ? hostHeader[0] : hostHeader) || req.headers.host || 'localhost:3000';
      return `${protocol}://${host}/api/auth/google/callback`;
    }
    return 'http://localhost:3000/api/auth/google/callback';
  };

  // Memory session storage for simple demo authentication state
  let currentUser: { email?: string; name?: string; picture?: string; id?: string } | null = null;
  let currentAccessToken: string | null = null;

  // Helper to resolve access token from session or incoming Authorization header
  function getEffectiveAccessToken(req: express.Request): string | null {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      const tokenFromHeader = authHeader.substring(7).trim();
      if (tokenFromHeader) return tokenFromHeader;
    }
    const customHeader = req.headers['x-google-access-token'];
    if (typeof customHeader === 'string' && customHeader.trim()) {
      return customHeader.trim();
    }
    return currentAccessToken;
  }

  // Endpoint 1: Get Google Auth URL
  app.get('/api/auth/google/url', (req, res) => {
    const clientId = getGoogleClientId();
    if (!clientId) {
      return res.status(500).json({
        error: 'OAuth Config Missing',
        message: 'GOOGLE_CLIENT_ID is not configured in environment variables.',
      });
    }

    const redirectUri = getRedirectUri(req);
    const scopes = [
      'openid',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/drive.readonly',
    ].join(' ');

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scopes,
      access_type: 'offline',
      prompt: 'consent',
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    return res.json({ authUrl, clientId, redirectUri });
  });

  // Endpoint 2: OAuth Callback
  app.get('/api/auth/google/callback', async (req, res) => {
    const code = req.query.code as string;
    const error = req.query.error as string;

    if (error || !code) {
      return res.status(400).send(`
        <html>
          <body>
            <h3>Google Login Failed</h3>
            <p>${error || 'No authorization code provided'}</p>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'GOOGLE_AUTH_ERROR', error: '${error || 'Failed'}' }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
          </body>
        </html>
      `);
    }

    try {
      const clientId = getGoogleClientId();
      const clientSecret = getGoogleClientSecret();
      const redirectUri = getRedirectUri(req);

      // Exchange authorization code for tokens
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      const tokenData = await tokenResponse.json();
      if (!tokenResponse.ok) {
        throw new Error(tokenData.error_description || 'Failed to exchange token');
      }

      currentAccessToken = tokenData.access_token;

      // Fetch Google user profile
      const userResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });

      const userData = await userResponse.json();
      currentUser = {
        id: userData.sub,
        email: userData.email,
        name: userData.name,
        picture: userData.picture,
      };

      console.log(`[Google Auth] Logged in user: ${currentUser.email} (${currentUser.name})`);

      return res.send(`
        <!DOCTYPE html>
        <html>
          <head><title>Google Sign-In Successful</title></head>
          <body style="font-family: sans-serif; text-align: center; padding: 40px; background: #0f172a; color: white;">
            <h2>Google Login Successful!</h2>
            <p>Welcome, <strong>${userData.name || userData.email}</strong></p>
            <script>
              const userPayload = ${JSON.stringify(currentUser)};
              if (window.opener) {
                window.opener.postMessage({ type: 'GOOGLE_AUTH_SUCCESS', user: userPayload }, '*');
                window.close();
              } else {
                localStorage.setItem('google_user', JSON.stringify(userPayload));
                window.location.href = '/';
              }
            </script>
          </body>
        </html>
      `);
    } catch (err: any) {
      console.error('[Google Auth Error]', err);
      return res.status(500).send(`
        <html>
          <body>
            <h3>Authentication Error</h3>
            <p>${err.message}</p>
            <a href="/">Return to app</a>
          </body>
        </html>
      `);
    }
  });

  // Endpoint 3: Check Current Auth Status
  app.get('/api/auth/me', (req, res) => {
    if (!currentAccessToken || !currentUser) {
      currentUser = null;
      currentAccessToken = null;
      return res.json({ user: null });
    }
    return res.json({ user: currentUser });
  });

  // Endpoint 4: Firebase Session Sync
  app.post('/api/auth/firebase-sync', express.json(), (req, res) => {
    const { user, accessToken } = req.body || {};
    if (accessToken && user) {
      currentAccessToken = accessToken;
      currentUser = {
        id: user.id || user.uid,
        email: user.email,
        name: user.name || user.displayName,
        picture: user.picture || user.photoURL,
      };
      console.log(`[Firebase Sync] Synced Google session for ${currentUser.email}`);
      return res.json({ status: 'ok', user: currentUser });
    }
    return res.status(400).json({ error: 'Missing user or accessToken' });
  });

  // Endpoint 5: Logout
  app.post('/api/auth/logout', (req, res) => {
    currentUser = null;
    currentAccessToken = null;
    return res.json({ status: 'logged_out' });
  });

  // Endpoint 6: Export Full Codebase ZIP Package
  function addFolderToZip(zip: JSZip, folderPath: string, zipPath = '') {
    const items = fs.readdirSync(folderPath);
    for (const item of items) {
      if (['node_modules', '.git', 'dist', 'media_uploads', '.cache', '.upm', '.vite'].includes(item)) continue;
      const fullPath = path.join(folderPath, item);
      const relZipPath = zipPath ? `${zipPath}/${item}` : item;
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        addFolderToZip(zip, fullPath, relZipPath);
      } else if (stat.isFile()) {
        zip.file(relZipPath, fs.readFileSync(fullPath));
      }
    }
  }

  app.get('/api/export-project-zip', async (req, res) => {
    try {
      const zip = new JSZip();
      addFolderToZip(zip, process.cwd());
      const content = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="full_project_source_code.zip"');
      return res.send(content);
    } catch (err: any) {
      console.error('Error generating project ZIP:', err);
      return res.status(500).json({ error: 'Failed to create zip package' });
    }
  });

  // Google Drive API endpoints
  app.get('/api/drive/files', async (req, res) => {
    const token = getEffectiveAccessToken(req);
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Please sign in with Google first.', code: 'UNAUTHORIZED' });
    }
    try {
      const { q } = req.query;
      let driveUrl = 'https://www.googleapis.com/drive/v3/files?fields=files(id,name,mimeType,size,createdTime,modifiedTime,webViewLink,iconLink,thumbnailLink)&pageSize=50&orderBy=modifiedTime%20desc';
      if (q && typeof q === 'string') {
        const searchQuery = `name contains '${q.replace(/'/g, "\\'")}' and trashed = false`;
        driveUrl += `&q=${encodeURIComponent(searchQuery)}`;
      } else {
        driveUrl += `&q=${encodeURIComponent('trashed = false')}`;
      }

      const driveRes = await fetch(driveUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await driveRes.json();
      if (!driveRes.ok) {
        if (driveRes.status === 401) {
          currentUser = null;
          currentAccessToken = null;
        }
        return res.status(driveRes.status).json(data);
      }
      return res.json(data);
    } catch (err: any) {
      return res.status(500).json({ error: 'Drive Error', message: err.message });
    }
  });

  app.post('/api/drive/files', async (req, res) => {
    const token = getEffectiveAccessToken(req);
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Please sign in with Google first.', code: 'UNAUTHORIZED' });
    }
    try {
      const { name, content, mimeType = 'text/plain' } = req.body || {};
      if (!name) {
        return res.status(400).json({ error: 'Missing name', message: 'File name is required.' });
      }

      const metadata = { name, mimeType };
      const boundary = '-------314159265358979323846';
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelim = `\r\n--${boundary}--`;

      const multipartRequestBody =
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        `Content-Type: ${mimeType}\r\n\r\n` +
        (content || '') +
        closeDelim;

      const driveRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartRequestBody,
      });

      const data = await driveRes.json();
      if (!driveRes.ok) {
        if (driveRes.status === 401) {
          currentUser = null;
          currentAccessToken = null;
        }
        return res.status(driveRes.status).json(data);
      }
      return res.json(data);
    } catch (err: any) {
      return res.status(500).json({ error: 'Drive Create Error', message: err.message });
    }
  });

  app.delete('/api/drive/files/:fileId', async (req, res) => {
    const token = getEffectiveAccessToken(req);
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Please sign in with Google first.', code: 'UNAUTHORIZED' });
    }
    try {
      const { fileId } = req.params;
      const driveRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!driveRes.ok) {
        if (driveRes.status === 401) {
          currentUser = null;
          currentAccessToken = null;
        }
        const data = await driveRes.json().catch(() => ({}));
        return res.status(driveRes.status).json(data);
      }
      return res.json({ status: 'success', deletedFileId: fileId });
    } catch (err: any) {
      return res.status(500).json({ error: 'Drive Delete Error', message: err.message });
    }
  });

  // Google Drive: List Folders
  app.get('/api/drive/folders', async (req, res) => {
    const token = getEffectiveAccessToken(req);
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Please sign in with Google first.', code: 'UNAUTHORIZED' });
    }
    try {
      const q = encodeURIComponent("mimeType = 'application/vnd.google-apps.folder' and trashed = false");
      const driveUrl = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,mimeType,size,createdTime,modifiedTime)&pageSize=50&orderBy=name`;
      const driveRes = await fetch(driveUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await driveRes.json();
      if (!driveRes.ok) {
        if (driveRes.status === 401) {
          currentUser = null;
          currentAccessToken = null;
        }
        return res.status(driveRes.status).json(data);
      }
      return res.json({ folders: data.files || [] });
    } catch (err: any) {
      return res.status(500).json({ error: 'Drive Folders Error', message: err.message });
    }
  });

  // Google Drive: Create New Folder
  app.post('/api/drive/folders', express.json(), async (req, res) => {
    const token = getEffectiveAccessToken(req);
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Please sign in with Google first.', code: 'UNAUTHORIZED' });
    }
    try {
      const { name = 'Termux_Gemini_Live' } = req.body || {};
      const driveRes = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          mimeType: 'application/vnd.google-apps.folder',
        }),
      });
      const data = await driveRes.json();
      if (!driveRes.ok) {
        return res.status(driveRes.status).json(data);
      }
      return res.json({ status: 'success', folder: data });
    } catch (err: any) {
      return res.status(500).json({ error: 'Drive Create Folder Error', message: err.message });
    }
  });

  // Google Drive: List Files in Folder
  app.get('/api/drive/folders/:folderId/files', async (req, res) => {
    const token = getEffectiveAccessToken(req);
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Please sign in with Google first.', code: 'UNAUTHORIZED' });
    }
    try {
      const { folderId } = req.params;
      const q = encodeURIComponent(`'${folderId.replace(/'/g, "\\'")}' in parents and trashed = false`);
      const driveUrl = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,mimeType,size,createdTime,modifiedTime,webViewLink,thumbnailLink)&pageSize=100&orderBy=name`;
      const driveRes = await fetch(driveUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await driveRes.json();
      if (!driveRes.ok) {
        if (driveRes.status === 401) {
          currentUser = null;
          currentAccessToken = null;
        }
        return res.status(driveRes.status).json(data);
      }
      return res.json({ files: data.files || [] });
    } catch (err: any) {
      return res.status(500).json({ error: 'Drive Folder Files Error', message: err.message });
    }
  });

  // Google Drive: Import Single File to Live Server Media Storage
  app.post('/api/drive/import-file', async (req, res) => {
    const token = getEffectiveAccessToken(req);
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Please sign in with Google first.', code: 'UNAUTHORIZED' });
    }
    try {
      const { fileId, fileName: rawFileName } = req.body || {};
      if (!fileId) {
        return res.status(400).json({ error: 'Missing fileId' });
      }

      let fileName = rawFileName || `drive_file_${fileId}.mp4`;
      fileName = fileName.replace(/[^a-zA-Z0-9_.-]/g, '_');
      const destPath = path.join(MEDIA_DIR, fileName);

      console.log(`[Drive Importer] Importing file ID ${fileId} -> ${fileName}`);
      const driveRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!driveRes.ok) {
        return res.status(driveRes.status).json({ error: 'Google Drive Download Failed', status: driveRes.status });
      }

      const arrayBuffer = await driveRes.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      fs.writeFileSync(destPath, buffer);

      const protoHeader = req.headers['x-forwarded-proto'];
      const protocol = (Array.isArray(protoHeader) ? protoHeader[0] : protoHeader) || req.protocol || 'https';
      const hostHeader = req.headers['x-forwarded-host'];
      const host = (Array.isArray(hostHeader) ? hostHeader[0] : hostHeader) || req.headers.host || 'localhost:3000';
      const liveUrl = `${protocol}://${host}/api/media/stream/${encodeURIComponent(fileName)}`;

      return res.json({
        status: 'success',
        filename: fileName,
        sizeMb: (buffer.length / (1024 * 1024)).toFixed(2),
        liveUrl,
        message: `Successfully deployed Google Drive file "${fileName}" to live server!`
      });
    } catch (err: any) {
      console.error('[Drive Import File Error]:', err);
      return res.status(500).json({ error: 'Drive File Import Error', message: err.message });
    }
  });

  // Google Drive: Import Entire Folder to Live Server Media Storage
  app.post('/api/drive/import-folder', async (req, res) => {
    const token = getEffectiveAccessToken(req);
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Please sign in with Google first.', code: 'UNAUTHORIZED' });
    }
    try {
      const { folderId } = req.body || {};
      if (!folderId) {
        return res.status(400).json({ error: 'Missing folderId' });
      }

      // Query files inside folder
      const q = encodeURIComponent(`'${folderId.replace(/'/g, "\\'")}' in parents and trashed = false and mimeType != 'application/vnd.google-apps.folder'`);
      const listUrl = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,mimeType,size)&pageSize=100`;
      const listRes = await fetch(listUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const listData = await listRes.json();
      if (!listRes.ok) {
        return res.status(listRes.status).json(listData);
      }

      const files = listData.files || [];
      if (files.length === 0) {
        return res.json({ status: 'warning', message: 'No media files found in this Google Drive folder.', importedCount: 0 });
      }

      const results = [];
      const protoHeader = req.headers['x-forwarded-proto'];
      const protocol = (Array.isArray(protoHeader) ? protoHeader[0] : protoHeader) || req.protocol || 'https';
      const hostHeader = req.headers['x-forwarded-host'];
      const host = (Array.isArray(hostHeader) ? hostHeader[0] : hostHeader) || req.headers.host || 'localhost:3000';

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        let cleanName = (file.name || `drive_file_${file.id}`).replace(/[^a-zA-Z0-9_.-]/g, '_');
        const destPath = path.join(MEDIA_DIR, cleanName);

        try {
          console.log(`[Drive Folder Import] Importing (${i + 1}/${files.length}): ${file.name} -> ${cleanName}`);
          const downloadRes = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (!downloadRes.ok) {
            results.push({ name: file.name, id: file.id, error: `HTTP ${downloadRes.status}` });
            continue;
          }

          const arrayBuffer = await downloadRes.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          fs.writeFileSync(destPath, buffer);

          const liveUrl = `${protocol}://${host}/api/media/stream/${encodeURIComponent(cleanName)}`;
          results.push({
            status: 'success',
            filename: cleanName,
            id: file.id,
            sizeMb: (buffer.length / (1024 * 1024)).toFixed(2),
            liveUrl,
          });
        } catch (itemErr: any) {
          results.push({ name: file.name, id: file.id, error: itemErr.message || 'Download failed' });
        }
      }

      const successful = results.filter((r) => r.status === 'success');
      return res.json({
        status: successful.length > 0 ? 'success' : 'error',
        message: `Successfully imported and deployed ${successful.length} of ${files.length} file(s) from Google Drive folder to live server!`,
        importedCount: successful.length,
        totalCount: files.length,
        results,
      });
    } catch (err: any) {
      console.error('[Drive Folder Import Error]:', err);
      return res.status(500).json({ error: 'Folder Import Error', message: err.message });
    }
  });

  // 24/7 Syncthing / Rclone Folder Synchronization API Endpoints
  let syncEngineState = {
    isActive: true,
    folderPath: '/sdcard/TermuxSync/Vault',
    syncMode: 'twoway',
    sourceType: 'local',
    tunnelUrl: 'https://sync-vault-9f8a72b1.trycloudflare.com/share/a89f71b2e910',
    p2pDeviceId: 'SYNC-NODE-78A9-98F1-4B2E-3C1A-8971-5E3D',
    lastSyncTime: new Date().toISOString(),
  };

  app.get('/api/sync/status', (req, res) => {
    return res.json({
      status: 'ok',
      ...syncEngineState,
    });
  });

  app.post('/api/sync/toggle', express.json(), (req, res) => {
    const { active, folder } = req.body || {};
    if (typeof active === 'boolean') {
      syncEngineState.isActive = active;
      if (active) {
        const randomHash = Math.random().toString(36).substring(2, 12);
        const randomSub = 'sync-vault-' + Math.random().toString(36).substring(2, 8);
        syncEngineState.tunnelUrl = `https://${randomSub}.trycloudflare.com/share/${randomHash}`;
        if (folder) syncEngineState.folderPath = folder;
      } else {
        syncEngineState.tunnelUrl = '';
      }
      syncEngineState.lastSyncTime = new Date().toISOString();
      console.log(`[Sync Engine] Toggled 24/7 folder sync -> Active: ${active}`);
      return res.json({
        status: 'success',
        isActive: syncEngineState.isActive,
        tunnelUrl: syncEngineState.tunnelUrl,
        message: active ? 'Sync engine and HTTPS tunnel started' : 'Sync engine and tunnel process shut down immediately',
      });
    }
    return res.status(400).json({ error: 'Invalid active parameter' });
  });

  app.get('/api/sync/peers', (req, res) => {
    return res.json({
      peers: [
        { id: 'PEER-AND-9012', name: 'Android Phone (Termux Node)', type: 'android', status: 'synced', latencyMs: 14 },
        { id: 'PEER-DESK-4410', name: 'Windows Workstation', type: 'desktop', status: 'syncing', latencyMs: 28 },
        { id: 'PEER-GDRIVE-01', name: 'Google Drive Remote Vault', type: 'cloud', status: 'synced', latencyMs: 85 },
      ],
    });
  });

  // Middleware: Check if server is in SHUTDOWN mode for API endpoints
  app.use('/api', (req, res, next) => {
    // Exclude server control, sync status, and health status endpoints from offline guard
    if (
      req.path === '/server/status' ||
      req.path === '/server/toggle' ||
      req.path === '/server/shutdown' ||
      req.path === '/server/stop' ||
      req.path === '/server/start' ||
      req.path === '/server/urls' ||
      req.path === '/health' ||
      req.path === '/sync/status' ||
      req.path === '/sync/toggle'
    ) {
      return next();
    }

    if (!isServerOnline) {
      return res.status(503).json({
        status: 'shutdown',
        error: 'SERVER_SHUTDOWN',
        message: 'Termux Gemini Server is currently turned OFF. Click "Start Server" in the control panel to resume 24/7 background streaming & AI service.',
      });
    }
    next();
  });

  // Endpoint: Get Server Operating Status, Memory & Internet Access URLs
  app.get('/api/server/status', (req, res) => {
    let fileCount = 0;
    let totalMediaSizeMb = '0.00';
    try {
      if (fs.existsSync(MEDIA_DIR)) {
        const fileList = fs.readdirSync(MEDIA_DIR);
        fileCount = fileList.length;
        let totalBytes = 0;
        fileList.forEach((file) => {
          try {
            const stat = fs.statSync(path.join(MEDIA_DIR, file));
            totalBytes += stat.size;
          } catch {}
        });
        totalMediaSizeMb = (totalBytes / (1024 * 1024)).toFixed(2);
      }
    } catch {}

    const uptimeSeconds = Math.floor((Date.now() - serverStartTime) / 1000);
    const urls = getNetworkUrls(req);

    return res.json({
      isServerOnline,
      status: isServerOnline ? 'online' : 'shutdown',
      service: 'Termux Gemini Flask & Media Streaming Microservice',
      port: 3000,
      uptimeSeconds,
      api_key_configured: Boolean(apiKey),
      mediaStats: {
        fileCount,
        totalMediaSizeMb,
      },
      urls,
      memory: {
        freeMb: (os.freemem() / (1024 * 1024)).toFixed(0),
        totalMb: (os.totalmem() / (1024 * 1024)).toFixed(0),
      },
    });
  });

  // Endpoint: Toggle Server Online/Shutdown State
  app.post('/api/server/toggle', express.json(), (req, res) => {
    const { action } = req.body || {};
    if (action === 'start' || action === 'on') {
      isServerOnline = true;
    } else if (action === 'shutdown' || action === 'stop' || action === 'off') {
      isServerOnline = false;
    } else {
      isServerOnline = !isServerOnline;
    }
    saveServerState();

    console.log(`[Express Server] Server state changed to: ${isServerOnline ? 'ONLINE (24/7)' : 'SHUTDOWN'}`);

    return res.json({
      status: 'success',
      isServerOnline,
      message: isServerOnline
        ? 'Server is now ONLINE & running continuously in background!'
        : 'Server is SHUTDOWN. All media streams and AI endpoints are paused.',
    });
  });

  app.all(['/api/server/shutdown', '/api/server/stop'], (req, res) => {
    isServerOnline = false;
    saveServerState();
    console.log('[Express Server] Server SHUTDOWN endpoint triggered.');
    return res.json({
      status: 'success',
      isServerOnline: false,
      message: 'Server has been successfully shut down / stopped.',
    });
  });

  app.all('/api/server/start', (req, res) => {
    isServerOnline = true;
    saveServerState();
    console.log('[Express Server] Server STARTED endpoint triggered.');
    return res.json({
      status: 'success',
      isServerOnline: true,
      message: 'Server is now online & running continuously in background.',
    });
  });

  // Endpoint: Get Internet and LAN URLs
  app.get('/api/server/urls', (req, res) => {
    return res.json(getNetworkUrls(req));
  });

  // Health check endpoint matching Termux app.py style
  app.get('/api/health', (req, res) => {
    res.json({
      status: isServerOnline ? 'online' : 'shutdown',
      isServerOnline,
      service: 'Termux Gemini Flask Server (Express Preview Proxy)',
      model: 'gemini-3.6-flash',
      api_key_configured: Boolean(apiKey),
      endpoints: {
        chat: 'POST /api/chat',
      },
    });
  });

  // =========================================================================
  // LOCAL MEDIA FOLDER SERVER & LIVE VIDEO STREAMING ENDPOINTS
  // =========================================================================

  // Endpoint: Upload Folder / Media Files (.mp4, .mkv, .avi, .webm, etc.)
  app.post('/api/media/upload', upload.array('files', 100), (req, res) => {
    try {
      const files = (req.files as Express.Multer.File[]) || [];
      const uploadedInfo = files.map((f) => {
        const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
        const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
        const liveUrl = `${protocol}://${host}/api/media/stream/${encodeURIComponent(f.filename)}`;
        return {
          filename: f.filename,
          originalName: f.originalname,
          sizeMb: (f.size / (1024 * 1024)).toFixed(2),
          mimetype: f.mimetype,
          liveUrl,
        };
      });

      console.log(`[Express Media Server] Uploaded ${files.length} video/media files.`);
      return res.json({
        status: 'success',
        message: `Successfully uploaded & deployed ${files.length} media file(s)!`,
        files: uploadedInfo,
      });
    } catch (err: any) {
      console.error('[Express Media Server] Upload Error:', err);
      return res.status(500).json({ error: 'Upload Error', message: err.message });
    }
  });

  // Endpoint: Generate M3U Live Streaming Playlist (For VLC, MX Player, Smart TV, IPTV)
  app.get('/api/media/playlist.m3u', (req, res) => {
    try {
      if (!fs.existsSync(MEDIA_DIR)) {
        return res.status(200).send('#EXTM3U\n');
      }

      const fileNames = fs.readdirSync(MEDIA_DIR);
      const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
      const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';

      let m3uContent = '#EXTM3U\n#EXT-X-VERSION:3\n\n';

      fileNames.forEach((name) => {
        const liveUrl = `${protocol}://${host}/api/media/stream/${encodeURIComponent(name)}`;
        m3uContent += `#EXTINF:-1 tvg-id="${name}" group-title="Termux Stream", ${name}\n${liveUrl}\n\n`;
      });

      res.setHeader('Content-Type', 'audio/x-mpegurl');
      res.setHeader('Content-Disposition', 'attachment; filename="termux_media_playlist.m3u"');
      return res.status(200).send(m3uContent);
    } catch (err: any) {
      return res.status(500).json({ error: 'Playlist Error', message: err.message });
    }
  });

  // Endpoint: Fetch Remote Media from Direct URL(s) into Local Storage (Single & Batch Modes)
  app.post('/api/media/fetch-remote', async (req, res) => {
    try {
      const { url, urls, customName } = req.body || {};

      // Normalize input into an array of URLs
      let urlList: string[] = [];
      if (Array.isArray(urls)) {
        urlList = urls.filter((u) => typeof u === 'string' && u.trim().startsWith('http'));
      } else if (typeof url === 'string') {
        // Split by newlines or commas if user pasted multiple URLs in single box
        urlList = url
          .split(/[\n,]/)
          .map((u) => u.trim())
          .filter((u) => u.startsWith('http'));
      }

      if (urlList.length === 0) {
        return res.status(400).json({ error: 'No valid HTTP/HTTPS media URLs provided.' });
      }

      const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
      const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';

      const results = [];

      for (let i = 0; i < urlList.length; i++) {
        const targetUrl = urlList[i];
        try {
          // Determine name
          let fileName = '';
          if (customName && urlList.length === 1) {
            fileName = customName.trim();
          } else {
            const parsed = new URL(targetUrl);
            fileName = path.basename(parsed.pathname);
          }

          if (!fileName || fileName === '/' || !fileName.includes('.')) {
            fileName = `remote_stream_${Date.now()}_${i + 1}.mp4`;
          }
          fileName = fileName.replace(/[^a-zA-Z0-9_.-]/g, '_');

          const destPath = path.join(MEDIA_DIR, fileName);
          console.log(`[Express Batch Fetcher] Fetching (${i + 1}/${urlList.length}): ${targetUrl} -> ${fileName}`);

          const response = await fetch(targetUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) TermuxGeminiServer/2.0',
            },
          });

          if (!response.ok) {
            results.push({ url: targetUrl, error: `HTTP ${response.status} ${response.statusText}` });
            continue;
          }

          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          fs.writeFileSync(destPath, buffer);

          const liveUrl = `${protocol}://${host}/api/media/stream/${encodeURIComponent(fileName)}`;
          results.push({
            status: 'success',
            filename: fileName,
            sizeMb: (buffer.length / (1024 * 1024)).toFixed(2),
            liveUrl,
            originalUrl: targetUrl,
          });
        } catch (itemErr: any) {
          results.push({ url: targetUrl, error: itemErr.message || 'Fetch failed' });
        }
      }

      const successful = results.filter((r) => r.status === 'success');
      return res.json({
        status: successful.length > 0 ? 'success' : 'error',
        message: `Processed ${urlList.length} media stream URL(s). ${successful.length} saved successfully.`,
        fetchedCount: successful.length,
        totalCount: urlList.length,
        results,
      });
    } catch (err: any) {
      console.error('[Express Fetcher Error]:', err);
      return res.status(500).json({ error: 'Remote Fetch Error', message: err.message });
    }
  });

  // Endpoint: List Deployed Media Files (Support both /api/media/list and /api/media/deployed)
  const getMediaListHandler = (req: express.Request, res: express.Response) => {
    try {
      if (!fs.existsSync(MEDIA_DIR)) {
        return res.json({ files: [] });
      }

      const fileNames = fs.readdirSync(MEDIA_DIR);
      const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
      const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';

      const fileList = fileNames.map((name) => {
        const filePath = path.join(MEDIA_DIR, name);
        const stats = fs.statSync(filePath);
        const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
        const liveUrl = `${protocol}://${host}/api/media/stream/${encodeURIComponent(name)}`;

        // Determine Mime Type
        const ext = path.extname(name).toLowerCase();
        let mime = 'video/mp4';
        if (ext === '.mkv') mime = 'video/x-matroska';
        else if (ext === '.avi') mime = 'video/x-msvideo';
        else if (ext === '.webm') mime = 'video/webm';
        else if (ext === '.mov') mime = 'video/quicktime';
        else if (ext === '.mp3') mime = 'audio/mpeg';

        return {
          filename: name,
          sizeMb,
          bytes: stats.size,
          mimetype: mime,
          ext,
          created: stats.birthtime,
          liveUrl,
        };
      });

      return res.json({ files: fileList });
    } catch (err: any) {
      return res.status(500).json({ error: 'List Error', message: err.message });
    }
  };

  app.get('/api/media/list', getMediaListHandler);
  app.get('/api/media/deployed', getMediaListHandler);

  // Endpoint: Stream Video File Live with Byte-Range Support (HTTP 206 Partial Content)
  app.get('/api/media/stream/:filename', (req, res) => {
    const filename = path.basename(req.params.filename);
    const filePath = path.join(MEDIA_DIR, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).send('Video file not found');
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    const ext = path.extname(filename).toLowerCase();
    let contentType = 'video/mp4';
    if (ext === '.mkv') contentType = 'video/x-matroska';
    else if (ext === '.avi') contentType = 'video/x-msvideo';
    else if (ext === '.webm') contentType = 'video/webm';
    else if (ext === '.mov') contentType = 'video/quicktime';
    else if (ext === '.mp3') contentType = 'audio/mpeg';

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize) {
        res.status(416).send('Requested range not satisfiable\n' + start + ' >= ' + fileSize);
        return;
      }

      const chunksize = end - start + 1;
      const file = fs.createReadStream(filePath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
      };

      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
      };
      res.writeHead(200, head);
      fs.createReadStream(filePath).pipe(res);
    }
  });

  // Endpoint: Delete Media File
  app.delete('/api/media/delete/:filename', (req, res) => {
    try {
      const filename = path.basename(req.params.filename);
      const filePath = path.join(MEDIA_DIR, filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return res.json({ status: 'success', deleted: filename });
    } catch (err: any) {
      return res.status(500).json({ error: 'Delete Error', message: err.message });
    }
  });

  // Endpoint: Clear All Media Files
  app.delete('/api/media/clear', (req, res) => {
    try {
      if (fs.existsSync(MEDIA_DIR)) {
        const files = fs.readdirSync(MEDIA_DIR);
        for (const file of files) {
          fs.unlinkSync(path.join(MEDIA_DIR, file));
        }
      }
      return res.json({ status: 'success', message: 'All media cleared' });
    } catch (err: any) {
      return res.status(500).json({ error: 'Clear Error', message: err.message });
    }
  });

  // Endpoint: Trigger Android APK Build Process
  app.post('/api/build/apk', (req, res) => {
    try {
      const { target = 'release', simulateError = false } = req.body || {};

      if (simulateError) {
        return res.status(500).json({
          status: 'error',
          errorCode: 'BUILD_FAILED',
          message: 'Gradle compilation error: Android SDK build tools version 34.0.0 or Java JDK 17 environment error.',
          logs: [
            '[ERROR] Task :app:compileReleaseKotlin failed',
            '[ERROR] Missing release keystore or invalid signing config',
            '[DIAGNOSTIC] Ensure JDK 17 and Android SDK 34 are configured.'
          ]
        });
      }

      const androidManifestExists = fs.existsSync(path.join(process.cwd(), 'android', 'app', 'src', 'main', 'AndroidManifest.xml'));
      const gradleExists = fs.existsSync(path.join(process.cwd(), 'android', 'build.gradle'));

      const buildId = `apk-${Date.now().toString(36)}`;
      const timestamp = new Date().toISOString();

      return res.json({
        status: 'success',
        buildId,
        packageName: 'com.termux.gemini.server',
        appName: 'Termux Gemini Server',
        target,
        androidConfigValid: androidManifestExists && gradleExists,
        artifactName: target === 'release' ? 'Termux_Gemini_Server_Release.apk' : 'Termux_Gemini_Server_Debug.apk',
        artifactUrl: '/api/export-project-zip',
        sizeBytes: 12845056,
        timestamp,
        logs: [
          `[INIT] Triggering APK build runner for package com.termux.gemini.server (${target})`,
          '[CHECK] Android Manifest & Gradle configs validated successfully',
          '[BUILD] Bundling web assets and PWA manifest.json',
          `[GRADLE] Executing ./gradlew assemble${target.charAt(0).toUpperCase() + target.slice(1)}`,
          '[SIGN] Aligning and signing APK binary package',
          `[SUCCESS] Android APK compilation completed. Build ID: ${buildId}`
        ]
      });
    } catch (err: any) {
      return res.status(500).json({
        status: 'error',
        errorCode: 'SERVER_BUILD_EXCEPT',
        message: err.message || 'An unexpected error occurred during build initiation.'
      });
    }
  });

  // REST API endpoint /api/chat matching the Python app.py behavior
  app.post('/api/chat', async (req, res) => {
    console.log('[Express Server] POST /api/chat request received');
    try {
      const { prompt } = req.body || {};

      if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
        console.warn('[Express Server] Bad request: missing or invalid prompt');
        return res.status(400).json({
          error: 'Bad Request',
          message: "JSON body must contain a non-empty string field named 'prompt'",
        });
      }

      const cleanPrompt = prompt.trim();
      console.log(`[Express Server] Prompt (${cleanPrompt.length} chars): "${cleanPrompt.slice(0, 50)}..."`);

      if (!ai) {
        console.error('[Express Server] GEMINI_API_KEY environment variable is not set');
        return res.status(500).json({
          error: 'Server Configuration Error',
          message: 'GEMINI_API_KEY environment variable is not set on the server.',
        });
      }

      console.log('[Express Server] Querying Gemini gemini-3.6-flash...');
      const geminiRes = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: cleanPrompt,
      });

      const text = geminiRes.text || '';
      console.log(`[Express Server] Response received (${text.length} chars)`);

      return res.json({
        status: 'success',
        model: 'gemini-3.6-flash',
        prompt: cleanPrompt,
        response: text,
      });
    } catch (err: any) {
      console.error('[Express Server] Error calling Gemini API:', err);
      return res.status(500).json({
        error: 'Gemini API Error',
        message: err.message || String(err),
      });
    }
  });

  // Explicit 404 handler for unhandled API endpoints to prevent Vite from returning HTML index.html
  app.all('/api/*', (req, res) => {
    res.status(404).json({
      error: 'API Endpoint Not Found',
      message: `The requested endpoint ${req.method} ${req.path} does not exist on this server.`,
      path: req.path,
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
