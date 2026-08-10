const fs = require('fs');
const file = 'src/components/LocalFolderDeployer.tsx';
let content = fs.readFileSync(file, 'utf8');

const advancedState = `
  // Advanced APK Generation State
  const [apkConfig, setApkConfig] = useState({
    appName: 'Termux Gemini Streaming',
    packageId: 'com.termux.gemini.stream',
    version: '1.0.0'
  });
`;

content = content.replace("const [qrCopied, setQrCopied] = useState(false);", "const [qrCopied, setQrCopied] = useState(false);" + advancedState);

const apkSectionOld = `<h3 className="font-bold text-white text-base">Convert Application to Android APK</h3>
              <p className="text-xs text-slate-400">Package this live video streaming server into a standalone Android APK file.</p>`;

const apkSectionNew = `<h3 className="font-bold text-white text-base">Advanced Android APK Generator</h3>
              <p className="text-xs text-slate-400">Configure and generate an advanced Android APK build environment for your live streaming server.</p>`;

content = content.replace(apkSectionOld, apkSectionNew);

const capacitorOld = `                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">Step 3: Generate APK File in Android Studio</span>
                <p className="text-xs text-slate-300">
                  In Android Studio, click <strong className="text-white">Build &gt; Build Bundle(s) / APK(s) &gt; Build APK(s)</strong>. The compiled <code className="text-emerald-400 font-mono">app-debug.apk</code> will be ready in seconds!
                </p>`;

const capacitorNew = `                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">Step 3: Generate APK File in Android Studio</span>
                <p className="text-xs text-slate-300 mb-2">
                  In Android Studio, click <strong className="text-white">Build &gt; Build Bundle(s) / APK(s) &gt; Build APK(s)</strong>. The compiled <code className="text-emerald-400 font-mono">app-debug.apk</code> will be ready in seconds!
                </p>
                <button onClick={() => {
                  const script = \`#!/bin/bash
# Advanced Capacitor Build Script
APP_NAME="\${apkConfig.appName}"
PACKAGE_ID="\${apkConfig.packageId}"
VERSION="\${apkConfig.version}"

echo "Installing Capacitor for $APP_NAME..."
npm install @capacitor/core @capacitor/cli @capacitor/android

echo "Initializing Capacitor Project..."
npx cap init "$APP_NAME" "$PACKAGE_ID" --web-dir dist

echo "Building project..."
npm run build

echo "Adding Android Platform..."
npx cap add android

echo "Ready to open in Android Studio."
npx cap open android
\`;
                  const blob = new Blob([script], { type: 'text/plain' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'build_apk.sh';
                  document.body.appendChild(a);
                  a.click();
                  window.URL.revokeObjectURL(url);
                  document.body.removeChild(a);
                }} className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow flex items-center space-x-1.5 transition-all">
                  <Download className="w-4 h-4" />
                  <span>Download Build Script (build_apk.sh)</span>
                </button>`;

content = content.replace(capacitorOld, capacitorNew);

const capConfigArea = `            <div className="space-y-3">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">`;

const capConfigAreaNew = `            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">App Name</label>
                <input type="text" value={apkConfig.appName} onChange={(e) => setApkConfig({...apkConfig, appName: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500" />
              </div>
              <div className="space-y-3">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Package ID</label>
                <input type="text" value={apkConfig.packageId} onChange={(e) => setApkConfig({...apkConfig, packageId: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500" />
              </div>
            </div>
            <div className="space-y-3">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">`;

content = content.replace(capConfigArea, capConfigAreaNew);

const capInitOld = `<div>npx cap init "TermuxGemini" "com.termux.geminiserver" --web-dir dist</div>`;
const capInitNew = `<div>npx cap init "{apkConfig.appName}" "{apkConfig.packageId}" --web-dir dist</div>`;

content = content.replace(capInitOld, capInitNew);


fs.writeFileSync(file, content, 'utf8');
console.log('Patched');
