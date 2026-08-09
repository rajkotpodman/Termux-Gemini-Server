import React, { useState, useEffect } from 'react';
import { Power, Radio, Globe, Wifi, Monitor, Copy, Check, ExternalLink, QrCode, Shield, Activity, HardDrive, RefreshCw } from 'lucide-react';
import { ServerStatus, ServerUrls } from '../types';
import { useTranslation } from '../lib/i18n';

interface ServerPowerControlProps {
  onStatusChange?: (online: boolean) => void;
  setQrTarget?: (target: { url: string; title: string } | null) => void;
}

export const ServerPowerControl: React.FC<ServerPowerControlProps> = ({ onStatusChange, setQrTarget }) => {
  const { t } = useTranslation();
  const [serverStatus, setServerStatus] = useState<ServerStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const fetchServerStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/server/status');
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data: ServerStatus = await res.json();
        setServerStatus(data);
        if (onStatusChange) onStatusChange(data.isServerOnline);
      }
    } catch (e) {
      console.warn('Server status fetch paused or unavailable:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServerStatus();
    const interval = setInterval(fetchServerStatus, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const handleTogglePower = async () => {
    if (!serverStatus) return;
    const isCurrentlyOnline = serverStatus.isServerOnline;
    const confirmMessage = isCurrentlyOnline
      ? 'Are you sure you want to SHUTDOWN the server? All live streaming links and AI endpoints will be paused until you start it again.'
      : 'Start server continuously in the background?';

    if (!window.confirm(confirmMessage)) return;

    setToggling(true);
    try {
      const action = isCurrentlyOnline ? 'shutdown' : 'start';
      const res = await fetch('/api/server/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        await fetchServerStatus();
      }
    } catch (e) {
      console.error('Failed to toggle server state', e);
    } finally {
      setToggling(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const formatUptime = (seconds?: number) => {
    if (!seconds) return '0s';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  const publicInternetUrl = serverStatus?.urls?.publicUrl || window.location.origin;
  const primaryLanUrl = serverStatus?.urls?.lanUrls?.[0] || 'http://192.168.1.100:3000';
  const isOnline = serverStatus?.isServerOnline ?? true;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
      {/* Top Bar: Power State & Toggle Button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-start space-x-3.5">
          <div
            className={`p-3 rounded-2xl border ${
              isOnline
                ? 'bg-emerald-950/80 border-emerald-800/80 text-emerald-400'
                : 'bg-rose-950/80 border-rose-800/80 text-rose-400'
            }`}
          >
            <Power className={`w-6 h-6 ${isOnline ? 'animate-pulse' : ''}`} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span
                className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold font-mono uppercase tracking-wide border ${
                  isOnline
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400 animate-ping' : 'bg-rose-500'}`} />
                <span>{isOnline ? t('serverOnline') : t('serverShutdown')}</span>
              </span>
              <span className="text-xs text-slate-400 font-mono hidden sm:inline">
                Port: 3000 (Express & Flask Proxy)
              </span>
            </div>
            <h2 className="text-base font-bold text-slate-100 mt-1 flex items-center space-x-2 font-mono">
              <span>{t('serverControlTitle')}</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {isOnline
                ? 'Server is running 24/7 in background. Open anywhere on internet or local Wi-Fi.'
                : 'Server is currently OFF. Turn ON to enable live streams & AI requests.'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchServerStatus}
            disabled={loading}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all border border-slate-700"
            title="Refresh Status"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            id="btn-toggle-server-power"
            onClick={handleTogglePower}
            disabled={toggling}
            className={`px-5 py-2.5 rounded-xl font-mono text-xs font-bold flex items-center space-x-2 transition-all shadow-md border ${
              isOnline
                ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-500/80 shadow-rose-950/50'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500/80 shadow-emerald-950/50'
            }`}
          >
            <Power className="w-4 h-4" />
            <span>{isOnline ? t('shutdownServer') : t('startServer')}</span>
          </button>
        </div>
      </div>

      {/* Server Live Stats Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>{t('uptime')}</span>
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-sm font-bold text-cyan-300 font-mono mt-1">
            {formatUptime(serverStatus?.uptimeSeconds)}
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>RAM Memory</span>
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-sm font-bold text-emerald-300 font-mono mt-1">
            {serverStatus?.memory ? `${serverStatus.memory.freeMb}MB Free` : 'Active'}
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>{t('storageUsed')}</span>
            <HardDrive className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-sm font-bold text-purple-300 font-mono mt-1">
            {serverStatus?.mediaStats?.totalMediaSizeMb || '0'} MB
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>Hosted Files</span>
            <Radio className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-sm font-bold text-amber-300 font-mono mt-1">
            {serverStatus?.mediaStats?.fileCount || 0} Stream(s)
          </div>
        </div>
      </div>

      {/* Internet & Local Network Access URLs Section */}
      <div className="space-y-3 pt-2">
        <div className="text-xs font-semibold text-slate-300 font-mono flex items-center space-x-2">
          <Globe className="w-4 h-4 text-cyan-400" />
          <span>Watch Live & Control Server From Anywhere (Internet & Network Links)</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* 🌐 Global Internet Live Stream URL */}
          <div className="bg-slate-950/90 border border-cyan-900/60 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-cyan-400 font-mono flex items-center space-x-1.5">
                <Globe className="w-3.5 h-3.5" />
                <span>🌐 {t('internetUrlTitle')}</span>
              </span>
              <span className="text-[10px] bg-cyan-950 text-cyan-300 px-2 py-0.5 rounded border border-cyan-800 font-mono">
                Anywhere in World
              </span>
            </div>
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-1.5 space-x-2">
              <input
                type="text"
                readOnly
                value={publicInternetUrl}
                className="flex-1 bg-transparent text-xs text-cyan-200 font-mono focus:outline-none truncate px-1"
              />
              <button
                onClick={() => copyToClipboard(publicInternetUrl, 'public')}
                className="px-2.5 py-1 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 rounded text-xs font-mono transition-all flex items-center space-x-1"
                title="Copy Internet URL"
              >
                {copiedKey === 'public' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'public' ? t('copied') : t('copyUrl')}</span>
              </button>
              {setQrTarget && (
                <button
                  onClick={() => setQrTarget({ url: publicInternetUrl, title: 'Global Internet Live Stream URL' })}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition-all"
                  title="Generate QR Code"
                >
                  <QrCode className="w-3.5 h-3.5 text-cyan-400" />
                </button>
              )}
              <a
                href={publicInternetUrl}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition-all"
                title="Open in New Tab"
              >
                <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
              </a>
            </div>
          </div>

          {/* 📶 Local Wi-Fi Network LAN URL */}
          <div className="bg-slate-950/90 border border-emerald-900/60 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-400 font-mono flex items-center space-x-1.5">
                <Wifi className="w-3.5 h-3.5" />
                <span>📶 {t('lanUrlTitle')}</span>
              </span>
              <span className="text-[10px] bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800 font-mono">
                Smart TV & Phones
              </span>
            </div>
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-1.5 space-x-2">
              <input
                type="text"
                readOnly
                value={primaryLanUrl}
                className="flex-1 bg-transparent text-xs text-emerald-200 font-mono focus:outline-none truncate px-1"
              />
              <button
                onClick={() => copyToClipboard(primaryLanUrl, 'lan')}
                className="px-2.5 py-1 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 rounded text-xs font-mono transition-all flex items-center space-x-1"
                title="Copy Local Wi-Fi URL"
              >
                {copiedKey === 'lan' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'lan' ? t('copied') : t('copyUrl')}</span>
              </button>
              {setQrTarget && (
                <button
                  onClick={() => setQrTarget({ url: primaryLanUrl, title: 'Local Wi-Fi Network LAN URL' })}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition-all"
                  title="Generate QR Code"
                >
                  <QrCode className="w-3.5 h-3.5 text-emerald-400" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
