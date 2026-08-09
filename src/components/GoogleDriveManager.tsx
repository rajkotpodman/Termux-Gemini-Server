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
  Image as ImageIcon
} from 'lucide-react';
import { GoogleUser } from '../types';

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

  const fetchDriveFolders = async () => {
    if (!user) return;
    setLoadingFolders(true);
    try {
      const res = await fetch('/api/drive/folders');
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        setFolders(data.folders || []);
      }
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
      let url = '/api/drive/files';
      if (queryStr.trim()) {
        url += `?q=${encodeURIComponent(queryStr.trim())}`;
      }
      const res = await fetch(url);
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        setFiles(data.files || []);
      } else if (contentType.includes('application/json')) {
        const data = await res.json();
        if (res.status === 401) {
          setError('Google authentication required. Please click "Sign in with Google" to authenticate.');
        } else {
          setError(data.error || data.message || 'Failed to fetch Google Drive files.');
        }
      } else {
        setError(`Server returned non-JSON response (${res.status}). Ensure you are signed in.`);
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
      const res = await fetch('/api/drive/import-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId }),
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setDeploySuccess(`🚀 ${data.message}`);
        setTimeout(() => setDeploySuccess(null), 6000);
      } else {
        setError(data.message || data.error || 'Failed to deploy folder from Google Drive');
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
      const res = await fetch('/api/drive/import-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId, fileName }),
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setDeploySuccess(`⚡ Successfully deployed "${data.filename}" live! Stream link: ${data.liveUrl}`);
        setTimeout(() => setDeploySuccess(null), 6000);
      } else {
        setError(data.message || data.error || 'Failed to deploy file');
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
      const res = await fetch('/api/drive/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newFileName.trim(),
          content: newFileContent,
          mimeType: 'text/plain'
        })
      });

      const data = await res.json();
      if (res.ok) {
        setIsCreateOpen(false);
        setNewFileName('Termux_Gemini_Notes.txt');
        setNewFileContent('');
        fetchDriveFiles(searchQuery);
      } else {
        if (res.status === 401) {
          setError('Google authentication expired or required. Please sign in with Google.');
        } else {
          setError(data.error || 'Failed to create file in Google Drive');
        }
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
      const res = await fetch(`/api/drive/files/${fileToDelete.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok) {
        setDeleteSuccess(`Successfully removed "${fileToDelete.name}" from Google Drive.`);
        setTimeout(() => setDeleteSuccess(null), 4000);
        setFileToDelete(null);
        fetchDriveFiles(searchQuery);
      } else {
        if (res.status === 401) {
          setError('Google authentication expired or required. Please sign in with Google.');
        } else {
          setError(data.error || 'Failed to delete file.');
        }
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
            onClick={onLoginRequest}
            className="inline-flex items-center space-x-2 px-6 py-3 bg-white hover:bg-slate-100 text-slate-900 font-semibold rounded-xl text-sm transition-all shadow-md"
          >
            <LogIn className="w-4 h-4 text-slate-900" />
            <span>Sign in with Google</span>
          </button>
          <button
            onClick={() => window.open(window.location.href, '_blank')}
            className="inline-flex items-center space-x-2 px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium rounded-xl text-sm transition-all"
            title="Open application in a full browser tab for seamless Google OAuth login"
          >
            <ExternalLink className="w-4 h-4 text-slate-400" />
            <span>Open in New Tab</span>
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
          <div className="text-center py-6 text-slate-500 text-xs">No Google Drive folders found in your account.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {folders.map((folder) => {
              const isImportingThis = importingFolderId === folder.id;
              return (
                <div
                  key={folder.id}
                  className="bg-slate-950 border border-slate-800 hover:border-cyan-800/80 rounded-xl p-4 transition-all flex flex-col justify-between space-y-3 group"
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

                  <button
                    onClick={() => handleImportFolder(folder.id, folder.name)}
                    disabled={isImportingThis}
                    className="w-full flex items-center justify-center space-x-1.5 px-3 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 text-white font-semibold rounded-lg text-xs transition-all shadow-md"
                  >
                    {isImportingThis ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Deploying Folder to Server...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5" />
                        <span>🚀 Host Folder Live on Net</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
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
