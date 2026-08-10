import React, { useState, useEffect } from 'react';
import {
  Terminal,
  Code2,
  Play,
  Smartphone,
  Activity,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Layers,
  ShieldCheck,
  LogIn,
  LogOut,
  User,
  HelpCircle,
  HardDrive,
  FolderPlus,
  Video,
  X,
  QrCode,
  Globe,
  Power,
} from 'lucide-react';
import { CodeViewer } from './components/CodeViewer';
import { TermuxGuide } from './components/TermuxGuide';
import { ApiPlayground } from './components/ApiPlayground';
import { ClientSnippets } from './components/ClientSnippets';
import { GoogleDriveManager } from './components/GoogleDriveManager';
import { LocalFolderDeployer } from './components/LocalFolderDeployer';
import { SyncthingRcloneManager } from './components/SyncthingRcloneManager';
import { ServerPowerControl } from './components/ServerPowerControl';
import { LanguageSelector } from './components/LanguageSelector';
import { HelpDialog } from './components/HelpDialog';
import { ApkBuildCenter } from './components/ApkBuildCenter';
import { LanguageProvider, useTranslation } from './lib/i18n';
import { HealthStatus, GoogleUser } from './types';
import { 
  signInWithFirebaseGoogle, 
  signInWithFirebaseRedirectMode,
  signInWithDirectGoogleOAuth,
  checkFirebaseRedirectResult,
  logoutFirebase, 
  onAuthStateChanged, 
  auth 
} from './lib/firebase';

function MainAppContent() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'sync' | 'folder' | 'code' | 'guide' | 'tester' | 'clients' | 'drive' | 'apk'>('sync');
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isServerOnline, setIsServerOnline] = useState(true);
  const [qrTarget, setQrTarget] = useState<{ url: string; title: string } | null>(null);
  const [authErrorModal, setAuthErrorModal] = useState<{
    code?: string;
    message?: string;
    domain?: string;
  } | null>(null);

  const checkHealth = async () => {
    setHealthLoading(true);
    try {
      const res = await fetch('/api/health');
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        setHealth(data);
        if (typeof data.isServerOnline === 'boolean') {
          setIsServerOnline(data.isServerOnline);
        }
      } else {
        setHealth(null);
      }
    } catch {
      setHealth(null);
    } finally {
      setHealthLoading(false);
    }
  };

  const fetchAuthUser = async (): Promise<GoogleUser | null> => {
    try {
      const res = await fetch('/api/auth/me');
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.user) {
          setUser(data.user);
          localStorage.setItem('google_user', JSON.stringify(data.user));
          return data.user;
        } else {
          setUser(null);
          localStorage.removeItem('google_user');
          return null;
        }
      }
    } catch (e) {
      console.error('Failed to fetch auth state', e);
    }
    return null;
  };

  useEffect(() => {
    checkHealth();
    fetchAuthUser();

    // Check if user just returned from a full-page Google Auth redirect
    checkFirebaseRedirectResult().then((res) => {
      if (res?.user) {
        const userPayload: GoogleUser = {
          id: res.user.id,
          email: res.user.email || '',
          name: res.user.name || '',
          picture: res.user.picture || '',
        };
        setUser(userPayload);
        localStorage.setItem('google_user', JSON.stringify(userPayload));
      }
    }).catch((err) => {
      console.warn('Redirect check notice:', err);
    });

    // Listen to Firebase auth state changes for automatic session restoration
    const unsubscribeFirebase = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const userPayload: GoogleUser = {
          id: fbUser.uid,
          email: fbUser.email || '',
          name: fbUser.displayName || '',
          picture: fbUser.photoURL || '',
        };
        setUser(userPayload);
        localStorage.setItem('google_user', JSON.stringify(userPayload));
      }
    });

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GOOGLE_AUTH_SUCCESS' && event.data?.user) {
        setUser(event.data.user);
        localStorage.setItem('google_user', JSON.stringify(event.data.user));
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
      unsubscribeFirebase();
    };
  }, []);

  const handleGoogleLogin = async () => {
    setAuthLoading(true);
    setAuthErrorModal(null);

    // If hosted on GitHub Pages or custom domain, default directly to Direct Google OAuth
    if (window.location.hostname.endsWith('github.io')) {
      signInWithDirectGoogleOAuth();
      return;
    }

    try {
      // Primary Method: Firebase Popup Sign-In with Google Drive Scopes
      const result = await signInWithFirebaseGoogle();
      if (result.user) {
        const userPayload: GoogleUser = {
          id: result.user.id,
          email: result.user.email || '',
          name: result.user.name || '',
          picture: result.user.picture || '',
        };
        setUser(userPayload);
        localStorage.setItem('google_user', JSON.stringify(userPayload));
      }
    } catch (firebaseErr: any) {
      const code = firebaseErr?.code || 'auth/popup-failed';
      const message = firebaseErr?.message || 'Google sign-in popup closed or restricted.';
      const domain = window.location.hostname;

      console.warn('Google Sign-In notice:', code, message);

      // On unauthorized domain error, immediately fallback to Direct Google OAuth
      if (code === 'auth/unauthorized-domain' || code === 'auth/popup-blocked') {
        signInWithDirectGoogleOAuth();
        return;
      }

      // Try secondary backend URL if available
      try {
        const res = await fetch('/api/auth/google/url');
        const data = await res.json();
        if (data.authUrl) {
          window.open(data.authUrl, 'GoogleLogin', 'width=550,height=650');
          setAuthLoading(false);
          return;
        }
      } catch {}

      // Otherwise fallback to direct Google OAuth
      signInWithDirectGoogleOAuth();
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutFirebase();
    } catch {}
    setUser(null);
    localStorage.removeItem('google_user');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Top Header Navbar */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50 backdrop-blur-md bg-opacity-90">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-emerald-500/20">
              <Terminal className="w-5 h-5 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base font-bold text-slate-100 tracking-tight">{t('appTitle')}</h1>
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                    isServerOnline
                      ? 'bg-emerald-950 text-emerald-400 border-emerald-800/80'
                      : 'bg-rose-950 text-rose-400 border-rose-800/80'
                  }`}
                >
                  {isServerOnline ? '24/7 ONLINE' : 'SHUTDOWN'}
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">{t('appSubtitle')}</p>
            </div>
          </div>

          {/* Controls, Language Selector & Google Auth */}
          <div className="flex items-center space-x-2.5">
            {/* Multi-Language Switcher */}
            <LanguageSelector />

            {user ? (
              <div className="flex items-center space-x-2.5 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5">
                {user.picture ? (
                  <img src={user.picture} alt={user.name} className="w-6 h-6 rounded-full border border-slate-700" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center text-xs font-bold text-white">
                    {user.name?.[0] || 'G'}
                  </div>
                )}
                <div className="text-xs hidden md:block text-left">
                  <div className="font-semibold text-slate-200">{user.name}</div>
                  <div className="text-[10px] text-slate-400 truncate max-w-[100px]">{user.email}</div>
                </div>
                <button
                  id="btn-google-logout"
                  onClick={handleLogout}
                  className="text-slate-400 hover:text-red-400 transition-colors p-1"
                  title={t('logout')}
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                id="btn-google-login"
                onClick={handleGoogleLogin}
                disabled={authLoading}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-900 font-medium rounded-xl text-xs transition-colors shadow-sm font-sans"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span className="hidden sm:inline">{authLoading ? '...' : t('loginWithGoogle')}</span>
              </button>
            )}

            <button
              id="btn-how-to-use"
              onClick={() => setIsHelpOpen(true)}
              className="flex items-center space-x-1 text-xs font-semibold bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-300 px-2.5 py-1.5 rounded-xl transition-all shadow-sm"
              title={t('howToUse')}
            >
              <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">{t('howToUse')}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* 24/7 Persistent Server Control & Internet Live URLs Engine Banner */}
        <ServerPowerControl onStatusChange={(online) => setIsServerOnline(online)} setQrTarget={setQrTarget} />

        {/* Navigation Tabs */}
        <div className="border-b border-slate-800 flex overflow-x-auto space-x-1 scrollbar-none">
          <button
            id="tab-nav-sync"
            onClick={() => setActiveTab('sync')}
            className={`flex items-center space-x-2 px-5 py-3 border-b-2 font-medium text-sm transition-all whitespace-nowrap ${
              activeTab === 'sync'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <RefreshCw className={`w-4 h-4 text-indigo-400 ${activeTab === 'sync' ? 'animate-spin-slow' : ''}`} />
            <span>🔄 24/7 Folder Sync Manager</span>
            <span className="text-[10px] bg-indigo-950 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-800">
              SYNCTHING
            </span>
          </button>

          <button
            id="tab-nav-folder"
            onClick={() => setActiveTab('folder')}
            className={`flex items-center space-x-2 px-5 py-3 border-b-2 font-medium text-sm transition-all whitespace-nowrap ${
              activeTab === 'folder'
                ? 'border-cyan-500 text-cyan-400 bg-cyan-500/5 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <FolderPlus className="w-4 h-4 text-cyan-400" />
            <span>📁 {t('tabDeployer')}</span>
          </button>

          <button
            id="tab-nav-code"
            onClick={() => setActiveTab('code')}
            className={`flex items-center space-x-2 px-5 py-3 border-b-2 font-medium text-sm transition-all whitespace-nowrap ${
              activeTab === 'code'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>{t('tabCode')}</span>
          </button>

          <button
            id="tab-nav-guide"
            onClick={() => setActiveTab('guide')}
            className={`flex items-center space-x-2 px-5 py-3 border-b-2 font-medium text-sm transition-all whitespace-nowrap ${
              activeTab === 'guide'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>{t('tabGuide')}</span>
          </button>

          <button
            id="tab-nav-tester"
            onClick={() => setActiveTab('tester')}
            className={`flex items-center space-x-2 px-5 py-3 border-b-2 font-medium text-sm transition-all whitespace-nowrap ${
              activeTab === 'tester'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <Play className="w-4 h-4" />
            <span>{t('tabTester')}</span>
          </button>

          <button
            id="tab-nav-clients"
            onClick={() => setActiveTab('clients')}
            className={`flex items-center space-x-2 px-5 py-3 border-b-2 font-medium text-sm transition-all whitespace-nowrap ${
              activeTab === 'clients'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>{t('tabClients')}</span>
          </button>

          <button
            id="tab-nav-drive"
            onClick={() => setActiveTab('drive')}
            className={`flex items-center space-x-2 px-5 py-3 border-b-2 font-medium text-sm transition-all whitespace-nowrap ${
              activeTab === 'drive'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <HardDrive className="w-4 h-4" />
            <span>{t('tabDrive')}</span>
          </button>

          <button
            id="tab-nav-apk"
            onClick={() => setActiveTab('apk')}
            className={`flex items-center space-x-2 px-5 py-3 border-b-2 font-medium text-sm transition-all whitespace-nowrap ${
              activeTab === 'apk'
                ? 'border-cyan-500 text-cyan-400 bg-cyan-500/5 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <Smartphone className="w-4 h-4 text-cyan-400" />
            <span>📱 Android APK Center</span>
            <span className="text-[10px] bg-cyan-950 text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-800">
              BUILD
            </span>
          </button>
        </div>

        {/* Tab Content Panels */}
        <div className="pb-6">
          {activeTab === 'sync' && <SyncthingRcloneManager />}
          {activeTab === 'folder' && <LocalFolderDeployer user={user} onOpenHelp={() => setIsHelpOpen(true)} />}
          {activeTab === 'code' && <CodeViewer />}
          {activeTab === 'guide' && <TermuxGuide />}
          {activeTab === 'tester' && <ApiPlayground />}
          {activeTab === 'clients' && <ClientSnippets />}
          {activeTab === 'drive' && <GoogleDriveManager user={user} onLoginRequest={handleGoogleLogin} />}
          {activeTab === 'apk' && <ApkBuildCenter />}
        </div>

        {/* Action Buttons */}
        <div className="pt-4 pb-8 flex flex-wrap items-center justify-center gap-4">
          <button className="pro-btn btn-buy-pro" onClick={() => window.open('https://wa.me/919898048483', '_blank')}>⚡ BUY NOW PRO (APPOINTMENT)</button>
          <button className="pro-btn btn-donate" onClick={() => window.open('https://docs.google.com/forms/d/e/1FAIpQLScJ7WjuxEXqdoSlUtxN7NQ8UeKpbEAeA9iIO-IXOmBmYzlLHQ/viewform?usp=sharing&ouid=116676179363878319046', '_blank')}>🪙 DONATION SYSTEM</button>
          <button className="pro-btn btn-store" onClick={() => window.open('https://wa.me/c/919898048483', '_blank')}>🛒 OFFICIAL DIGITAL STORE</button>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Official Google GenAI SDK (<code className="text-slate-400">google-genai</code>)</span>
          </div>
          <div className="font-mono text-slate-400">
            Host: <span className="text-slate-200">0.0.0.0</span> | Port: <span className="text-slate-200">3000</span> | Model: <span className="text-emerald-400">gemini-3.6-flash</span>
          </div>
        </div>
      </footer>

      {/* Help Modal */}
      <HelpDialog isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />

      {/* Google Auth Assistance Modal */}
      {authErrorModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl relative text-left">
            <button
              onClick={() => setAuthErrorModal(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center space-x-3">
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Google Sign-In Popup Issue</h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Code: {authErrorModal.code || 'popup_closed'}
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300 leading-relaxed space-y-2">
              <p className="font-semibold text-amber-300">Why did the popup close immediately?</p>
              <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px]">
                <li><strong className="text-slate-200">Browser Popup Restrictions:</strong> Embedded previews and mobile browsers block popups or cross-origin cookies.</li>
                <li><strong className="text-slate-200">Firebase Authorized Domain:</strong> If hosted on <code className="text-emerald-400">{authErrorModal.domain}</code>, add this domain in Firebase Console &rarr; Auth &rarr; Settings &rarr; Authorized Domains.</li>
              </ul>
            </div>

            <div className="space-y-2 pt-1">
              <button
                onClick={() => {
                  setAuthErrorModal(null);
                  signInWithDirectGoogleOAuth();
                }}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs transition-all shadow-md flex items-center justify-center space-x-2"
              >
                <LogIn className="w-4 h-4" />
                <span>🚀 Direct Google Sign-In</span>
              </button>

              <button
                onClick={() => {
                  window.open(window.location.href, '_blank');
                }}
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl font-medium text-xs transition-all flex items-center justify-center space-x-2"
              >
                <Globe className="w-3.5 h-3.5 text-slate-400" />
                <span>Open Site in New Tab</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Sharing Modal */}
      {qrTarget && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl relative text-center">
            <button
              onClick={() => setQrTarget(null)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-white rounded-lg bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex justify-center">
              <div className="p-3 bg-cyan-950/80 border border-cyan-800/80 rounded-2xl">
                <QrCode className="w-8 h-8 text-cyan-400" />
              </div>
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-100 font-mono">{qrTarget.title}</h3>
              <p className="text-xs text-slate-400 mt-1">Scan with any smartphone camera or smart TV to open live stream.</p>
            </div>

            <div className="bg-white p-4 rounded-xl inline-block shadow-lg border border-slate-200">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrTarget.url)}`}
                alt="Live URL QR Code"
                className="w-48 h-48 mx-auto"
              />
            </div>

            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-[11px] font-mono text-cyan-300 break-all">
              {qrTarget.url}
            </div>

            <button
              onClick={() => {
                navigator.clipboard.writeText(qrTarget.url);
                alert('Copied link to clipboard!');
              }}
              className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-mono text-xs font-semibold"
            >
              Copy Stream Link
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <MainAppContent />
    </LanguageProvider>
  );
}
