# Termux Gemini Server ⚡📱

> **24/7 Background Server & Media Streaming Host with Google Drive & Gemini AI**
> 
> **Package ID:** `com.termux.gemini.server` / `/`  
> **App Name:** Termux Gemini Server  
> **Short Name:** Termux Gemini  

---

## 🌟 Overview

**Termux Gemini Server** turns any Android device (or Termux instance / Node.js host) into a full-featured, persistent 24/7 background micro-server, REST API host, and personal cloud media stream server with built-in Google Drive storage management and server-side Gemini 2.5 AI acceleration.

Designed for high portability, extreme memory efficiency, and robust background operation, this project bridges mobile hardware, cloud API capabilities, and PWA / Android APK packaging into one full-stack solution.

---

## 🚀 Key Features

* **⚡ Server Power & Background Engine**:
  * Simulated & real-time server health monitoring (`/api/server/status`, `/api/server/toggle`).
  * 24/7 Termux background daemon scripts (`termux-wake-lock`, `pm2`, `caddy`/`cloudflared`).

* **🤖 Gemini 2.5 AI Proxy**:
  * Server-side secure endpoint (`/api/gemini/generate`) using `@google/genai`.
  * Protects API keys from browser exposure.
  * Live streaming and structured prompt playground.

* **📁 Google Drive & Cloud File Management**:
  * Real-time Google Workspace OAuth 2.0 integration (`/api/drive/files`).
  * Search, stream, view, and manage remote Google Drive files directly inside the server console.

* **📂 Local Folder Hosting & File Deployer**:
  * Instant local static folder hosting and streaming.
  * Direct browser file uploads (`/api/media/upload`) with persistent local storage.

* **📱 Native Android APK & PWA Ready**:
  * Compliant `manifest.json` (`id: "/"`, `short_name: "Termux Gemini"`).
  * Android WebView `MainActivity.kt` and `AndroidManifest.xml` boilerplate included.
  * One-click download of full source code archive (`.ZIP`) for instant Git/Termux deployment or PWA Builder packaging.

---

## 🛠️ Architecture & Tech Stack

* **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide React Icons, Motion animations.
* **Backend**: Express.js (Node.js runtime or Termux node), bundled into ESM/CJS via `esbuild`.
* **AI Engine**: `@google/genai` (Gemini 2.5 Flash / Pro).
* **Storage & Auth**: Firebase Firestore + Google OAuth 2.0.

---

## 📂 Project Structure

```
├── server.ts                  # Express Backend Server (API routes, Drive, Gemini, ZIP export)
├── src/
│   ├── App.tsx                # Main Dashboard UI & Tab Navigation
│   ├── main.tsx               # Client Entry Point
│   ├── components/            # Modular React UI Components
│   │   ├── ApkBuildCenter.tsx      # Native Android APK & PWA Source Packaging
│   │   ├── ServerPowerControl.tsx  # 24/7 Background Server Health & Toggle
│   │   ├── GoogleDriveManager.tsx  # Google Drive OAuth File Explorer
│   │   ├── ApiPlayground.tsx       # Interactive REST & Gemini API Tester
│   │   ├── TermuxGuide.tsx         # Automated Termux Bash Commands & Install Scripts
│   │   ├── LocalFolderDeployer.tsx # Local File Hosting & Upload Manager
│   │   ├── CodeViewer.tsx          # Real-time Server Code Inspector
│   │   └── ClientSnippets.tsx      # Python/cURL/JS Integration Code Snippets
│   └── lib/
│       ├── firebase.ts        # Firebase Auth & Firestore Client Config
│       └── utils.ts           # Helper Utilities
├── public/
│   ├── manifest.json          # PWA Manifest (com.termux.gemini.server)
│   ├── sw.js                  # Service Worker for Offline PWA Capabilities
│   └── icon.svg               # Application Vector Logo
├── metadata.json              # AI Studio Project Metadata
├── .env.example               # Environment Variables Template
├── package.json               # Dependencies & Build Scripts
└── README.md                  # Project Documentation
```

---

## ⚙️ Environment Variables Setup

Create a `.env` file in the project root based on `.env.example`:

```env
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
GEMINI_API_KEY=your_gemini_api_key
```

---

## 💻 Local & Termux Installation Guide

### Option 1: Standard Node.js Environment

```bash
# 1. Clone your repository
git clone <YOUR_GIT_REPO_URL>
cd termux-gemini-server

# 2. Install dependencies
npm install

# 3. Start development server (Port 3000)
npm run dev

# 4. Production build & start
npm run build
npm start
```

### Option 2: Android Termux Deployment

Run these commands inside Termux on Android:

```bash
# Prevent Android system from putting Termux to sleep
termux-wake-lock

# Update packages and install Node.js + Git
pkg update -y && pkg install -y nodejs git

# Clone & Install
git clone <YOUR_GIT_REPO_URL>
cd termux-gemini-server
npm install

# Build & Run in background using PM2
npm install -g pm2
npm run build
pm2 start dist/server.cjs --name "termux-gemini"
pm2 save
```

---

## 📦 PWA & Android APK Generation

1. Open **APK & PWA Build Center** in the app UI.
2. Click **Download Complete Code Base (.ZIP)** to download all project files.
3. Use [PWABuilder.com](https://www.pwabuilder.com) with your host URL (`https://...`) to build a signed `.apk` or `.aab` file for Google Play / Android installation.
4. Alternatively, wrap `MainActivity.kt` in Android Studio using the manifest provided in the APK tab.

---

## 📡 REST API Documentation

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/server/status` | `GET` | Get current server uptime, health, and power state |
| `/api/server/toggle` | `POST` | Turn server background processing ON / OFF |
| `/api/gemini/generate` | `POST` | Send prompt payload to Gemini 2.5 Flash API |
| `/api/drive/files` | `GET` | Search and list Google Drive files |
| `/api/export-project-zip`| `GET` | Download full project source bundle as a `.zip` archive |
| `/api/media/upload` | `POST` | Upload media files to local server disk |

---

## 🤝 Git Push Checklist

To push this codebase to a new GitHub repository named `com.termux.gemini.server` or `termux-gemini-server`:

```bash
git init
git add .
git commit -m "feat: initial commit of Termux Gemini Server 24/7 background host"
git branch -M main
git remote add origin https://github.com/<YOUR_USERNAME>/termux-gemini-server.git
git push -u origin main
```

---

## 📄 License

MIT License - Open Source & Free for Community Use.
