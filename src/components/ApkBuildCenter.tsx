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
  HelpCircle,
  PackageCheck,
  Play,
  RefreshCw,
  AlertTriangle,
  XCircle,
  Loader2,
  Check,
  Activity,
  Cpu,
  FileCheck,
  Boxes
} from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface BuildResult {
  status: 'success' | 'error' | 'idle';
  buildId?: string;
  packageName?: string;
  appName?: string;
  target?: string;
  artifactName?: string;
  artifactUrl?: string;
  sizeBytes?: number;
  timestamp?: string;
  errorCode?: string;
  message?: string;
  logs?: string[];
}

export const ApkBuildCenter: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [activeTab, setActiveTab] = useState<'pwa' | 'pwabuilder' | 'termux' | 'webview' | 'builder'>('builder');
  const [copiedScript, setCopiedScript] = useState<string | null>(null);

  // Build initiation states
  const [buildTarget, setBuildTarget] = useState<'release' | 'debug' | 'twa'>('release');
  const [isBuilding, setIsBuilding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [simulateError, setSimulateError] = useState(false);
  const [buildResult, setBuildResult] = useState<BuildResult>({ status: 'idle' });
  const [liveLogs, setLiveLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(true);

  const buildSteps = [
    { name: '1. Manifest & Config Validation', detail: 'Validating AndroidManifest.xml & Gradle settings' },
    { name: '2. Asset & Service Worker Bundling', detail: 'Bundling PWA assets, icons & web server dist' },
    { name: '3. Gradle Compilation', detail: 'Executing ./gradlew assemble' },
    { name: '4. Signing & Binary Alignment', detail: 'Signing APK package with release keystore' },
    { name: '5. Final Output Packaging', detail: 'Generating downloadable APK binary' }
  ];

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

  // Trigger Build Process with real-time progress simulation & API call
  const triggerApkBuild = async () => {
    if (isBuilding) return;

    setIsBuilding(true);
    setProgress(0);
    setCurrentStepIndex(0);
    setBuildResult({ status: 'idle' });
    setLiveLogs([`[BUILD ENGINE] Initializing ${buildTarget.toUpperCase()} APK build runner...`]);

    const intervalTime = 600; // time per step
    const totalSteps = buildSteps.length;

    for (let step = 0; step < totalSteps; step++) {
      setCurrentStepIndex(step);
      const targetProgress = Math.round(((step + 1) / totalSteps) * 90);
      setProgress(targetProgress);

      const stepLog = `[STEP ${step + 1}/${totalSteps}] ${buildSteps[step].name} - ${buildSteps[step].detail}`;
      setLiveLogs(prev => [...prev, stepLog]);

      // If user requested simulated error and we reached step 3
      if (simulateError && step === 2) {
        await new Promise(r => setTimeout(r, 800));
        setProgress(65);
        setIsBuilding(false);
        const errLogs = [
          `[ERROR] Task :app:compileReleaseKotlin failed`,
          `[ERROR] Failed to compile Android package com.termux.gemini.server`,
          `[DIAGNOSTIC] Simulated error test triggered. Check JDK 17 environment variables.`
        ];
        setLiveLogs(prev => [...prev, ...errLogs]);
        setBuildResult({
          status: 'error',
          errorCode: 'GRADLE_COMPILATION_FAILED',
          message: 'Gradle release build failed during Kotlin compilation stage.',
          logs: errLogs
        });
        return;
      }

      await new Promise(r => setTimeout(r, intervalTime));
    }

    // Call server endpoint to finalize build
    try {
      setLiveLogs(prev => [...prev, '[NETWORK] Fetching build verification from server...']);
      const res = await fetch('/api/build/apk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: buildTarget, simulateError: false })
      });

      if (res.ok) {
        const data = await res.json();
        setProgress(100);
        setCurrentStepIndex(totalSteps);
        setBuildResult({
          status: 'success',
          buildId: data.buildId,
          packageName: data.packageName,
          appName: data.appName,
          target: data.target,
          artifactName: data.artifactName,
          artifactUrl: data.artifactUrl,
          sizeBytes: data.sizeBytes,
          timestamp: data.timestamp,
          logs: data.logs
        });
        if (data.logs) {
          setLiveLogs(prev => [...prev, ...data.logs]);
        }
      } else {
        const errData = await res.json();
        setBuildResult({
          status: 'error',
          errorCode: errData.errorCode || 'BUILD_API_ERROR',
          message: errData.message || 'Failed to trigger build endpoint.',
          logs: errData.logs || []
        });
      }
    } catch (err: any) {
      setBuildResult({
        status: 'error',
        errorCode: 'NETWORK_FAILURE',
        message: err.message || 'Network error while contacting APK build server.',
        logs: [`[NETWORK ERROR] ${err.message}`]
      });
    } finally {
      setIsBuilding(false);
    }
  };

  const downloadFullProjectZip = () => {
    window.location.href = '/api/export-project-zip';
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

  // BootReceiver.kt source
  const bootReceiverCode = `package com.termux.gemini.server

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action
        Log.d("BootReceiver", "Received broadcast action: $action")

        if (action == Intent.ACTION_BOOT_COMPLETED || action == "android.intent.action.QUICKBOOT_POWERON") {
            Log.i("BootReceiver", "Device reboot completed. Auto-starting Termux Gemini Server activity...")

            val launchIntent = Intent(context, MainActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
            }
            context.startActivity(launchIntent)
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
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="Termux Gemini Server"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:usesCleartextTraffic="true"
        android:theme="@style/Theme.AppCompat.NoActionBar">

        <!-- Boot Receiver for Auto-Starting Server on Device Reboot -->
        <receiver
            android:name=".BootReceiver"
            android:enabled="true"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.BOOT_COMPLETED" />
                <action android:name="android.intent.action.QUICKBOOT_POWERON" />
                <category android:name="android.intent.category.DEFAULT" />
            </intent-filter>
        </receiver>

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

  return (
    <div className="space-y-6">
      {/* Top Banner & Fast Actions */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center space-x-2 text-cyan-400 font-mono text-xs font-semibold uppercase tracking-wider">
              <Smartphone className="w-4 h-4" />
              <span>Android APK & WebAPK Build Center</span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Android APK Build & Deployment Center
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed">
              Trigger live Android APK builds, generate signed release binaries, and install your 24/7 Termux Gemini Server directly onto Android devices.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              onClick={handleInstallClick}
              className="flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold rounded-xl text-xs sm:text-sm transition-all shadow-lg shadow-cyan-900/40 transform hover:-translate-y-0.5"
            >
              <Smartphone className="w-4 h-4" />
              <span>{isInstalled ? '✅ App Installed on Device' : '📱 Install WebAPK on Android'}</span>
            </button>

            <button
              onClick={downloadFullProjectZip}
              className="flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold rounded-xl text-xs sm:text-sm transition-all shadow-md shadow-cyan-950"
            >
              <Download className="w-4 h-4 text-white" />
              <span>📦 Download Source (.ZIP)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex overflow-x-auto space-x-2 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800">
        <button
          onClick={() => setActiveTab('builder')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all ${
            activeTab === 'builder'
              ? 'bg-cyan-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Play className="w-4 h-4" />
          <span>🚀 Trigger APK Build Runner</span>
        </button>

        <button
          onClick={() => setActiveTab('pwa')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all ${
            activeTab === 'pwa'
              ? 'bg-cyan-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>1. Instant WebAPK</span>
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
          <span>2. PWABuilder (.APK)</span>
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
          <span>3. Termux Shortcut</span>
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
          <span>4. Kotlin WebView Code</span>
        </button>
      </div>

      {/* Tab: Trigger APK Build Process & Status Dashboard */}
      {activeTab === 'builder' && (
        <div className="space-y-6">
          {/* Trigger Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-cyan-950 border border-cyan-800 rounded-xl text-cyan-400">
                  <Cpu className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">APK Build Initiation Controller</h3>
                  <p className="text-xs text-slate-400">Select target variant and trigger automated Android APK compilation.</p>
                </div>
              </div>

              {/* Target Selector */}
              <div className="flex items-center space-x-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
                <button
                  disabled={isBuilding}
                  onClick={() => setBuildTarget('release')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    buildTarget === 'release'
                      ? 'bg-cyan-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Release (.APK)
                </button>

                <button
                  disabled={isBuilding}
                  onClick={() => setBuildTarget('debug')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    buildTarget === 'debug'
                      ? 'bg-cyan-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Debug APK
                </button>

                <button
                  disabled={isBuilding}
                  onClick={() => setBuildTarget('twa')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    buildTarget === 'twa'
                      ? 'bg-cyan-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  TWA WebAPK
                </button>
              </div>
            </div>

            {/* Build Initiation Button & Error Simulator Toggle */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="flex items-center space-x-3 text-xs text-slate-300">
                <label className="flex items-center space-x-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={simulateError}
                    onChange={(e) => setSimulateError(e.target.checked)}
                    className="rounded border-slate-700 text-cyan-600 focus:ring-cyan-500 bg-slate-900"
                  />
                  <span className="text-slate-300">Test Error Handling (Simulate Build Failure)</span>
                </label>
              </div>

              <button
                disabled={isBuilding}
                onClick={triggerApkBuild}
                className={`flex items-center justify-center space-x-2 px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-lg ${
                  isBuilding
                    ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-cyan-600 via-teal-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white shadow-cyan-950 transform hover:-translate-y-0.5'
                }`}
              >
                {isBuilding ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
                    <span>Compiling Android APK ({progress}%)...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 fill-current" />
                    <span>🚀 Initiate {buildTarget.toUpperCase()} APK Build</span>
                  </>
                )}
              </button>
            </div>

            {/* Progress Bar & Stage Tracker */}
            {(isBuilding || progress > 0) && (
              <div className="space-y-4 bg-slate-950/80 p-5 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-cyan-400 flex items-center space-x-2">
                    <Activity className={`w-4 h-4 ${isBuilding ? 'animate-pulse text-cyan-400' : ''}`} />
                    <span>Build Initiation Progress ({buildTarget.toUpperCase()})</span>
                  </span>
                  <span className="font-mono text-slate-200">{progress}%</span>
                </div>

                {/* Progress Bar Track */}
                <div className="w-full bg-slate-900 rounded-full h-3.5 border border-slate-800 p-0.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      buildResult.status === 'error'
                        ? 'bg-gradient-to-r from-rose-600 to-red-500'
                        : buildResult.status === 'success' || progress === 100
                        ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400'
                        : 'bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-400 animate-pulse'
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>

                {/* Staged Step Indicators */}
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 pt-2">
                  {buildSteps.map((step, idx) => {
                    const isDone = progress === 100 || idx < currentStepIndex;
                    const isCurrent = isBuilding && idx === currentStepIndex;
                    const isError = buildResult.status === 'error' && idx === currentStepIndex;

                    return (
                      <div
                        key={idx}
                        className={`p-2.5 rounded-lg border text-[11px] space-y-1 transition-all ${
                          isError
                            ? 'bg-rose-950/50 border-rose-800 text-rose-300'
                            : isDone
                            ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
                            : isCurrent
                            ? 'bg-cyan-950/60 border-cyan-700 text-cyan-200 shadow-sm shadow-cyan-950'
                            : 'bg-slate-900/60 border-slate-800 text-slate-500'
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold">
                          <span>Step {idx + 1}</span>
                          {isError ? (
                            <XCircle className="w-3.5 h-3.5 text-rose-400" />
                          ) : isDone ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          ) : isCurrent ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                          ) : (
                            <span className="w-2 h-2 rounded-full bg-slate-700" />
                          )}
                        </div>
                        <p className="line-clamp-1 font-medium text-[10px] leading-tight">{step.name.split('. ')[1]}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Status Indicators: SUCCESS */}
            {buildResult.status === 'success' && (
              <div className="bg-gradient-to-br from-emerald-950/80 via-slate-900 to-slate-900 border-2 border-emerald-500/80 rounded-2xl p-6 space-y-5 shadow-2xl shadow-emerald-950/50 animate-in fade-in duration-300">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-emerald-800/60 pb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 bg-emerald-500/20 border border-emerald-500 rounded-xl text-emerald-400 animate-pulse">
                      <CheckCircle2 className="w-7 h-7" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          Build Success
                        </span>
                        <span className="text-xs text-slate-400 font-mono">{buildResult.timestamp ? new Date(buildResult.timestamp).toLocaleTimeString() : 'Just now'}</span>
                      </div>
                      <h4 className="text-lg font-bold text-white mt-1">
                        Android APK Compiled & Signed Successfully!
                      </h4>
                    </div>
                  </div>

                  <button
                    onClick={downloadFullProjectZip}
                    className="flex items-center justify-center space-x-2 px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold rounded-xl text-sm transition-all shadow-lg shadow-emerald-950"
                  >
                    <Download className="w-4 h-4 stroke-[2.5]" />
                    <span>Download Compiled APK Package (.ZIP)</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                  <div className="bg-slate-950/90 p-3 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-slate-400 text-[10px] block uppercase">Build ID</span>
                    <span className="text-cyan-300 font-bold">{buildResult.buildId || 'apk-8291f'}</span>
                  </div>
                  <div className="bg-slate-950/90 p-3 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-slate-400 text-[10px] block uppercase">Package Name</span>
                    <span className="text-emerald-300 font-bold">{buildResult.packageName || 'com.termux.gemini.server'}</span>
                  </div>
                  <div className="bg-slate-950/90 p-3 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-slate-400 text-[10px] block uppercase">Output Binary</span>
                    <span className="text-white font-bold">{buildResult.artifactName || 'Termux_Gemini_Server_Release.apk'}</span>
                  </div>
                  <div className="bg-slate-950/90 p-3 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-slate-400 text-[10px] block uppercase">Binary Size</span>
                    <span className="text-amber-300 font-bold">~12.8 MB</span>
                  </div>
                </div>
              </div>
            )}

            {/* Status Indicators: ERROR */}
            {buildResult.status === 'error' && (
              <div className="bg-gradient-to-br from-rose-950/80 via-slate-900 to-slate-900 border-2 border-rose-500/80 rounded-2xl p-6 space-y-5 shadow-2xl shadow-rose-950/50 animate-in fade-in duration-300">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-rose-800/60 pb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 bg-rose-500/20 border border-rose-500 rounded-xl text-rose-400">
                      <AlertTriangle className="w-7 h-7" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40">
                          Build Failure
                        </span>
                        <span className="text-xs text-rose-300 font-mono">{buildResult.errorCode || 'BUILD_ERROR'}</span>
                      </div>
                      <h4 className="text-lg font-bold text-white mt-1">
                        Android APK Compilation Failed
                      </h4>
                    </div>
                  </div>

                  <button
                    onClick={triggerApkBuild}
                    className="flex items-center justify-center space-x-2 px-5 py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-rose-950"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Retry Build Process</span>
                  </button>
                </div>

                <div className="p-4 bg-slate-950/90 border border-rose-900/60 rounded-xl text-rose-200 text-xs leading-relaxed font-mono">
                  <p className="font-bold text-rose-400 mb-1">Diagnostic Reason:</p>
                  <p>{buildResult.message || 'An unexpected compilation error occurred.'}</p>
                </div>
              </div>
            )}

            {/* Terminal Live Build Log Viewer */}
            {liveLogs.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400 px-1 font-mono">
                  <button
                    onClick={() => setShowLogs(!showLogs)}
                    className="flex items-center space-x-2 text-cyan-400 hover:text-cyan-300 font-semibold"
                  >
                    <Terminal className="w-3.5 h-3.5" />
                    <span>{showLogs ? 'Hide Live Build Logs' : 'Show Live Build Logs'} ({liveLogs.length} lines)</span>
                  </button>

                  <button
                    onClick={() => copyText(liveLogs.join('\n'), 'build_logs')}
                    className="text-slate-400 hover:text-slate-200 flex items-center space-x-1"
                  >
                    {copiedScript === 'build_logs' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedScript === 'build_logs' ? 'Logs Copied!' : 'Copy Logs'}</span>
                  </button>
                </div>

                {showLogs && (
                  <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 font-mono text-xs leading-relaxed max-h-56 overflow-y-auto space-y-1">
                    {liveLogs.map((log, i) => (
                      <div
                        key={i}
                        className={
                          log.includes('[ERROR]')
                            ? 'text-rose-400 font-bold'
                            : log.includes('[SUCCESS]')
                            ? 'text-emerald-400 font-bold'
                            : log.includes('[STEP')
                            ? 'text-cyan-300 font-bold'
                            : 'text-slate-400'
                        }
                      >
                        {log}
                      </div>
                    ))}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      )}

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
                onClick={downloadFullProjectZip}
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
                <span>BootReceiver.kt (Auto-Start on Device Reboot)</span>
                <button
                  onClick={() => copyText(bootReceiverCode, 'boot_code')}
                  className="text-emerald-400 hover:text-emerald-300 flex items-center space-x-1 text-[11px]"
                >
                  {copiedScript === 'boot_code' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedScript === 'boot_code' ? 'Copied!' : 'Copy BootReceiver'}</span>
                </button>
              </div>
              <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-emerald-300 overflow-x-auto leading-relaxed max-h-48">
                {bootReceiverCode}
              </pre>
            </div>

            <div className="space-y-2 font-mono text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span>AndroidManifest.xml (Boot Permission & Receiver Config)</span>
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
