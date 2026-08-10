import React, { useState, useEffect, useRef } from 'react';
import { FolderPlus, Video, Upload, CheckCircle2, Play, Copy, Trash2, Globe, Smartphone, RefreshCw, Layers, ExternalLink, ShieldCheck, Download, AlertCircle, Search, Link2, ListVideo, Sparkles, Radio, QrCode, X, Share2, Plus, LogIn } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from '../lib/i18n';
import { 
  fetchGoogleDriveFolders, 
  createGoogleDriveFolder, 
  getStoredDriveAccessToken, 
  initiateGoogleDriveOAuth 
} from '../lib/gdrive';

interface MediaFile {
  filename: string;
  sizeMb: string;
  bytes: number;
  mimetype: string;
  ext: string;
  created: string;
  liveUrl: string;
}

interface LocalFolderDeployerProps {
  onOpenHelp?: () => void;
}

export const LocalFolderDeployer: React.FC<LocalFolderDeployerProps> = ({ onOpenHelp }) => {
  const { t } = useTranslation();
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<MediaFile | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [apkTab, setApkTab] = useState<'capacitor' | 'webview' | 'termux'>('capacitor');
  const [qrTarget, setQrTarget] = useState<{ url: string; title: string } | null>(null);
  const [qrCopied, setQrCopied] = useState(false);
  const [playerCopied, setPlayerCopied] = useState(false);

  // Advanced Fetcher Filters & Remote Link States
  const [searchQuery, setSearchQuery] = useState('');
  const [formatFilter, setFormatFilter] = useState<string>('ALL');
  const [remoteUrl, setRemoteUrl] = useState('');
  const [remoteBatchUrls, setRemoteBatchUrls] = useState('');
  const [fetchMode, setFetchMode] = useState<'single' | 'batch'>('single');
  const [remoteCustomName, setRemoteCustomName] = useState('');
  const [fetchingRemote, setFetchingRemote] = useState(false);

  // Google Drive Folder Importer State inside Deployer
  const [isDriveFolderModalOpen, setIsDriveFolderModalOpen] = useState(false);
  const [driveFolders, setDriveFolders] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingDriveFolders, setLoadingDriveFolders] = useState(false);
  const [creatingDriveFolder, setCreatingDriveFolder] = useState(false);
  const [driveFolderError, setDriveFolderError] = useState<string | null>(null);
  const [importingDriveFolderId, setImportingDriveFolderId] = useState<string | null>(null);

  const openDriveFolderModal = async () => {
    setIsDriveFolderModalOpen(true);
    setLoadingDriveFolders(true);
    setDriveFolderError(null);
    try {
      const folderList = await fetchGoogleDriveFolders();
      setDriveFolders(folderList.map(f => ({ id: f.id, name: f.name })));
      if (folderList.length === 0 && !getStoredDriveAccessToken()) {
        setDriveFolderError('Google Drive authentication required. Please sign in with Google or create a folder.');
      }
    } catch (err: any) {
      setDriveFolderError(err.message || 'Network error fetching Google Drive folders.');
    } finally {
      setLoadingDriveFolders(false);
    }
  };

  const handleCreateFolderInModal = async (folderName = 'Termux_Gemini_Live') => {
    setCreatingDriveFolder(true);
    setDriveFolderError(null);
    try {
      const newFolder = await createGoogleDriveFolder(folderName);
      if (newFolder) {
        await openDriveFolderModal();
      }
    } catch (err: any) {
      setDriveFolderError(err.message || 'Failed to create folder in Google Drive.');
    } finally {
      setCreatingDriveFolder(false);
    }
  };

  const handleImportDriveFolder = async (folderId: string, folderName: string) => {
    setImportingDriveFolderId(folderId);
    setStatusMsg(`Importing files from Google Drive folder "${folderName}" to live server...`);
    try {
      const accessToken = getStoredDriveAccessToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
        headers['x-google-access-token'] = accessToken;
      }

      const res = await fetch('/api/drive/import-folder', {
        method: 'POST',
        headers,
        body: JSON.stringify({ folderId }),
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setStatusMsg(`✅ ${data.message}`);
        setIsDriveFolderModalOpen(false);
        await fetchDeployedMedia();
      } else {
        setDriveFolderError(data.message || data.error || 'Failed to import Google Drive folder.');
      }
    } catch (err: any) {
      setDriveFolderError(err.message || 'Error deploying Google Drive folder.');
    } finally {
      setImportingDriveFolderId(null);
    }
  };

  const folderInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDeployedMedia = async () => {
    setLoading(true);
    try {
      let res = await fetch('/api/media/list');
      if (!res.ok) {
        res = await fetch('/api/media/deployed');
      }
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        setFiles(data.files || []);
        if (data.files && data.files.length > 0 && !selectedVideo) {
          setSelectedVideo(data.files[0]);
        }
      } else {
        console.warn('Media list endpoint returned non-JSON response', res.status, contentType);
      }
    } catch (err) {
      console.error('Error fetching deployed media:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeployedMedia();
  }, []);

  const handleFileUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    setUploading(true);
    setUploadProgress(10);
    setStatusMsg(`Deploying ${fileList.length} file(s) to live web server...`);

    const formData = new FormData();
    for (let i = 0; i < fileList.length; i++) {
      formData.append('files', fileList[i]);
    }

    try {
      setUploadProgress(40);
      const res = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData,
      });

      setUploadProgress(80);
      const data = await res.json();

      if (res.ok) {
        setUploadProgress(100);
        setStatusMsg(`✅ ${data.message || 'Files auto-deployed live successfully!'}`);
        await fetchDeployedMedia();
      } else {
        setStatusMsg(`❌ Deployment failed: ${data.error || data.message}`);
      }
    } catch (err: any) {
      setStatusMsg(`❌ Upload error: ${err.message}`);
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 2000);
    }
  };

  const handleFetchRemoteUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload =
      fetchMode === 'batch'
        ? { urls: remoteBatchUrls.split(/[\n,]/).map((s) => s.trim()).filter((s) => s.startsWith('http')) }
        : { url: remoteUrl.trim(), customName: remoteCustomName.trim() };

    if (fetchMode === 'single' && !remoteUrl.trim()) return;
    if (fetchMode === 'batch' && (!payload.urls || payload.urls.length === 0)) {
      setStatusMsg('❌ Please paste at least one valid HTTP/HTTPS media URL.');
      return;
    }

    setFetchingRemote(true);
    setStatusMsg(`Fetching and processing remote stream link(s)...`);

    try {
      const res = await fetch('/api/media/fetch-remote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        setStatusMsg(`✅ ${data.message || 'Media streams fetched successfully!'}`);
        setRemoteUrl('');
        setRemoteBatchUrls('');
        setRemoteCustomName('');
        await fetchDeployedMedia();
      } else {
        setStatusMsg(`❌ Remote fetch failed: ${data.error || data.message}`);
      }
    } catch (err: any) {
      setStatusMsg(`❌ Fetch error: ${err.message}`);
    } finally {
      setFetchingRemote(false);
    }
  };

  const handleCopyUrl = (url: string, index: number) => {
    navigator.clipboard.writeText(url);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleDeleteFile = async (filename: string) => {
    if (!confirm(`Are you sure you want to delete ${filename}?`)) return;
    try {
      const res = await fetch(`/api/media/delete/${encodeURIComponent(filename)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        if (selectedVideo?.filename === filename) {
          setSelectedVideo(null);
        }
        fetchDeployedMedia();
      }
    } catch (err) {
      console.error('Failed to delete file:', err);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to clear all deployed videos?')) return;
    try {
      await fetch('/api/media/clear', { method: 'DELETE' });
      setFiles([]);
      setSelectedVideo(null);
    } catch (err) {
      console.error('Failed to clear media:', err);
    }
  };

  // Filtered files logic
  const filteredFiles = files.filter((f) => {
    const matchesSearch = f.filename.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFormat =
      formatFilter === 'ALL' || f.ext.toLowerCase().replace('.', '') === formatFilter.toLowerCase();
    return matchesSearch && matchesFormat;
  });

  const totalBytes = files.reduce((acc, curr) => acc + (curr.bytes || 0), 0);
  const totalMb = (totalBytes / (1024 * 1024)).toFixed(2);

  return (
    <div className="space-y-8">
      {/* Hidden Inputs for Folder and File selection */}
      <input
        type="file"
        ref={folderInputRef}
        onChange={(e) => handleFileUpload(e.target.files)}
        className="hidden"
        // @ts-ignore
        webkitdirectory=""
        directory=""
        multiple
      />
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => handleFileUpload(e.target.files)}
        className="hidden"
        multiple
        accept="video/*,.mkv,.avi,.mp4,.webm,.mov,.flv,.m4v,.mp3"
      />

      {/* Main Deployment Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2 text-cyan-400 font-mono text-xs font-semibold uppercase tracking-wider">
                <Globe className="w-4 h-4" />
                <span>Auto Folder Deployer & Live Streaming Host</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-1">
                Select Local Storage Folder & Stream Live on Net
              </h2>
              <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-3xl leading-relaxed">
                Click <span className="text-cyan-400 font-semibold">Select Local Folder</span> to choose your Android/PC folder containing video files (<code className="text-emerald-400">.mkv, .mp4, .avi, .webm</code>). They are automatically configured, deployed live to the server, and given direct shareable streaming URLs!
              </p>
            </div>

            {/* Folder Selection Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              <button
                id="btn-select-folder-main"
                onClick={() => folderInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center justify-center space-x-2 px-5 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-xl text-sm transition-all shadow-lg hover:shadow-cyan-900/40"
              >
                <FolderPlus className="w-5 h-5" />
                <span>Select Local Folder</span>
              </button>

              <button
                id="btn-select-drive-folder"
                onClick={openDriveFolderModal}
                disabled={uploading}
                className="flex items-center justify-center space-x-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-sm transition-all shadow-lg"
                title="Select folder from your Google Drive account and deploy live to server"
              >
                <Upload className="w-4 h-4 text-white" />
                <span>☁️ Import Google Drive Folder</span>
              </button>

              <button
                id="btn-select-files-secondary"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center justify-center space-x-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium rounded-xl text-sm transition-all"
              >
                <Video className="w-4 h-4 text-cyan-400" />
                <span>Choose Video Files</span>
              </button>
            </div>
          </div>

          {/* Quick Toolbar: M3U Playlist Fetcher, How to Use & Stats */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
            <div className="flex items-center space-x-4 text-xs text-slate-400 font-mono">
              <span className="flex items-center space-x-1.5 text-cyan-300">
                <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span>Total Live Storage: <strong>{totalMb} MB</strong> ({files.length} streams)</span>
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {onOpenHelp && (
                <button
                  onClick={onOpenHelp}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-950/90 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/80 rounded-lg text-xs font-semibold font-mono transition-all shadow-sm"
                  title="Open Master Guide & Documentation"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>How to Use Guide 💡</span>
                </button>
              )}

              <button
                id="btn-show-app-qr"
                onClick={() => setQrTarget({ url: window.location.href, title: 'Termux Live Web App Server' })}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-800/80 rounded-lg text-xs font-semibold font-mono transition-all"
                title="Share App via QR Code"
              >
                <QrCode className="w-3.5 h-3.5 text-cyan-400" />
                <span>App QR Code</span>
              </button>

              {files.length > 0 && (
                <a
                  id="btn-download-m3u-playlist"
                  href="/api/media/playlist.m3u"
                  download="termux_media_playlist.m3u"
                  className="inline-flex items-center space-x-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold font-mono transition-all"
                >
                  <ListVideo className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Download M3U Playlist (VLC / TV Player)</span>
                </a>
              )}
            </div>
          </div>

          {/* Upload Progress Bar */}
          {uploading && (
            <div className="space-y-2 pt-2">
              <div className="flex justify-between text-xs text-slate-300 font-mono">
                <span>Deploying & Configuring Videos...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {statusMsg && (
            <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-cyan-300 font-mono flex items-center justify-between">
              <span>{statusMsg}</span>
              <button onClick={() => setStatusMsg(null)} className="text-slate-500 hover:text-slate-300">✕</button>
            </div>
          )}
        </div>
      </div>

      {/* Advanced Remote Stream Fetcher Tool */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
          <div className="flex items-center space-x-2 text-cyan-400 font-semibold text-sm">
            <Link2 className="w-4 h-4 text-cyan-400" />
            <span>Advanced Remote Link Direct Fetcher</span>
            <span className="text-[10px] bg-cyan-950 text-cyan-300 px-2 py-0.5 rounded border border-cyan-800 font-mono">
              {fetchMode === 'single' ? '🔗 Single Link' : '📦 Multi-URL Batch'}
            </span>
          </div>

          {/* Mode Switcher Pills */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-1 space-x-1">
            <button
              type="button"
              onClick={() => setFetchMode('single')}
              className={`px-3 py-1 rounded text-xs font-mono font-semibold transition-all ${
                fetchMode === 'single'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Single URL
            </button>
            <button
              type="button"
              onClick={() => setFetchMode('batch')}
              className={`px-3 py-1 rounded text-xs font-mono font-semibold transition-all ${
                fetchMode === 'batch'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Batch Multi-URL
            </button>
          </div>
        </div>

        <form onSubmit={handleFetchRemoteUrl} className="space-y-3">
          {fetchMode === 'single' ? (
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="url"
                value={remoteUrl}
                onChange={(e) => setRemoteUrl(e.target.value)}
                placeholder="Paste direct media URL (e.g. https://example.com/video.mp4)..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                required={fetchMode === 'single'}
              />
              <input
                type="text"
                value={remoteCustomName}
                onChange={(e) => setRemoteCustomName(e.target.value)}
                placeholder="Custom Name (optional)"
                className="w-full sm:w-48 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
              />
              <button
                type="submit"
                disabled={fetchingRemote || !remoteUrl.trim()}
                className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-all flex items-center justify-center space-x-2 shrink-0 font-mono"
              >
                <Download className={`w-3.5 h-3.5 ${fetchingRemote ? 'animate-bounce' : ''}`} />
                <span>{fetchingRemote ? 'Fetching Link...' : 'Fetch & Stream'}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <textarea
                value={remoteBatchUrls}
                onChange={(e) => setRemoteBatchUrls(e.target.value)}
                placeholder="Paste multiple direct video links (one URL per line or separated by commas)...&#10;https://example.com/stream1.mp4&#10;https://example.com/stream2.mkv"
                rows={3}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono leading-relaxed"
                required={fetchMode === 'batch'}
              />
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-mono">
                  Multi-thread fetcher will download & host all URLs in background.
                </span>
                <button
                  type="submit"
                  disabled={fetchingRemote || !remoteBatchUrls.trim()}
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-all flex items-center justify-center space-x-2 font-mono"
                >
                  <Download className={`w-3.5 h-3.5 ${fetchingRemote ? 'animate-bounce' : ''}`} />
                  <span>{fetchingRemote ? 'Fetching Batch Links...' : 'Batch Fetch All'}</span>
                </button>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Main Grid: Deployed Files List & Player */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Deployed Media List & Search/Filter Controls */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-900 p-4 border border-slate-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Layers className="w-5 h-5 text-cyan-400" />
                <h3 className="font-semibold text-slate-100 text-sm">
                  Deployed Media Streams ({filteredFiles.length} of {files.length})
                </h3>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={fetchDeployedMedia}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs flex items-center space-x-1"
                  title="Refresh list"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                </button>
                {files.length > 0 && (
                  <button
                    onClick={handleClearAll}
                    className="p-2 bg-rose-950/50 hover:bg-rose-900 border border-rose-800/60 text-rose-300 rounded-lg text-xs flex items-center space-x-1"
                    title="Clear all files"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear</span>
                  </button>
                )}
              </div>
            </div>

            {/* Search Bar & Format Filter Pills */}
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter videos by name..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center space-x-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                {['ALL', 'mp4', 'mkv', 'avi', 'webm', 'mp3'].map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => setFormatFilter(fmt)}
                    className={`px-2.5 py-1 rounded text-[11px] font-mono font-semibold uppercase transition-all ${
                      formatFilter === fmt
                        ? 'bg-cyan-600 text-white'
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {filteredFiles.length === 0 ? (
            <div className="bg-slate-900/60 border border-dashed border-slate-800 rounded-xl p-8 text-center space-y-3">
              <FolderPlus className="w-10 h-10 text-slate-600 mx-auto" />
              <div>
                <h4 className="text-slate-300 font-medium text-sm">No Videos Found</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Click <span className="text-cyan-400 font-semibold">Select Local Folder</span> above to select any folder with <code className="text-slate-400">.mkv, .mp4, .avi</code> files from your device.
                </p>
              </div>
              <button
                onClick={() => folderInputRef.current?.click()}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs rounded-lg transition-colors inline-flex items-center space-x-2"
              >
                <Upload className="w-4 h-4" />
                <span>Select Folder Now</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
              {filteredFiles.map((file, idx) => {
                const isSelected = selectedVideo?.filename === file.filename;
                return (
                  <div
                    key={file.filename}
                    className={`p-4 rounded-xl border transition-all space-y-2 ${
                      isSelected
                        ? 'bg-slate-800/90 border-cyan-500/50 ring-1 ring-cyan-500/30'
                        : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-xs text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800 uppercase font-bold">
                            {file.ext.replace('.', '') || 'VIDEO'}
                          </span>
                          <span className="font-medium text-slate-100 text-sm truncate block" title={file.filename}>
                            {file.filename}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 flex items-center space-x-3">
                          <span>Size: <strong className="text-slate-200">{file.sizeMb} MB</strong></span>
                          <span>•</span>
                          <span className="text-emerald-400 flex items-center space-x-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            <span>Live Net Stream</span>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1 shrink-0">
                        <button
                          onClick={() => setSelectedVideo(file)}
                          className={`p-2 rounded-lg text-xs flex items-center space-x-1 transition-colors ${
                            isSelected
                              ? 'bg-cyan-600 text-white'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                          }`}
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>Play</span>
                        </button>
                        <button
                          onClick={() => handleDeleteFile(file.filename)}
                          className="p-2 hover:bg-rose-950/60 text-slate-500 hover:text-rose-400 rounded-lg text-xs"
                          title="Delete file"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Direct Public Stream URL */}
                    <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between gap-2 text-xs">
                      <span className="text-slate-400 truncate font-mono text-[11px]" title={file.liveUrl}>
                        {file.liveUrl}
                      </span>
                      <div className="flex items-center space-x-1.5 shrink-0">
                        <button
                          onClick={() => setQrTarget({ url: file.liveUrl, title: file.filename })}
                          className="px-2 py-1 bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded font-mono text-[11px] flex items-center space-x-1 transition-colors"
                          title="Generate QR Code"
                        >
                          <QrCode className="w-3 h-3 text-cyan-400" />
                          <span>QR</span>
                        </button>
                        <button
                          onClick={() => handleCopyUrl(file.liveUrl, idx)}
                          className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 text-cyan-300 border border-slate-800 rounded font-mono text-[11px] flex items-center space-x-1"
                        >
                          {copiedIndex === idx ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Live Video Player & Stream Preview */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-emerald-400 font-semibold text-sm">
                <Play className="w-4 h-4" />
                <span>Live Stream Player</span>
              </div>
              {selectedVideo && (
                <span className="text-xs bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded border border-emerald-800 font-mono">
                  HTTP 206 Seek Active
                </span>
              )}
            </div>

            {selectedVideo ? (
              <div className="space-y-3">
                <div className="aspect-video bg-black rounded-xl overflow-hidden border border-slate-800 relative shadow-inner">
                  <video
                    key={selectedVideo.filename}
                    controls
                    autoPlay
                    preload="metadata"
                    className="w-full h-full object-contain"
                  >
                    <source src={selectedVideo.liveUrl} type={selectedVideo.mimetype} />
                    Your browser does not support HTML5 video player.
                  </video>
                </div>
                <div>
                  <h4 className="font-semibold text-slate-100 text-sm truncate">{selectedVideo.filename}</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Size: {selectedVideo.sizeMb} MB | Format: {selectedVideo.ext}
                  </p>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-2 font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[11px]">Live Stream URL:</span>
                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(selectedVideo.liveUrl);
                          setPlayerCopied(true);
                          setTimeout(() => setPlayerCopied(false), 2000);
                        }}
                        className="text-cyan-300 hover:text-white flex items-center space-x-1 text-[11px] bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-800/80 px-2 py-0.5 rounded transition-all font-semibold"
                        title="Copy Live Stream URL to Clipboard"
                      >
                        {playerCopied ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy URL</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => setQrTarget({ url: selectedVideo.liveUrl, title: selectedVideo.filename })}
                        className="text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 text-[11px] bg-slate-900 border border-slate-800 px-2 py-0.5 rounded transition-colors"
                        title="Share via QR Code"
                      >
                        <QrCode className="w-3 h-3" />
                        <span>QR Share</span>
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <a
                      href={selectedVideo.liveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400 hover:underline break-all block text-[11px] flex-1"
                    >
                      {selectedVideo.liveUrl}
                    </a>
                  </div>
                </div>
              </div>
            ) : (
              <div className="aspect-video bg-slate-950 rounded-xl border border-slate-800 flex flex-col items-center justify-center p-6 text-center space-y-2">
                <Video className="w-8 h-8 text-slate-700" />
                <p className="text-xs text-slate-500">
                  Select a video file from the list to start live playback and test HTTP seeking.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* APK Conversion & Standalone Mobile Build Guide */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <Smartphone className="w-6 h-6 text-cyan-400" />
            <div>
              <h3 className="font-bold text-white text-base">Convert Application to Android APK</h3>
              <p className="text-xs text-slate-400">Package this live video streaming server into a standalone Android APK file.</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setApkTab('capacitor')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                apkTab === 'capacitor' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Capacitor APK
            </button>
            <button
              onClick={() => setApkTab('webview')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                apkTab === 'webview' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Web-to-APK Tool
            </button>
            <button
              onClick={() => setApkTab('termux')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                apkTab === 'termux' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Termux On-Device APK
            </button>
          </div>
        </div>

        {apkTab === 'capacitor' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-300 leading-relaxed">
              <strong>Capacitor (Recommended)</strong> wraps this React + Express video application directly into a native Android Studio project to compile an official <code className="text-cyan-400">.apk</code> file!
            </p>

            <div className="space-y-3">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">Step 1: Install Capacitor CLI</span>
                <div className="bg-slate-900 p-2.5 rounded font-mono text-xs text-cyan-300">
                  npm install @capacitor/core @capacitor/cli @capacitor/android
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">Step 2: Initialize & Build Android App</span>
                <div className="bg-slate-900 p-2.5 rounded font-mono text-xs text-cyan-300 space-y-1">
                  <div>npx cap init "TermuxGemini" "com.termux.geminiserver" --web-dir dist</div>
                  <div>npm run build</div>
                  <div>npx cap add android</div>
                  <div>npx cap open android</div>
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">Step 3: Generate APK File in Android Studio</span>
                <p className="text-xs text-slate-300">
                  In Android Studio, click <strong className="text-white">Build &gt; Build Bundle(s) / APK(s) &gt; Build APK(s)</strong>. The compiled <code className="text-emerald-400 font-mono">app-debug.apk</code> will be ready in seconds!
                </p>
              </div>
            </div>
          </div>
        )}

        {apkTab === 'webview' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-300 leading-relaxed">
              Convert the live web URL directly into an Android APK using free 1-click online builders or Android WebView wrappers.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <h4 className="font-semibold text-slate-200 text-sm">1. WebIntoApp / PWABuilder</h4>
                <p className="text-xs text-slate-400">Copy the Live Web App URL and paste it into WebIntoApp.com or PWABuilder.com to download an APK instantly without installing Android Studio.</p>
                <a
                  href="https://www.webintoapp.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1.5 text-xs text-cyan-400 hover:underline pt-1"
                >
                  <span>Open WebIntoApp.com</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <h4 className="font-semibold text-slate-200 text-sm">2. Hermit APK Creator</h4>
                <p className="text-xs text-slate-400">Install Hermit app on Android to turn this server URL into a native, standalone APK icon on your phone home screen.</p>
              </div>
            </div>
          </div>
        )}

        {apkTab === 'termux' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-300 leading-relaxed">
              Build an APK directly inside Termux on your phone using <code className="text-cyan-400">termux-create-package</code> or Python APK packagers!
            </p>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="bg-slate-900 p-3 rounded font-mono text-xs text-cyan-300">
                pkg install python -y && pip install buildapk
              </div>
              <p className="text-xs text-slate-400">Run this inside Termux to package your Flask server and video folder into an installable Android APK file.</p>
            </div>
          </div>
        )}
      </div>

      {/* QR Code Modal Overlay */}
      {qrTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <QrCode className="w-5 h-5 text-cyan-400" />
                <div>
                  <h3 className="font-bold text-white text-base">Device Share QR Code</h3>
                  <p className="text-xs text-slate-400 truncate max-w-[260px]">{qrTarget.title}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setQrTarget(null);
                  setQrCopied(false);
                }}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* QR Code Graphic Container */}
            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="p-4 bg-white rounded-2xl shadow-xl border-4 border-cyan-500/30 flex items-center justify-center">
                <QRCodeSVG
                  value={qrTarget.url}
                  size={200}
                  level="H"
                  includeMargin={true}
                />
              </div>
              <p className="text-xs text-slate-400 text-center max-w-xs leading-relaxed">
                Scan with any Smartphone Camera, Smart TV browser, or VLC Mobile app to access or play this stream directly!
              </p>
            </div>

            {/* URL Display & Quick Actions */}
            <div className="space-y-2">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between gap-2 text-xs font-mono">
                <span className="text-cyan-300 truncate text-[11px]">{qrTarget.url}</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(qrTarget.url);
                    setQrCopied(true);
                    setTimeout(() => setQrCopied(false), 2000);
                  }}
                  className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-[11px] font-semibold shrink-0 flex items-center space-x-1"
                >
                  {qrCopied ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-white" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              <a
                href={qrTarget.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold font-mono flex items-center justify-center space-x-2 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
                <span>Open Stream Link in New Tab</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Google Drive Folder Selector Modal */}
      {isDriveFolderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Upload className="w-5 h-5 text-emerald-400" />
                <span>Select Google Drive Folder to Host Live</span>
              </h3>
              <button onClick={() => setIsDriveFolderModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {driveFolderError && (
              <div className="p-3 bg-red-950/80 border border-red-800 rounded-xl text-xs text-red-300 flex items-center justify-between">
                <span>{driveFolderError}</span>
                <button onClick={() => setDriveFolderError(null)} className="text-red-400">✕</button>
              </div>
            )}

            {loadingDriveFolders ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400 space-y-2">
                <RefreshCw className="w-7 h-7 animate-spin text-emerald-400" />
                <p className="text-xs font-mono">Fetching Google Drive folders...</p>
              </div>
            ) : driveFolders.length === 0 ? (
              <div className="text-center py-6 space-y-4">
                <p className="text-sm text-slate-300">No Google Drive folders found in your account.</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Click below to create a dedicated hosting folder in your Google Drive or re-authenticate.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => handleCreateFolderInModal('Termux_Gemini_Live')}
                    disabled={creatingDriveFolder}
                    className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center space-x-2"
                  >
                    {creatingDriveFolder ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-white" />
                        <span>Creating Folder...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 text-white" />
                        <span>➕ Create Live Folder in Google Drive</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => initiateGoogleDriveOAuth()}
                    className="w-full sm:w-auto px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs rounded-xl transition-all shadow-md flex items-center justify-center space-x-2"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Direct Google Sign-In</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1">
                  <span className="text-xs font-mono text-slate-400">Available Folders ({driveFolders.length})</span>
                  <button
                    type="button"
                    onClick={() => handleCreateFolderInModal('Termux_Gemini_Live')}
                    disabled={creatingDriveFolder}
                    className="px-2.5 py-1 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-800/80 text-emerald-300 rounded-lg text-xs font-semibold flex items-center space-x-1"
                  >
                    {creatingDriveFolder ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    <span>New Live Folder</span>
                  </button>
                </div>
                <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                  {driveFolders.map((folder) => {
                    const isImporting = importingDriveFolderId === folder.id;
                    return (
                      <div
                        key={folder.id}
                        className="p-3 bg-slate-950 border border-slate-800 hover:border-emerald-800 rounded-xl flex items-center justify-between transition-colors"
                      >
                        <div className="flex items-center space-x-3 min-w-0 pr-2">
                          <FolderPlus className="w-5 h-5 text-amber-400 shrink-0" />
                          <span className="text-sm font-semibold text-slate-200 truncate">{folder.name}</span>
                        </div>

                        <button
                          onClick={() => handleImportDriveFolder(folder.id, folder.name)}
                          disabled={isImporting}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white rounded-lg text-xs font-semibold font-mono shadow transition-all shrink-0 flex items-center space-x-1"
                        >
                          {isImporting ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Deploying...</span>
                            </>
                          ) : (
                            <>
                              <Upload className="w-3.5 h-3.5" />
                              <span>Host Folder Live</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsDriveFolderModalOpen(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
