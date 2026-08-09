import React, { useState } from 'react';
import { Terminal, Copy, Check, Download, ExternalLink, Play, Cpu, ShieldAlert, Sparkles, Video, Globe, Lock, Film } from 'lucide-react';
import { TERMUX_SETUP_SCRIPT, VIDEO_TUNNEL_COMMANDS } from '../data/codeSnippets';

export const TermuxGuide: React.FC = () => {
  const [guideType, setGuideType] = useState<'ai' | 'video'>('ai');
  const [copiedStep, setCopiedStep] = useState<number | null>(null);
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedTunnel, setCopiedTunnel] = useState<string | null>(null);

  const copyToClipboard = (text: string, stepIndex: number) => {
    navigator.clipboard.writeText(text);
    setCopiedStep(stepIndex);
    setTimeout(() => setCopiedStep(null), 2000);
  };

  const copyTunnelCmd = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTunnel(key);
    setTimeout(() => setCopiedTunnel(null), 2000);
  };

  const copyScript = () => {
    navigator.clipboard.writeText(TERMUX_SETUP_SCRIPT);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  const aiSteps = [
    {
      title: "1. Update Termux Packages",
      description: "Open Android Termux app and update base repositories to ensure latest packages.",
      command: "pkg update && pkg upgrade -y",
      note: "If prompted about configuration files, press ENTER to keep defaults."
    },
    {
      title: "2. Install Python",
      description: "Install Python 3 environment in Termux.",
      command: "pkg install python -y",
      note: "Includes pip package manager by default."
    },
    {
      title: "3. Install Flask & google-genai SDK",
      description: "Install Flask, official Google GenAI SDK, and CORS helper via pip.",
      command: "pip install flask google-genai flask-cors",
      note: "This brings in the official google-genai package for gemini-3.6-flash."
    },
    {
      title: "4. Create app.py & Configure GEMINI_API_KEY",
      description: "Export your Google Gemini API key and write app.py file.",
      command: 'export GEMINI_API_KEY="your-gemini-api-key-here"',
      note: "You can get an API key free from Google AI Studio (ai.google.dev)."
    },
    {
      title: "5. Run the Flask Server",
      description: "Start the Flask server on host 0.0.0.0 and port 5000.",
      command: "python app.py",
      note: "The server will log: Host: 0.0.0.0 | Port: 5000 | Endpoint: POST /api/chat"
    },
    {
      title: "6. Test Endpoint locally in Termux",
      description: "Open a new Termux session/tab and send a test curl request to localhost.",
      command: `curl -X POST http://localhost:5000/api/chat -H "Content-Type: application/json" -d '{"prompt": "Hello Gemini from Termux!"}'`,
      note: "Returns a JSON object containing model response!"
    }
  ];

  const videoSteps = [
    {
      title: "1. Grant Android Storage Access to Termux",
      description: "Give Termux permission to read your Android internal storage (/sdcard) and Movies/Download folders.",
      command: "termux-setup-storage",
      note: "Click 'ALLOW' when Android displays the storage permission popup."
    },
    {
      title: "2. Install Python & Flask in Termux",
      description: "Install Python 3 and Flask web server.",
      command: "pkg update && pkg install python -y && pip install flask flask-cors",
      note: "Lightweight and streams video files directly with byte-range seeking."
    },
    {
      title: "3. Save video_server.py in Termux",
      description: "Download or copy the video_server.py script from the 'Flask Server Code' tab into Termux.",
      command: "nano video_server.py",
      note: "Paste the code from the 'Flask Server Code' -> 'video_server.py' tab and press Ctrl+O then Enter to save."
    },
    {
      title: "4. Place Video Files (.mp4, .mkv, .avi, .webm) in /sdcard/Movies",
      description: "Make sure your Android video files are in /sdcard/Movies or edit MEDIA_FOLDER inside video_server.py to /sdcard/Download.",
      command: "ls -la /sdcard/Movies",
      note: "Supports all video formats: .mp4, .mkv, .avi, .webm, .mov, etc."
    },
    {
      title: "5. Launch the Video Server",
      description: "Start the Python media streaming server on port 5000.",
      command: "python video_server.py",
      note: "Your videos are now accessible locally at http://localhost:5000"
    },
    {
      title: "6. Make Videos LIVE on Public Internet (Get Live HTTPS URL)",
      description: "In a NEW Termux tab/session, run Cloudflare Tunnel or Serveo to generate a public HTTPS URL accessible from anywhere in the world!",
      command: "pkg install cloudflared -y && cloudflared tunnel --url http://localhost:5000",
      note: "Cloudflare console will output your LIVE URL, e.g. https://xxx.trycloudflare.com!"
    }
  ];

  const activeSteps = guideType === 'ai' ? aiSteps : videoSteps;

  return (
    <div className="space-y-8">
      {/* Mode Switcher */}
      <div className="flex items-center justify-center space-x-2 bg-slate-900 border border-slate-800 p-1.5 rounded-xl max-w-md mx-auto">
        <button
          id="btn-guide-ai"
          onClick={() => setGuideType('ai')}
          className={`flex-1 flex items-center justify-center space-x-2 py-2.5 px-4 rounded-lg font-semibold text-xs sm:text-sm transition-all ${
            guideType === 'ai'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Gemini AI Server</span>
        </button>

        <button
          id="btn-guide-video"
          onClick={() => setGuideType('video')}
          className={`flex-1 flex items-center justify-center space-x-2 py-2.5 px-4 rounded-lg font-semibold text-xs sm:text-sm transition-all ${
            guideType === 'video'
              ? 'bg-cyan-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Video className="w-4 h-4" />
          <span>Video Streaming & Live URL</span>
        </button>
      </div>

      {/* Hero Banner */}
      <div className={`bg-gradient-to-r ${guideType === 'ai' ? 'from-slate-900 via-slate-900 to-emerald-950' : 'from-slate-900 via-slate-900 to-cyan-950'} border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden`}>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className={`flex items-center space-x-2 ${guideType === 'ai' ? 'text-emerald-400' : 'text-cyan-400'} font-mono text-xs font-semibold uppercase tracking-wider`}>
              {guideType === 'ai' ? <Sparkles className="w-4 h-4" /> : <Video className="w-4 h-4" />}
              <span>{guideType === 'ai' ? 'Android Termux AI Deployment' : 'Host Android Videos (.mkv, .avi, .mp4) Live on Internet'}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {guideType === 'ai' 
                ? 'Running Flask + Gemini AI on Android Termux' 
                : 'Stream Videos from Android Folder Live on the Web'}
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed">
              {guideType === 'ai'
                ? 'Termux turns your Android phone into a full Linux terminal. This Flask server runs locally on your device listening on port 5000, acting as a personal AI microservice.'
                : 'Host your video files (.mp4, .mkv, .avi) located in /sdcard/Movies or /sdcard/Download directly from your Android phone using Termux, and expose them live to any browser on the internet using free tunnels!'}
            </p>
          </div>

          {guideType === 'ai' && (
            <button
              id="btn-copy-setup-script"
              onClick={copyScript}
              className="flex items-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium text-sm transition-all shadow-lg shrink-0"
            >
              {copiedScript ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>Script Copied!</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Copy Auto-Setup Script</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Live Public URL Tunnels Section (Show for Video Guide) */}
      {guideType === 'video' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center space-x-3 text-cyan-400 font-semibold text-lg">
            <Globe className="w-5 h-5 text-cyan-400" />
            <span>How to Get Your LIVE PUBLIC URL (3 Ways)</span>
          </div>
          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
            When you run <code>python video_server.py</code>, it runs on <code>http://localhost:5000</code> inside your phone. To watch your videos from anywhere on the internet (or share with friends), run one of these free tunneling commands in a <span className="text-emerald-400 font-medium">second Termux tab/session</span>:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {/* Cloudflare Tunnel */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Option 1 (Recommended)</span>
                  <span className="text-[10px] bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded border border-emerald-800">Fast & Free</span>
                </div>
                <h4 className="font-semibold text-slate-100 text-sm mt-1">Cloudflare Tunnel</h4>
                <p className="text-xs text-slate-400 mt-1">Generates an HTTPS live URL instantly with high-speed video streaming.</p>
              </div>
              <div className="space-y-2">
                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 font-mono text-[11px] text-amber-300 break-all">
                  pkg install cloudflared -y && cloudflared tunnel --url http://localhost:5000
                </div>
                <button
                  id="btn-copy-cf-cmd"
                  onClick={() => copyTunnelCmd('pkg install cloudflared -y && cloudflared tunnel --url http://localhost:5000', 'cf')}
                  className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg transition-colors flex items-center justify-center space-x-1 border border-slate-700"
                >
                  {copiedTunnel === 'cf' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedTunnel === 'cf' ? 'Copied Command!' : 'Copy Cloudflare Command'}</span>
                </button>
              </div>
            </div>

            {/* Serveo SSH Tunnel */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Option 2 (Zero Install)</span>
                  <span className="text-[10px] bg-cyan-950 text-cyan-400 px-2 py-0.5 rounded border border-cyan-800">SSH Native</span>
                </div>
                <h4 className="font-semibold text-slate-100 text-sm mt-1">Serveo.net (SSH)</h4>
                <p className="text-xs text-slate-400 mt-1">No special packages required! Uses built-in SSH client in Termux.</p>
              </div>
              <div className="space-y-2">
                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 font-mono text-[11px] text-cyan-300 break-all">
                  pkg install openssh -y && ssh -R 80:localhost:5000 serveo.net
                </div>
                <button
                  id="btn-copy-serveo-cmd"
                  onClick={() => copyTunnelCmd('pkg install openssh -y && ssh -R 80:localhost:5000 serveo.net', 'serveo')}
                  className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg transition-colors flex items-center justify-center space-x-1 border border-slate-700"
                >
                  {copiedTunnel === 'serveo' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedTunnel === 'serveo' ? 'Copied Command!' : 'Copy Serveo Command'}</span>
                </button>
              </div>
            </div>

            {/* LocalTunnel */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">Option 3 (Node.js)</span>
                  <span className="text-[10px] bg-purple-950 text-purple-400 px-2 py-0.5 rounded border border-purple-800">LocalTunnel</span>
                </div>
                <h4 className="font-semibold text-slate-100 text-sm mt-1">LocalTunnel (lt)</h4>
                <p className="text-xs text-slate-400 mt-1">Quick Node.js tunneling package for web demo hosting.</p>
              </div>
              <div className="space-y-2">
                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 font-mono text-[11px] text-purple-300 break-all">
                  pkg install nodejs -y && npm i -g localtunnel && lt --port 5000
                </div>
                <button
                  id="btn-copy-lt-cmd"
                  onClick={() => copyTunnelCmd('pkg install nodejs -y && npm i -g localtunnel && lt --port 5000', 'lt')}
                  className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg transition-colors flex items-center justify-center space-x-1 border border-slate-700"
                >
                  {copiedTunnel === 'lt' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedTunnel === 'lt' ? 'Copied Command!' : 'Copy LocalTunnel Command'}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-xl text-xs text-amber-200">
            📍 <span className="font-bold">Where you get the Live URL:</span> Once you run the tunnel command in Termux, look at the terminal output. Cloudflare or Serveo will display a line like: <code className="bg-amber-900/60 px-1.5 py-0.5 rounded text-white font-mono">https://random-subdomain.trycloudflare.com</code>. Copy that URL and open it in any phone or computer browser!
          </div>
        </div>
      )}

      {/* Terminal Steps */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-100 flex items-center space-x-2">
          <Terminal className={`w-5 h-5 ${guideType === 'ai' ? 'text-emerald-400' : 'text-cyan-400'}`} />
          <span>{guideType === 'ai' ? 'Step-by-Step Installation' : 'Video Streaming Setup Steps'}</span>
        </h3>

        <div className="grid grid-cols-1 gap-4">
          {activeSteps.map((step, idx) => (
            <div
              key={idx}
              className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all shadow-md space-y-3"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="font-semibold text-slate-200 text-base">{step.title}</h4>
                  <p className="text-xs text-slate-400 mt-0.5">{step.description}</p>
                </div>
                <button
                  id={`btn-copy-step-${idx}`}
                  onClick={() => copyToClipboard(step.command, idx)}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700 shrink-0"
                  title="Copy command"
                >
                  {copiedStep === idx ? (
                    <Check className={`w-4 h-4 ${guideType === 'ai' ? 'text-emerald-400' : 'text-cyan-400'}`} />
                  ) : (
                    <Copy className="w-4 h-4 text-slate-400" />
                  )}
                </button>
              </div>

              <div className="bg-slate-950 border border-slate-800/80 rounded-lg p-3 font-mono text-xs sm:text-sm text-emerald-400 flex items-center justify-between overflow-x-auto">
                <span className="select-all">$ {step.command}</span>
              </div>

              {step.note && (
                <p className="text-xs text-slate-500 italic flex items-center space-x-1">
                  <span>💡 Note: {step.note}</span>
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Background Running Tips */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center space-x-2 text-amber-400 font-semibold text-sm">
            <Cpu className="w-4 h-4" />
            <span>Run Video/Flask Server in Background (nohup)</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Keep the server running even when closing the Termux terminal tab:
          </p>
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs text-amber-300">
            nohup python {guideType === 'video' ? 'video_server.py' : 'app.py'} &gt; server.log 2&gt;&amp;1 &amp;
          </div>
          <p className="text-xs text-slate-500">
            Check logs with: <code className="text-slate-300">tail -f server.log</code>
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center space-x-2 text-blue-400 font-semibold text-sm">
            <ShieldAlert className="w-4 h-4" />
            <span>Prevent Android Battery Sleep</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Android power management may suspend Termux background tasks. Run this command inside Termux:
          </p>
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs text-blue-300">
            termux-wake-lock
          </div>
          <p className="text-xs text-slate-500">
            This keeps CPU active so your videos and APIs stream smoothly 24/7.
          </p>
        </div>
      </div>
    </div>
  );
};

