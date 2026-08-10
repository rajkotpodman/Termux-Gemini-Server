import React, { useState, useEffect } from 'react';
import { 
  HardDrive, 
  Search, 
  File, 
  FileText, 
  Folder, 
  Trash2, 
  ExternalLink, 
  Plus, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  Upload, 
  X, 
  ShieldAlert,
  LogIn,
  FileCode,
  Image as ImageIcon,
  Eye
} from 'lucide-react';
import { GoogleUser } from '../types';
import { 
  fetchGoogleDriveFolders, 
  createGoogleDriveFolder, 
  fetchGoogleDriveFiles, 
  fetchGoogleDriveFolderFiles,
  initiateGoogleDriveOAuth, 
  getStoredDriveAccessToken,
  safeParseJsonResponse,
  validateGoogleApiResponse
} from '../lib/gdrive';

interface GoogleDriveManagerProps {
  user: GoogleUser | null;
  onLoginRequest: () => void;
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime?: string;
  modifiedTime?: string;
  webViewLink?: string;
  iconLink?: string;
  thumbnailLink?: string;
}

export const GoogleDriveManager: React.FC<GoogleDriveManagerProps> = ({ user, onLoginRequest }) => {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [folders, setFolders] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Import / Deploy states
  const [importingFolderId, setImportingFolderId] = useState<string | null>(null);
  const [importingFileId, setImportingFileId] = useState<string | null>(null);
  const [deploySuccess, setDeploySuccess] = useState<string | null>(null);

  // New File modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newFileName, setNewFileName] = useState('Termux_Gemini_Notes.txt');
  const [newFileContent, setNewFileContent] = useState('Sample notes generated via Termux Gemini Server.');
  const [creating, setCreating] = useState(false);

  // Delete confirmation modal state
  const [fileToDelete, setFileToDelete] = useState<DriveFile | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);

  // Selected folder file browser state
  const [selectedFolder, setSelectedFolder] = useState<{ id: string; name: string } | null>(null);
  const [folderFiles, setFolderFiles] = useState<DriveFile[]>([]);
  const [loadingFolderFiles, setLoadingFolderFiles] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);

  const handleBrowseFolderFiles = async (folderId: string, folderName: string) => {
    setSelectedFolder({ id: folderId, name: folderName });
    setLoadingFolderFiles(true);
    setError(null);
    try {
      const list = await fetchGoogleDriveFolderFiles(folderId);
      setFolderFiles(list as DriveFile[]);
    } catch (err: any) {
      setError(err.message || 'Error fetching files in folder.');
    } finally {
      setLoadingFolderFiles(false);
    }
  };

  const handleCreateFolderInDrive = async (folderName = 'Termux_Gemini_Live') => {
    setCreatingFolder(true);
    setError(null);
    setDeploySuccess(null);
    try {
      const folder = await createGoogleDriveFolder(folderName);
      if (folder) {
        setDeploySuccess(`📁 Created Google Drive folder "${folderName}" successfully!`);
        setTimeout(() => setDeploySuccess(null), 5000);
        await fetchDriveFolders();
      }
    } catch (err: any) {
      setError(err.message || 'Error creating Google Drive folder.');
    } finally {
      setCreatingFolder(false);
    }
  };

  const fetchDriveFolders = async () => {
    if (!user) return;
    setLoadingFolders(true);
    try {
      const folderList = await fetchGoogleDriveFolders();
      setFolders(folderList as DriveFile[]);
    } catch (err) {
      console.error('Error fetching Drive folders:', err);
    } finally {
      setLoadingFolders(false);
    }
  };

  const fetchDriveFiles = async (queryStr = '') => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const fileList = await fetchGoogleDriveFiles(queryStr);
      setFiles(fileList as DriveFile[]);
      if (fileList.length === 0 && !getStoredDriveAccessToken()) {
        setError('Google authentication required. Please sign in with Google to view files.');
      }
    } catch (err: any) {
      setError(err.message || 'Network error fetching Google Drive files.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchDriveFiles();
      fetchDriveFolders();
    }
  }, [user]);

  const handleImportFolder = async (folderId: string, folderName: string) => {
    setImportingFolderId(folderId);
    setError(null);
    setDeploySuccess(null);
    try {
      const accessToken = getStoredDriveAccessToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
        headers['x-google-access-token'] = accessToken;
      }

      const res = await fetch('/api/drive/import-folder', {
        method: 'POST',
        headers,
        body: JSON.stringify({ folderId }),
      });

      const validated = await validateGoogleApiResponse(res, 'handleImportFolder');
      if (!validated.isValid) {
        setError(validated.errorNotice || 'Server error, check console');
        return;
      }

      const data = validated.data;
      if (data && (data.status === 'success' || data.status === 'warning')) {
        setDeploySuccess(`🚀 ${data.message}`);
        setTimeout(() => setDeploySuccess(null), 6000);
      } else {
        setError(data?.message || data?.error || 'Failed to deploy folder from Google Drive');
      }
    } catch (err: any) {
      setError(err.message || 'Error deploying Google Drive folder');
    } finally {
      setImportingFolderId(null);
    }
  };

  const handleImportFile = async (fileId: string, fileName: string) => {
    setImportingFileId(fileId);
    setError(null);
    setDeploySuccess(null);
    try {
      const accessToken = getStoredDriveAccessToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
        headers['x-google-access-token'] = accessToken;
      }

      const res = await fetch('/api/drive/import-file', {
        method: 'POST',
        headers,
        body: JSON.stringify({ fileId, fileName }),
      });

      const validated = await validateGoogleApiResponse(res, 'handleImportFile');
      if (!validated.isValid) {
        setError(validated.errorNotice || 'Server error, check console');
        return;
      }

      const data = validated.data;
      if (data && data.status === 'success') {
        setDeploySuccess(`⚡ Successfully deployed "${data.filename}" live! Stream link: ${data.liveUrl}`);
        setTimeout(() => setDeploySuccess(null), 6000);
      } else {
        setError(data?.message || data?.error || 'Failed to deploy file');
      }
    } catch (err: any) {
      setError(err.message || 'Error deploying file from Google Drive');
    } finally {
      setImportingFileId(null);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDriveFiles(searchQuery);
  };

  const handleCreateFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim()) return;
    setCreating(true);
    setError(null);

    try {
      const accessToken = getStoredDriveAccessToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
        headers['x-google-access-token'] = accessToken;
      }

      const res = await fetch('/api/drive/files', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: newFileName.trim(),
          content: newFileContent,
          mimeType: 'text/plain'
        })
      });

      const validated = await validateGoogleApiResponse(res, 'handleCreateFile');
      if (validated.isValid && validated.data) {
        setIsCreateOpen(false);
        setNewFileName('Termux_Gemini_Notes.txt');
        setNewFileContent('');
        fetchDriveFiles(searchQuery);
      } else {
        setError(validated.errorNotice || 'Server error, check console');
      }
    } catch (err: any) {
      setError(err.message || 'Error creating file');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!fileToDelete) return;
    setDeleting(true);
    setError(null);
    try {
      const accessToken = getStoredDriveAccessToken();
      const headers: Record<string, string> = {
        'Accept': 'application/json',
      };
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
        headers['x-google-access-token'] = accessToken;
      }

      const res = await fetch(`/api/drive/files/${fileToDelete.id}`, {
        method: 'DELETE',
        headers,
      });

      const validated = await validateGoogleApiResponse(res, 'handleDeleteConfirmed');
      if (validated.isValid) {
        setDeleteSuccess(`Successfully removed "${fileToDelete.name}" from Google Drive.`);
        setTimeout(() => setDeleteSuccess(null), 4000);
        setFileToDelete(null);
        fetchDriveFiles(searchQuery);
      } else {
        setError(validated.errorNotice || 'Server error, check console');
      }
    } catch (err: any) {
      setError(err.message || 'Error deleting file');
    } finally {
      setDeleting(false);
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('folder')) return <Folder className="w-5 h-5 text-amber-400" />;
    if (mimeType.includes('image')) return <ImageIcon className="w-5 h-5 text-purple-400" />;
    if (mimeType.includes('code') || mimeType.includes('json') || mimeType.includes('script')) {
      return <FileCode className="w-5 h-5 text-emerald-400" />;
    }
    if (mimeType.includes('document') || mimeType.includes('text')) {
      return <FileText className="w-5 h-5 text-blue-400" />;
    }
    return <File className="w-5 h-5 text-slate-400" />;
  };

  const formatSize = (bytes?: string) => {
    if (!bytes) return '—';
    const num = parseInt(bytes, 10);
    if (isNaN(num)) return '—';
    if (num < 1024) return `${num} B`;
    if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
    return `${(num / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!user) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-5 max-w-2xl mx-auto shadow-xl my-6">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-lg">
          <HardDrive className="w-7 h-7" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-white">Connect Google Drive</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Sign in with your Google account to list, search, view, create, and sync Termux Gemini scripts & notes directly with your Google Drive.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={async () => {
              const { signInWithDirectGoogleOAuth } = await import('../lib/firebase');
              signInWithDirectGoogleOAuth();
            }}
            className="inline-flex items-center space-x-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm transition-all shadow-md"
            title="Direct Google OAuth (Works on GitHub Pages & Custom Domains)"
          >
            <LogIn className="w-4 h-4" />
            <span>Direct Google Sign-In</span>
          </button>
          <button
            onClick={onLoginRequest}
            className="inline-flex items-center space-x-2 px-5 py-3 bg-white hover:bg-slate-100 text-slate-900 font-semibold rounded-xl text-sm transition-all shadow-md"
          >
            <LogIn className="w-4 h-4 text-slate-900" />
            <span>Firebase Popup</span>
          </button>
          <button
            onClick={() => window.open(window.location.href, '_blank')}
            className="inline-flex items-center space-x-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium rounded-xl text-sm transition-all"
            title="Open application in a full browser tab"
          >
            <ExternalLink className="w-4 h-4 text-slate-400" />
            <span>New Tab</span>
          </button>
        </div>
        <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-400 max-w-lg mx-auto text-left">
          💡 <span className="font-semibold text-slate-300">Tip for AI Studio Preview:</span> Browsers sometimes restrict popup logins inside embedded preview frames. If popup login closes without signing in, click <span className="text-emerald-400 font-medium">Open in New Tab</span> to sign in cleanly!
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-md">
        <div>
          <div className="flex items-center space-x-2 text-emerald-400 font-mono text-xs font-semibold uppercase tracking-wider">
            <HardDrive className="w-4 h-4" />
            <span>Google Drive Storage Integration</span>
          </div>
          <h2 className="text-xl font-bold text-slate-100 mt-1">
            Google Drive File Explorer
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage files, export Termux scripts, and sync Gemini AI outputs directly to your Google Drive account.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleCreateFolderInDrive('Termux_Gemini_Live')}
            disabled={creatingFolder}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold transition-all shadow-md"
          >
            {creatingFolder ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Folder className="w-4 h-4" />}
            <span>New Live Folder</span>
          </button>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-medium transition-all shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>New File to Drive</span>
          </button>
          <button
            onClick={() => fetchDriveFiles(searchQuery)}
            disabled={loading}
            className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl transition-colors"
            title="Refresh Drive Files"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Success Banner */}
      {deleteSuccess && (
        <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-sm flex items-center space-x-2 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{deleteSuccess}</span>
        </div>
      )}

      {/* Deploy Success Banner */}
      {deploySuccess && (
        <div className="p-4 rounded-xl bg-cyan-950/90 border border-cyan-800 text-cyan-200 text-sm flex items-center justify-between shadow-lg animate-fade-in font-mono">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0" />
            <span>{deploySuccess}</span>
          </div>
          <button onClick={() => setDeploySuccess(null)} className="text-cyan-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-red-950/80 border border-red-800 text-red-300 text-sm flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Google Drive Folders Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <Folder className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white">Your Google Drive Folders</h3>
            <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-mono">
              {folders.length} Folders
            </span>
          </div>
          <button
            onClick={fetchDriveFolders}
            disabled={loadingFolders}
            className="text-xs text-slate-400 hover:text-emerald-400 flex items-center space-x-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingFolders ? 'animate-spin text-emerald-400' : ''}`} />
            <span>Refresh Folders</span>
          </button>
        </div>

        {loadingFolders ? (
          <div className="text-center py-6 text-slate-400 text-xs font-mono">Loading Google Drive folders...</div>
        ) : folders.length === 0 ? (
          <div className="text-center py-6 space-y-3">
            <div className="text-slate-400 text-xs">No Google Drive folders found in your account.</div>
            <button
              onClick={() => handleCreateFolderInDrive('Termux_Gemini_Live')}
              disabled={creatingFolder}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all shadow-md"
            >
              {creatingFolder ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Creating Folder on Drive...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 text-white" />
                  <span>➕ Create Live Hosting Folder in Google Drive</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {folders.map((folder) => {
              const isImportingThis = importingFolderId === folder.id;
              const isSelected = selectedFolder?.id === folder.id;
              return (
                <div
                  key={folder.id}
                  className={`bg-slate-950 border ${isSelected ? 'border-amber-500/80 bg-slate-900/90 ring-1 ring-amber-500/30' : 'border-slate-800 hover:border-cyan-800/80'} rounded-xl p-4 transition-all flex flex-col justify-between space-y-3 group`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="p-2 rounded-lg bg-amber-950/60 border border-amber-800/50 text-amber-400 shrink-0">
                      <Folder className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-slate-200 truncate group-hover:text-cyan-300">
                        {folder.name}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        Google Drive Folder
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => handleBrowseFolderFiles(folder.id, folder.name)}
                      className={`flex-1 flex items-center justify-center space-x-1.5 px-3 py-2 ${isSelected ? 'bg-amber-600 text-white font-bold' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'} rounded-lg text-xs transition-all shadow-sm`}
                      title="Fetch & view files inside this folder directly from Drive without live hosting"
                    >
                      <Eye className="w-3.5 h-3.5 text-amber-400" />
                      <span>{isSelected ? 'Viewing Files' : 'Browse Files'}</span>
                    </button>
                    <button
                      onClick={() => handleImportFolder(folder.id, folder.name)}
                      disabled={isImportingThis}
                      className="flex-1 flex items-center justify-center space-x-1.5 px-3 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 text-white font-semibold rounded-lg text-xs transition-all shadow-md"
                      title="Import and host folder contents live on server"
                    >
                      {isImportingThis ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Hosting...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5" />
                          <span>Host Live</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Selected Folder Files Panel */}
        {selectedFolder && (
          <div className="mt-4 p-4 bg-slate-950 border border-amber-500/30 rounded-xl space-y-3 animate-fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Folder className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-slate-200">
                  Files in "{selectedFolder.name}" ({folderFiles.length})
                </span>
                <span className="text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded-full font-mono">
                  Direct Drive View
                </span>
              </div>
              <button
                onClick={() => setSelectedFolder(null)}
                className="text-slate-400 hover:text-white p-1"
                title="Close Folder View"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {loadingFolderFiles ? (
              <div className="py-6 text-center text-xs text-slate-400 font-mono flex items-center justify-center space-x-2">
                <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                <span>Fetching folder contents from Google Drive...</span>
              </div>
            ) : folderFiles.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-500">
                No files found inside folder "{selectedFolder.name}".
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
                {folderFiles.map((f) => (
                  <div key={f.id} className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-between hover:border-slate-700 transition-colors">
                    <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                      {getFileIcon(f.mimeType)}
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-slate-200 truncate">{f.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{formatSize(f.size)}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 shrink-0">
                      <button
                        onClick={() => handleImportFile(f.id, f.name)}
                        className="px-2 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-[10px] font-semibold transition-colors"
                        title="Deploy this file live"
                      >
                        Host Live
                      </button>
                      {f.webViewLink && (
                        <a
                          href={f.webViewLink}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 text-slate-400 hover:text-emerald-400 transition-colors"
                          title="Open in Google Drive"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search files in Google Drive..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-colors"
        >
          Search
        </button>
      </form>

      {/* Drive File List Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/50 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          <span>Drive Files ({files.length})</span>
          <span>User: <strong className="text-slate-200 font-mono">{user.email}</strong></span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
            <p className="text-xs font-mono">Fetching files from Google Drive...</p>
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-16 text-slate-500 space-y-2">
            <HardDrive className="w-10 h-10 mx-auto text-slate-700" />
            <p className="text-sm font-medium text-slate-400">No Google Drive files found</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Create a new note or upload a file using the "New File to Drive" button above.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {files.map((file) => {
              const isImportingThisFile = importingFileId === file.id;
              return (
                <div 
                  key={file.id} 
                  className="px-5 py-3.5 flex items-center justify-between hover:bg-slate-800/50 transition-colors group"
                >
                  <div className="flex items-center space-x-3 min-w-0 pr-4">
                    <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 shrink-0">
                      {getFileIcon(file.mimeType)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-200 truncate group-hover:text-emerald-300 transition-colors">
                        {file.name}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center space-x-3 mt-0.5">
                        <span>{file.mimeType.split('.').pop() || 'file'}</span>
                        <span>•</span>
                        <span>{formatSize(file.size)}</span>
                        {file.modifiedTime && (
                          <>
                            <span>•</span>
                            <span>Updated {new Date(file.modifiedTime).toLocaleDateString()}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      onClick={() => handleImportFile(file.id, file.name)}
                      disabled={isImportingThisFile}
                      className="px-3 py-1.5 bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 hover:text-white rounded-lg text-xs font-semibold font-mono transition-all flex items-center space-x-1"
                      title="Host this Google Drive file live on the server"
                    >
                      {isImportingThisFile ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Upload className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                      <span>{isImportingThisFile ? 'Deploying...' : '⚡ Host Live'}</span>
                    </button>

                    {file.webViewLink && (
                      <a
                        href={file.webViewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors"
                        title="Open in Google Drive"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    <button
                      onClick={() => setFileToDelete(file)}
                      className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
                      title="Delete file"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create New File Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Upload className="w-5 h-5 text-emerald-400" />
                <span>Create File in Google Drive</span>
              </h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateFile} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">File Name</label>
                <input
                  type="text"
                  required
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  placeholder="e.g., termux_script.py"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">File Content</label>
                <textarea
                  rows={6}
                  value={newFileContent}
                  onChange={(e) => setNewFileContent(e.target.value)}
                  placeholder="Write your text or script content here..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm font-mono text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition-all shadow-md flex items-center space-x-2"
                >
                  {creating ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving to Drive...</span>
                    </>
                  ) : (
                    <span>Save to Google Drive</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mandatory Destructive Confirmation Modal for Deletion */}
      {fileToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-red-900/50 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-red-400">
              <div className="p-2 bg-red-950 border border-red-800 rounded-xl">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Delete File Confirmation</h3>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-white font-mono">{fileToDelete.name}</strong> from your Google Drive?
            </p>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setFileToDelete(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirmed}
                disabled={deleting}
                className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold transition-all shadow-md flex items-center space-x-1.5"
              >
                {deleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
