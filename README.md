# Termux Gemini Server ⚡📱 & 24/7 Folder Sync Engine

> **24/7 Background Micro-Server, Media Streaming Host, Google Drive & Syncthing/Rclone Folder Sync Manager with Gemini AI Acceleration**
> 
> **Package ID:** `com.termux.gemini.server` / `/`  
> **App Name:** Termux Gemini Server  
> **Short Name:** Termux Gemini  
> **Live Demo / GitHub Pages:** `https://rajkotpodman.github.io/Termux-Gemini-Server/`

---

## 🌟 Overview
https://rajkotpodman.github.io/Termux-Gemini-Server/

**Termux Gemini Server** turns any Android device (via Termux), Linux PC, macOS, or Windows host into a lightweight, persistent **24/7 background micro-server**, continuous **folder synchronization manager** (based on Syncthing / Rclone principles), and personal cloud media stream server powered by **Gemini 2.5 AI**.

It includes an instant **Master ON/OFF Security Switch** that generates or revokes encrypted temporary HTTPS links (via Cloudflared / Ngrok / LocalTunnel) and P2P Device IDs on demand.

---

## 🚀 Key Features

* **🔄 24/7 Syncthing & Rclone Folder Sync Engine**:
  * **Graphical Web GUI**: Select local device directories (`/sdcard/TermuxSync/Vault`) or Google Drive accounts (`gdrive:Backups`).
  * **Master Security Switch**: Turn sync ON to spawn a temporary random HTTPS tunnel; turn sync OFF to immediately terminate the tunnel process and revoke all public file access.
  * **Realtime Watcher & Sync Modes**: Supports **Two-Way Continuous Sync**, **Send-Only (Backup)**, and **Receive-Only (Mirror)**.
  * **Peer-to-Peer Node Monitor**: Monitor connected Android, Desktop, and Cloud remote nodes with live latency and bandwidth metrics.

* **⚡ 24/7 Background Server & Control**:
  * Server health monitoring & remote toggle endpoints (`/api/server/status`, `/api/server/toggle`, `/api/sync/status`, `/api/sync/toggle`).
  * Termux wake-lock daemon support (`termux-wake-lock`, `pm2`, `caddy`, `cloudflared`).

* **🤖 Gemini 2.5 AI Proxy**:
  * Server-side secure endpoint (`/api/gemini/generate`) using `@google/genai`.
  * Protects API keys from browser leakage.
  * Live streaming and structured prompt playground.

* **📁 Google Drive & Cloud File Explorer**:
  * OAuth 2.0 integration (`/api/drive/files`) to list, search, stream, and manage remote Google Drive files directly inside the GUI.

* **📂 Local Folder Hosting & File Deployer**:
  * Instant static file hosting and streaming.
  * Direct browser file uploads (`/api/media/upload`) with persistent local disk storage.

* **🌐 GitHub Pages Compatible (Relative Path Architecture)**:
  * Full support for GitHub Pages subpath hosting (`https://rajkotpodman.github.io/Termux-Gemini-Server/`).
  * Configured with `base: './'`, relative asset links in `index.html`, and `sw.js` cache handling to prevent blank page issues.

* **📱 Native Android APK & PWA Ready**:
  * Compliant `manifest.json` (`id: "/"`, `short_name: "Termux Gemini"`).
  * Includes Kotlin `MainActivity.kt` and `AndroidManifest.xml` templates for Android WebView wrapping.
  * One-click `.ZIP` source export for instant Git/Termux deployment or PWABuilder packaging.

---

## 🛠️ Tech Stack

* **Frontend**: React 18, TypeScript, Vite (`base: './'`), Tailwind CSS, Lucide React Icons, QRCodeSVG, Motion.
* **Backend / Core Engine**: Express.js (Node.js runtime / Termux), Python (FastAPI / Watchdog), Rclone / Syncthing CLI, Cloudflared / Ngrok tunneling.
* **AI Engine**: `@google/genai` (Gemini 2.5 Flash / Pro).
* **Storage & Auth**: Firebase Firestore + Google OAuth 2.0.

---

## 📂 Project Structure

```
├── server.ts                       # Express Backend Server (API routes, Drive, Gemini, 24/7 Sync Engine)
├── vite.config.ts                  # Vite Config (base: './' for GitHub Pages compatibility)
├── index.html                      # HTML Entry Point with relative asset references
├── src/
│   ├── App.tsx                     # Main Dashboard & Navigation Tabs
│   ├── main.tsx                    # React Client Entry
│   ├── components/                 # Modular GUI Components
│   │   ├── SyncthingRcloneManager.tsx # 24/7 Folder Sync & HTTPS Tunnel Manager
│   │   ├── LocalFolderDeployer.tsx # Local File Hosting & Upload Manager
│   │   ├── ApkBuildCenter.tsx      # Native Android APK & PWA Source Packaging
│   │   ├── ServerPowerControl.tsx  # 24/7 Background Server Health & Toggle
│   │   ├── GoogleDriveManager.tsx  # Google Drive OAuth File Explorer
│   │   ├── ApiPlayground.tsx       # Interactive REST & Gemini API Tester
│   │   ├── TermuxGuide.tsx         # Automated Termux Bash Commands & Install Scripts
│   │   ├── CodeViewer.tsx          # Real-time Server Code Inspector
│   │   └── ClientSnippets.tsx      # Integration Code Snippets
│   └── lib/
│       ├── firebase.ts             # Firebase Client Config
│       └── utils.ts                # Helper Utilities
├── public/
│   ├── manifest.json               # PWA Manifest (com.termux.gemini.server)
│   ├── sw.js                       # Service Worker for Offline PWA Capabilities
│   └── icon.svg                    # Vector Application Icon
├── metadata.json                   # AI Studio App Metadata
├── .env.example                    # Environment Variables Template
├── package.json                    # Dependencies & Build Scripts
└── README.md                       # Complete Project Documentation
```

---

## ⚙️ Environment Variables Setup

Create a `.env` file in the project root:

```env
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
GEMINI_API_KEY=your_gemini_api_key
```

---

## 💻 Installation & Setup Guide

### 1. Standard Node.js / Server Environment

```bash
# Clone the repository
git clone https://github.com/rajkotpodman/Termux-Gemini-Server.git
cd Termux-Gemini-Server

# Install dependencies
npm install

# Start development server (Port 3000)
npm run dev

# Build for production & start
npm run build
npm start
```

---

### 2. Android Termux 24/7 Background Setup

Run the following commands inside Android Termux:

```bash
# 1. Acquire wake lock to keep Termux active in background
termux-wake-lock

# 2. Update Termux packages & install dependencies
pkg update -y
pkg install -y nodejs git python rclone cloudflared

# 3. Clone repository & install node modules
git clone https://github.com/rajkotpodman/Termux-Gemini-Server.git
cd Termux-Gemini-Server
npm install

# 4. Install PM2 for continuous background process execution
npm install -g pm2
npm run build
pm2 start dist/server.cjs --name "termux-gemini-sync"
pm2 save
```

#### Auto-Start on Android Boot (Termux Boot Service)
Create `~/.termux/boot/start-sync.sh`:
```bash
#!/usr/bin/env bash
termux-wake-lock
cd ~/Termux-Gemini-Server
pm2 resurrect || node dist/server.cjs > ~/sync_server.log 2>&1 &
```
```bash
chmod +x ~/.termux/boot/start-sync.sh
```

---

### 3. Deploying to GitHub Pages (Fixing Blank Pages)

To publish this Web GUI manager on GitHub Pages without facing blank page errors:

1. In `vite.config.ts`, ensure `base: './'` is configured.
2. Build the static production bundle:
   ```bash
   npm run build
   ```
3. Deploy the contents of `dist/` to the `gh-pages` branch:
   ```bash
   git checkout -b gh-pages
   git add dist -f
   git commit -m "deploy: GitHub Pages release with relative asset paths"
   git subtree push --prefix dist origin gh-pages
   ```
4. In GitHub Repository Settings -> Pages, select Source: `gh-pages` branch. Your app will load cleanly at: `https://rajkotpodman.github.io/Termux-Gemini-Server/`.

---

## 📡 REST API Documentation

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/sync/status` | `GET` | Get 24/7 folder sync state, active folder, and HTTPS tunnel URL |
| `/api/sync/toggle` | `POST` | Turn sync engine ON/OFF and spawn/kill Cloudflared tunnel |
| `/api/sync/peers` | `GET` | List connected P2P sync device nodes & latency metrics |
| `/api/server/status` | `GET` | Check background server health & uptime |
| `/api/server/toggle` | `POST` | Turn general server processing ON/OFF |
| `/api/gemini/generate` | `POST` | Proxy prompt request to Gemini 2.5 Flash AI |
| `/api/drive/files` | `GET` | Search and list Google Drive files via OAuth |
| `/api/media/upload` | `POST` | Upload files directly to local storage disk |
| `/api/export-project-zip`| `GET` | Download full project source as `.zip` archive |

---

## 📦 Android APK & PWA Packaging

1. Open the **APK & PWA Build Center** tab in the Web GUI.
2. Click **Download Complete Code Base (.ZIP)**.
3. Use [PWABuilder.com](https://www.pwabuilder.com) with your deployment URL (`https://rajkotpodman.github.io/Termux-Gemini-Server/`) to generate a signed Android `.apk` or `.aab` package.
4. Or import the included Kotlin `MainActivity.kt` into Android Studio to compile natively.

---

## 📄 License

MIT License - Open Source & Free for Community Use.
