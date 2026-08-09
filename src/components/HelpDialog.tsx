import React, { useState } from 'react';
import {
  X,
  HelpCircle,
  Terminal,
  Play,
  Code2,
  Smartphone,
  Zap,
  CheckCircle2,
  FolderPlus,
  Radio,
  QrCode,
  ListVideo,
  Download,
  Link2,
  Search,
  Copy,
  Cpu,
  Layers,
  ShieldCheck,
  Globe,
  Sparkles,
  BookOpen,
  ChevronRight,
  Tv,
  Film,
  PackageCheck,
  Power,
  HardDrive,
  RefreshCw,
  Server,
  Key,
  Shield,
  Activity,
  Wifi,
  ExternalLink
} from 'lucide-react';
import { useTranslation } from '../lib/i18n';

interface HelpDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpDialog: React.FC<HelpDialogProps> = ({ isOpen, onClose }) => {
  const { t, language } = useTranslation();
  const [activeTab, setActiveTab] = useState<'overview' | 'basic' | 'intermediate' | 'advanced' | 'faq'>('overview');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div
        className="relative w-full max-w-5xl max-h-[92vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-inner">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  {t('howToUse')} - Comprehensive Master Guide
                </h2>
                <span className="bg-cyan-950 text-cyan-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-cyan-800 uppercase">
                  v3.0 Master Manual
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Complete documentation for 24/7 background server, local streaming, remote batching, M3U IPTV, Google Drive & Termux setup.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Level Tabs */}
        <div className="flex items-center space-x-2 px-6 py-3 bg-slate-950/50 border-b border-slate-800 overflow-x-auto scrollbar-none shrink-0">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/30'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <span className="px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 text-[10px] font-mono border border-cyan-800">
              📌 OVERVIEW
            </span>
            <span>System Architecture & 24/7 Power</span>
          </button>

          <button
            onClick={() => setActiveTab('basic')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all whitespace-nowrap ${
              activeTab === 'basic'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 text-[10px] font-mono border border-emerald-800">
              🟢 BASIC
            </span>
            <span>1. Local Video Deployment</span>
          </button>

          <button
            onClick={() => setActiveTab('intermediate')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all whitespace-nowrap ${
              activeTab === 'intermediate'
                ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/30'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <span className="px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 text-[10px] font-mono border border-cyan-800">
              🔵 INTERMEDIATE
            </span>
            <span>2. Batch Fetcher & M3U Playlist</span>
          </button>

          <button
            onClick={() => setActiveTab('advanced')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all whitespace-nowrap ${
              activeTab === 'advanced'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/30'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <span className="px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 text-[10px] font-mono border border-purple-800">
              🟣 ADVANCED
            </span>
            <span>3. Termux Setup & APK Build</span>
          </button>

          <button
            onClick={() => setActiveTab('faq')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all whitespace-nowrap ${
              activeTab === 'faq'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/30'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <span className="px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 text-[10px] font-mono border border-amber-800">
              ⚡ EXPERT
            </span>
            <span>4. Google Drive & Troubleshooting</span>
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm text-slate-300 leading-relaxed">

          {/* TAB 0: SYSTEM OVERVIEW & 24/7 POWER ENGINE */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="p-5 rounded-2xl bg-gradient-to-r from-cyan-950/80 via-slate-900 to-slate-900 border border-cyan-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="bg-cyan-500 text-slate-950 text-[11px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wide">
                    📌 SYSTEM ARCHITECTURE & 24/7 PERSISTENT POWER ENGINE
                  </span>
                  <span className="text-cyan-400 text-xs font-mono">Port 3000 • Express + Flask Proxy</span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">
                  Welcome to the <strong>Termux Gemini Server & Media Host</strong> master control system. This platform transforms your Android smartphone, computer, or cloud VM into a high-performance 24/7 background media streaming server and AI microservice endpoint.
                </p>
              </div>

              {/* Core System Features Grid */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center space-x-2 text-cyan-400 font-bold text-sm">
                    <Power className="w-4 h-4 text-emerald-400" />
                    <span>24/7 One-Time Server Start & Background Mode</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Once started, the Express server stays running continuously in the background. Even if you refresh or close your browser, your live media streams and Gemini API endpoints remain active. When you open the app again, simply click the <strong>Shutdown Server</strong> button if you wish to pause background activity.
                  </p>
                </div>

                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center space-x-2 text-cyan-400 font-bold text-sm">
                    <Globe className="w-4 h-4 text-cyan-400" />
                    <span>Global Internet Live Stream & Local Wi-Fi Access</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    The platform automatically exposes two live endpoints:
                  </p>
                  <ul className="text-[11px] text-slate-300 space-y-1 list-disc pl-4 font-mono">
                    <li><strong>Global Internet URL:</strong> Watch your streams or trigger AI from anywhere across the globe.</li>
                    <li><strong>Local Wi-Fi Network LAN URL:</strong> Direct high-speed streaming for Smart TVs, tablets, and phones on your home Wi-Fi.</li>
                  </ul>
                </div>

                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center space-x-2 text-cyan-400 font-bold text-sm">
                    <Languages className="w-4 h-4 text-purple-400" />
                    <span>10 Popular Global Languages Supported</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Instantly toggle between 10 languages: English (🇺🇸), Hindi (🇮🇳), Spanish (🇪🇸), French (🇫🇷), German (🇩🇪), Arabic (🇸🇦), Chinese (🇨🇳), Portuguese (🇧🇷), Russian (🇷🇺), and Bengali (🇧🇩).
                  </p>
                </div>

                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center space-x-2 text-cyan-400 font-bold text-sm">
                    <Cpu className="w-4 h-4 text-amber-400" />
                    <span>Google Gemini 3.6 Flash AI Engine</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Integrates the modern <code className="text-amber-300 font-mono">@google/genai</code> SDK for instant zero-latency AI text generation, media metadata analysis, and automated playlist categorization.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: BASIC LEVEL */}
          {activeTab === 'basic' && (
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900 border border-emerald-500/30 space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="bg-emerald-500 text-slate-950 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                    🟢 LEVEL 1: LOCAL MEDIA DEPLOYMENT
                  </span>
                  <span className="text-emerald-400 text-xs font-medium">Instant Local Folder Deployer & Wi-Fi Streaming</span>
                </div>
                <p className="text-xs text-slate-300">
                  📁 Turn any video folder on your phone, laptop, or computer into a live media streaming server in seconds with zero complicated setup!
                </p>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center space-x-2 border-b border-slate-800 pb-2">
                  <FolderPlus className="w-4 h-4 text-emerald-400" />
                  <span>How to Stream Local Videos Step-by-Step 🎬</span>
                </h3>

                <div className="grid gap-3">
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
                    <div className="flex items-center space-x-2">
                      <span className="w-6 h-6 rounded-full bg-emerald-900 text-emerald-300 text-xs font-bold flex items-center justify-center shrink-0">1</span>
                      <h4 className="font-semibold text-slate-100 text-sm">📁 Step 1: Click "Select Local Folder" or "Choose Media File"</h4>
                    </div>
                    <p className="text-xs text-slate-400 pl-8">
                      Navigate to the <strong>📁 Select Folder & Live Deploy</strong> tab. Click the large cyan folder button and pick any folder containing your movie, video, or music files (<code className="text-emerald-300 font-mono">.mp4, .mkv, .avi, .webm, .mp3</code>).
                    </p>
                  </div>

                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
                    <div className="flex items-center space-x-2">
                      <span className="w-6 h-6 rounded-full bg-emerald-900 text-emerald-300 text-xs font-bold flex items-center justify-center shrink-0">2</span>
                      <h4 className="font-semibold text-slate-100 text-sm">⚡ Step 2: High-Speed Upload & Instant Live Streaming</h4>
                    </div>
                    <p className="text-xs text-slate-400 pl-8">
                      The files will automatically sync to your server. The built-in Express engine uses <strong>HTTP 206 Byte-Range Chunking</strong> so you can play and seek forward/backward instantly without buffering!
                    </p>
                  </div>

                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
                    <div className="flex items-center space-x-2">
                      <span className="w-6 h-6 rounded-full bg-emerald-900 text-emerald-300 text-xs font-bold flex items-center justify-center shrink-0">3</span>
                      <h4 className="font-semibold text-slate-100 text-sm">📲 Step 3: Scan QR Code or Copy Stream URL for Phone/TV</h4>
                    </div>
                    <p className="text-xs text-slate-400 pl-8">
                      Click the <strong className="text-cyan-400 font-mono">QR</strong> button next to any file or video player. Scan the QR code using your phone camera or Smart TV to stream the video instantly across your local network or internet!
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-950/60 p-4 border border-slate-800 rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Basic Features Included out-of-the-box ✨</span>
                </h4>
                <div className="grid sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 flex items-center space-x-2">
                    <Play className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>In-Browser HTML5 Video Player with Seeking</span>
                  </div>
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 flex items-center space-x-2">
                    <Copy className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>1-Click Stream URL Copying to Clipboard</span>
                  </div>
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 flex items-center space-x-2">
                    <QrCode className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    <span>Instant High-Resolution QR Code Modal</span>
                  </div>
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 flex items-center space-x-2">
                    <Search className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Filter & Search Videos by Name and Format</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: INTERMEDIATE LEVEL */}
          {activeTab === 'intermediate' && (
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/60 via-slate-900 to-slate-900 border border-cyan-500/30 space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="bg-cyan-500 text-slate-950 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                    🔵 LEVEL 2: INTERMEDIATE
                  </span>
                  <span className="text-cyan-400 text-xs font-medium">Remote Stream Fetchers & M3U IPTV Playlists</span>
                </div>
                <p className="text-xs text-slate-300">
                  🌐 Fetch direct stream links from external servers and generate automated M3U playlists for Smart TVs, VLC, MX Player, and Kodi!
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center space-x-2 border-b border-slate-800 pb-2">
                  <Link2 className="w-4 h-4 text-cyan-400" />
                  <span>1. Direct Remote URL Fetcher (Single & Batch Mode) 🚀</span>
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Have direct video URLs from cloud servers, CDNs, or file hosts? Switch between <strong>Single URL</strong> and <strong>Batch Multi-URL</strong> mode in the Advanced Remote Link Direct Fetcher!
                </p>
                <div className="bg-slate-950 p-4 border border-slate-800 rounded-xl space-y-3">
                  <div className="flex items-center space-x-2 text-xs text-amber-300 font-semibold">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Pro Tip: Multi-Link Batch Fetching</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Paste <strong>multiple video URLs</strong> separated by newlines or commas. The server will download and store all of them in background storage automatically!
                  </p>
                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 font-mono text-[11px] text-cyan-300 leading-normal">
                    https://example.com/videos/movie1.mp4<br />
                    https://cdn.server.org/streams/episode2.mkv<br />
                    https://mycloud.io/media/trailer3.webm
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center space-x-2 border-b border-slate-800 pb-2">
                  <ListVideo className="w-4 h-4 text-emerald-400" />
                  <span>2. Downloadable M3U IPTV Playlist (For Smart TVs & VLC) 📺</span>
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Click the green <strong>Download M3U Playlist</strong> button to export a standard <code className="text-emerald-300 font-mono">termux_media_playlist.m3u</code> file for all hosted files.
                </p>
                <div className="grid sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                    <div className="font-semibold text-slate-200 flex items-center space-x-1.5">
                      <Tv className="w-4 h-4 text-cyan-400" />
                      <span>Smart TV / OTT Players</span>
                    </div>
                    <p className="text-[11px] text-slate-400">Import the M3U file into OTT Navigator, IPTV Smarters, or GSE Smart IPTV on your Android TV.</p>
                  </div>
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                    <div className="font-semibold text-slate-200 flex items-center space-x-1.5">
                      <Film className="w-4 h-4 text-emerald-400" />
                      <span>VLC / MX Player</span>
                    </div>
                    <p className="text-[11px] text-slate-400">Open the M3U playlist in VLC Player on PC or mobile to watch all video streams in a continuous channel playlist!</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ADVANCED LEVEL */}
          {activeTab === 'advanced' && (
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/60 via-slate-900 to-slate-900 border border-purple-500/30 space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="bg-purple-500 text-slate-950 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                    🟣 LEVEL 3: ADVANCED DEVELOPER
                  </span>
                  <span className="text-purple-400 text-xs font-medium">Termux Phone Deployment & Android APK Packaging</span>
                </div>
                <p className="text-xs text-slate-300">
                  📱 Turn your old Android phone into a 24/7 dedicated local Gemini AI microserver & media host, or compile this app into an installable <code className="text-purple-300 font-mono">.apk</code> file!
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center space-x-2 border-b border-slate-800 pb-2">
                  <Terminal className="w-4 h-4 text-purple-400" />
                  <span>1. Run Backend on Android Phone via Termux ⚡</span>
                </h3>

                <div className="space-y-2 text-xs">
                  <p className="text-slate-400">Open Termux app on Android and run these commands to start your server locally:</p>
                  <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-cyan-300 space-y-1.5 text-[11px] leading-relaxed">
                    <div className="text-slate-500"># Step A: Update packages and install Node.js & Git</div>
                    <div>pkg update && pkg upgrade -y</div>
                    <div>pkg install nodejs git python -y</div>
                    <br />
                    <div className="text-slate-500"># Step B: Install dependencies</div>
                    <div>npm install</div>
                    <br />
                    <div className="text-slate-500"># Step C: Set Gemini API key & launch server on port 3000</div>
                    <div>export GEMINI_API_KEY="your_api_key_here"</div>
                    <div>npm run dev</div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center space-x-2 border-b border-slate-800 pb-2">
                  <Smartphone className="w-4 h-4 text-cyan-400" />
                  <span>2. Build Standalone Android APK File 📲</span>
                </h3>

                <div className="grid sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
                    <span className="text-[10px] bg-cyan-950 text-cyan-300 px-2 py-0.5 rounded border border-cyan-800 font-mono font-bold block w-fit">
                      CAPACITOR (NATIVE)
                    </span>
                    <h4 className="font-semibold text-slate-100 text-xs">Android Studio APK</h4>
                    <p className="text-[11px] text-slate-400">Uses Capacitor CLI to export React app into an Android Studio project to compile <code className="text-cyan-300">app-debug.apk</code>.</p>
                  </div>

                  <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
                    <span className="text-[10px] bg-purple-950 text-purple-300 px-2 py-0.5 rounded border border-purple-800 font-mono font-bold block w-fit">
                      WEB INTO APP
                    </span>
                    <h4 className="font-semibold text-slate-100 text-xs">1-Click Online APK</h4>
                    <p className="text-[11px] text-slate-400">Copy your live web app URL and paste into WebIntoApp.com to get an APK download link instantly.</p>
                  </div>

                  <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
                    <span className="text-[10px] bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800 font-mono font-bold block w-fit">
                      TERMUX APK
                    </span>
                    <h4 className="font-semibold text-slate-100 text-xs">On-Device Build</h4>
                    <p className="text-[11px] text-slate-400">Use <code className="text-emerald-300 font-mono">termux-create-package</code> inside Termux to build APK directly on phone.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: EXPERT TIPS & TROUBLESHOOTING */}
          {activeTab === 'faq' && (
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/60 via-slate-900 to-slate-900 border border-amber-500/30 space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="bg-amber-500 text-slate-950 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                    ⚡ EXPERT TIPS & GOOGLE DRIVE INTEGRATION
                  </span>
                  <span className="text-amber-400 text-xs font-medium">Performance, Storage & Troubleshooting</span>
                </div>
                <p className="text-xs text-slate-300">
                  💡 Answers to common questions regarding video seeking, Google Drive cloud sync, and server power controls.
                </p>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
                  <h4 className="font-bold text-amber-300 flex items-center space-x-2">
                    <HardDrive className="w-4 h-4 text-purple-400" />
                    <span>How does Google Drive Sync work?</span>
                  </h4>
                  <p className="text-slate-400 leading-relaxed">
                    Click <strong>Sign in with Google</strong> in the top navbar. Navigate to the <strong>Google Drive Storage</strong> tab to stream videos directly from your Google Drive cloud storage or upload local media directly to your drive account.
                  </p>
                </div>

                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
                  <h4 className="font-bold text-amber-300 flex items-center space-x-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span>Q: Why does fast-forward / seeking work smoothly on some videos?</span>
                  </h4>
                  <p className="text-slate-400 leading-relaxed">
                    Our Express backend implements standard <code className="text-cyan-300 font-mono">HTTP 206 Partial Content</code> headers with exact <code className="text-cyan-300 font-mono">Content-Range</code> bytes. Browsers and mobile video players can request specific chunks without downloading the entire video first!
                  </p>
                </div>

                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
                  <h4 className="font-bold text-amber-300 flex items-center space-x-2">
                    <Globe className="w-4 h-4 text-cyan-400" />
                    <span>Q: How do I access this server from another device on the same Wi-Fi?</span>
                  </h4>
                  <p className="text-slate-400 leading-relaxed">
                    Open the <strong>Local Wi-Fi Network LAN URL</strong> displayed in the 24/7 Server Power Control panel (e.g. <code className="text-cyan-300 font-mono">http://192.168.1.100:3000</code>) on your phone or Smart TV browser!
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-400 hidden sm:flex items-center space-x-1 font-mono">
            <span>Server Binding:</span>
            <span className="text-emerald-400 font-semibold">0.0.0.0:3000</span>
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-semibold text-xs rounded-xl transition-all shadow-md hover:shadow-cyan-900/30 font-mono flex items-center space-x-1.5 ml-auto"
          >
            <span>Start Deploying Now!</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Helper icon component for multi-language display
function Languages(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m5 8 6 6" />
      <path d="m4 14 6-6 2-3" />
      <path d="M2 5h12" />
      <path d="M7 2h1" />
      <path d="m22 22-5-10-5 10" />
      <path d="M14 18h6" />
    </svg>
  );
}


