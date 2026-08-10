const fs = require('fs');
const file = 'src/components/LocalFolderDeployer.tsx';
let content = fs.readFileSync(file, 'utf8');

const termuxOld = `<div className="bg-slate-900 p-3 rounded font-mono text-xs text-cyan-300">
                pkg install python -y && pip install buildapk
              </div>
              <p className="text-xs text-slate-400">Run this inside Termux to package your Flask server and video folder into an installable Android APK file.</p>`;

const termuxNew = `<div className="bg-slate-900 p-3 rounded font-mono text-xs text-cyan-300 space-y-2">
                <div>pkg install python -y && pip install buildapk</div>
                <div>buildapk --name "{apkConfig.appName}" --package "{apkConfig.packageId}" --version "{apkConfig.version}" .</div>
              </div>
              <p className="text-xs text-slate-400">Run this inside Termux to package your Flask server and video folder into an installable Android APK file directly on your device.</p>`;

content = content.replace(termuxOld, termuxNew);

fs.writeFileSync(file, content, 'utf8');
