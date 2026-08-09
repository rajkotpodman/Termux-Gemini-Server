import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Download,
  Terminal,
  CheckCircle2,
  Copy,
  ExternalLink,
  Sparkles,
  Layers,
  Code2,
  FileCode,
  ShieldCheck,
  Zap,
  Globe,
  QrCode,
  HelpCircle,
  PackageCheck
} from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const ApkBuildCenter: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [activeTab, setActiveTab] = useState<'pwa' | 'termux' | 'webview' | 'pwabuilder'>('pwa');
  const [copiedScript, setCopiedScript] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert('To install on Android:\n1. Open Chrome menu (3 dots top right)\n2. Tap "Install App" or "Add to Home Screen".');
      return;
    }
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedScript(key);
    setTimeout(() => setCopiedScript(null), 2000);
  };

  // Automated Termux APK Launcher & Server Script
  const termuxApkCommand = `pkg update && pkg install nodejs python git termux-api -y
mkdir -p ~/TermuxServer && cd ~/TermuxServer
cat << 'EOF' > start_app.sh
#!/data/data/com.termux/files/usr/bin/bash
termux-wake-lock
echo "🚀 Starting Termux Gemini 24/7 Live Server..."
node -e "
const http = require('http');
http.createServer((req, res) => {
  res.writeHead(200, {'Content-Type': 'text/html'});
  res.end('<h1>Termux Gemini Server Running Live!</h1>');
}).listen(3000, '0.0.0.0');
" &
termux-open-url "http://localhost:3000"
EOF
chmod +x start_app.sh
./start_app.sh`;

  // Android Studio MainActivity.kt source
  const kotlinWebViewCode = `package com.termux.gemini.server

import android.os.Bundle
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {
    private lateinit var webView: WebView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        webView = WebView(this)
        setContentView(webView)

        val settings: WebSettings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.allowFileAccess = true
        settings.mediaPlaybackRequiresUserGesture = false

        webView.webViewClient = WebViewClient()
        // Replace with your server URL or http://localhost:3000
        val liveServerUrl = "${window.location.origin}"
        webView.loadUrl(liveServerUrl)
    }

    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }
}`;

  // AndroidManifest.xml source
  const manifestXmlCode = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.termux.gemini.server">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="Termux Gemini Server"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:usesCleartextTraffic="true"
        android:theme="@style/Theme.AppCompat.NoActionBar">
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:configChanges="orientation|screenSize">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>`;

  const downloadFullProjectZip = () => {
    window.location.href = '/api/export-project-zip';
  };

  const downloadApkProjectZip = () => {
    downloadFullProjectZip();
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center space-x-2 text-cyan-400 font-mono text-xs font-semibold uppercase tracking-wider">
              <Smartphone className="w-4 h-4" />
              <span>Android APK & WebAPK Build Center</span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Create & Install Native Android APK App
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed">
              Convert your 24/7 Termux Gemini Server into an Android APK app installed directly on your phone home screen with custom icon, splash screen, and offline capabilities.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              onClick={handleInstallClick}
              className="flex items-center justify-center space-x-2 px-5 py-3 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-cyan-900/40 transform hover:-translate-y-0.5"
            >
              <Smartphone className="w-5 h-5" />
              <span>{isInstalled ? '✅ App Installed on Android' : '📱 Install WebAPK on Android'}</span>
            </button>

            <button
              onClick={downloadFullProjectZip}
              className="flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold rounded-xl text-sm transition-all shadow-md shadow-cyan-950"
            >
              <Download className="w-4 h-4 text-white" />
              <span>📦 Download Complete Code Base (.ZIP)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex overflow-x-auto space-x-2 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800">
        <button
          onClick={() => setActiveTab('pwa')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all ${
            activeTab === 'pwa'
              ? 'bg-cyan-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>1. Instant WebAPK (Recommended)</span>
        </button>

        <button
          onClick={() => setActiveTab('pwabuilder')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all ${
            activeTab === 'pwabuilder'
              ? 'bg-cyan-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>2. PWABuilder (Generate .APK)</span>
        </button>

        <button
          onClick={() => setActiveTab('termux')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all ${
            activeTab === 'termux'
              ? 'bg-cyan-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>3. Termux Widget Launcher</span>
        </button>

        <button
          onClick={() => setActiveTab('webview')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all ${
            activeTab === 'webview'
              ? 'bg-cyan-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Code2 className="w-4 h-4" />
          <span>4. Android Studio Code</span>
        </button>
      </div>

      {/* Tab 1: Instant WebAPK */}
      {activeTab === 'pwa' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-lg">
          <div className="flex items-center space-x-3 border-b border-slate-800 pb-4">
            <div className="p-3 bg-cyan-950 border border-cyan-800 rounded-xl text-cyan-400">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Instant WebAPK Install (Zero Compilation Needed)</h3>
              <p className="text-xs text-slate-400">Android builds a real APK on your device through Chrome WebAPK service.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
              <div className="flex items-center space-x-2 text-cyan-400 font-bold text-sm">
                <span className="w-6 h-6 rounded-full bg-cyan-950 border border-cyan-800 flex items-center justify-center text-xs">1</span>
                <span>Open in Mobile Chrome</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Open this app URL in Google Chrome or Brave browser on your Android smartphone.
              </p>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
              <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
                <span className="w-6 h-6 rounded-full bg-emerald-950 border border-emerald-800 flex items-center justify-center text-xs">2</span>
                <span>Tap "Install App"</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Click the 3-dots menu in Chrome top-right corner and select <strong className="text-slate-200">"Install App"</strong> or <strong className="text-slate-200">"Add to Home Screen"</strong>.
              </p>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
              <div className="flex items-center space-x-2 text-amber-400 font-bold text-sm">
                <span className="w-6 h-6 rounded-full bg-amber-950 border border-amber-800 flex items-center justify-center text-xs">3</span>
                <span>Native App Icon</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Android installs a native app icon on your home screen with full screen layout and video streaming support!
              </p>
            </div>
          </div>

          <div className="flex justify-center pt-2">
            <button
              onClick={handleInstallClick}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm transition-all shadow-lg flex items-center space-x-2"
            >
              <Smartphone className="w-5 h-5" />
              <span>Click Here to Trigger Android WebAPK Installation</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab 2: PWABuilder APK Generator */}
      {activeTab === 'pwabuilder' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-lg">
          <div className="flex items-center space-x-3 border-b border-slate-800 pb-4">
            <div className="p-3 bg-indigo-950 border border-indigo-800 rounded-xl text-indigo-400">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Build Signed .APK via PWABuilder</h3>
              <p className="text-xs text-slate-400">Free official tool created by Microsoft & Google to turn PWA into a downloadable .apk file.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3 font-mono text-xs">
              <div className="text-slate-300 font-bold flex items-center justify-between">
                <span>1. Your Live App URL to Enter in PWABuilder:</span>
                <button
                  onClick={() => copyText(window.location.origin, 'app_url')}
                  className="text-cyan-400 hover:text-cyan-300 text-[11px] flex items-center space-x-1"
                >
                  {copiedScript === 'app_url' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedScript === 'app_url' ? 'Copied!' : 'Copy URL'}</span>
                </button>
              </div>
              <div className="p-3 bg-slate-900 border border-slate-800 text-cyan-300 rounded-lg break-all">
                {window.location.origin}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <a
                href={`https://www.pwabuilder.com/?url=${encodeURIComponent(window.location.origin)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-800 rounded-xl text-indigo-200 font-semibold text-sm flex items-center justify-between transition-all group"
              >
                <div className="flex items-center space-x-2">
                  <ExternalLink className="w-5 h-5 text-indigo-400 group-hover:scale-110 transition-transform" />
                  <span>Open PWABuilder.com (Generate .APK)</span>
                </div>
                <span className="text-xs bg-indigo-900 px-2 py-1 rounded text-indigo-300 font-mono">1-Click</span>
              </a>

              <button
                onClick={downloadApkProjectZip}
                className="p-4 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-800 rounded-xl text-cyan-200 font-semibold text-sm flex items-center justify-between transition-all"
              >
                <div className="flex items-center space-x-2">
                  <Download className="w-5 h-5 text-cyan-400" />
                  <span>Download Manifest & Asset Links</span>
                </div>
                <span className="text-xs bg-cyan-900 px-2 py-1 rounded text-cyan-300 font-mono">ZIP / TXT</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Termux Widget Launcher */}
      {activeTab === 'termux' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-lg">
          <div className="flex items-center space-x-3 border-b border-slate-800 pb-4">
            <div className="p-3 bg-emerald-950 border border-emerald-800 rounded-xl text-emerald-400">
              <Terminal className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Automated Termux App Shortcut Script</h3>
              <p className="text-xs text-slate-400">Creates an Android home screen widget shortcut to start the server automatically.</p>
            </div>
          </div>

          <div className="space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between text-slate-300">
              <span>Copy and paste this script into Android Termux:</span>
              <button
                onClick={() => copyText(termuxApkCommand, 'termux_script')}
                className="px-3 py-1 bg-emerald-950 border border-emerald-800 text-emerald-300 hover:text-white rounded-lg flex items-center space-x-1"
              >
                {copiedScript === 'termux_script' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedScript === 'termux_script' ? 'Copied!' : 'Copy Script'}</span>
              </button>
            </div>

            <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-emerald-400 overflow-x-auto leading-relaxed max-h-60">
              {termuxApkCommand}
            </pre>
          </div>
        </div>
      )}

      {/* Tab 4: Android Studio Kotlin Code */}
      {activeTab === 'webview' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-lg">
          <div className="flex items-center space-x-3 border-b border-slate-800 pb-4">
            <div className="p-3 bg-amber-950 border border-amber-800 rounded-xl text-amber-400">
              <Code2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Android Studio WebView Wrapper Source</h3>
              <p className="text-xs text-slate-400">Compile your own native Android APK project in Kotlin using Android Studio.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2 font-mono text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span>MainActivity.kt (Android WebView)</span>
                <button
                  onClick={() => copyText(kotlinWebViewCode, 'kotlin_code')}
                  className="text-amber-400 hover:text-amber-300 flex items-center space-x-1 text-[11px]"
                >
                  {copiedScript === 'kotlin_code' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedScript === 'kotlin_code' ? 'Copied!' : 'Copy Kotlin Code'}</span>
                </button>
              </div>
              <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-amber-300 overflow-x-auto leading-relaxed max-h-56">
                {kotlinWebViewCode}
              </pre>
            </div>

            <div className="space-y-2 font-mono text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span>AndroidManifest.xml</span>
                <button
                  onClick={() => copyText(manifestXmlCode, 'manifest_code')}
                  className="text-amber-400 hover:text-amber-300 flex items-center space-x-1 text-[11px]"
                >
                  {copiedScript === 'manifest_code' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedScript === 'manifest_code' ? 'Copied!' : 'Copy Manifest'}</span>
                </button>
              </div>
              <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-cyan-300 overflow-x-auto leading-relaxed max-h-48">
                {manifestXmlCode}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
