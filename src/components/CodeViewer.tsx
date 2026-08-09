import React, { useState } from 'react';
import { Copy, Check, Download, FileCode, CheckCircle2, ShieldCheck, Zap, Video } from 'lucide-react';
import { APP_PY_CODE, REQUIREMENTS_TXT, APP_MEDIA_STREAMER_CODE } from '../data/codeSnippets';

export const CodeViewer: React.FC = () => {
  const [activeFile, setActiveFile] = useState<'app.py' | 'video_server.py' | 'requirements.txt'>('app.py');
  const [copied, setCopied] = useState(false);

  const getCodeForFile = () => {
    switch (activeFile) {
      case 'video_server.py':
        return APP_MEDIA_STREAMER_CODE;
      case 'requirements.txt':
        return REQUIREMENTS_TXT;
      default:
        return APP_PY_CODE;
    }
  };

  const currentCode = getCodeForFile();

  const handleCopy = () => {
    navigator.clipboard.writeText(currentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([currentCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = activeFile;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const lines = currentCode.trim().split('\n');

  return (
    <div className="space-y-6">
      {/* File Selector & Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-md">
        <div className="flex flex-wrap items-center gap-2">
          <button
            id="tab-btn-app-py"
            onClick={() => setActiveFile('app.py')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg font-mono text-xs sm:text-sm transition-all ${
              activeFile === 'app.py'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <FileCode className="w-4 h-4" />
            <span>app.py (Gemini AI)</span>
          </button>

          <button
            id="tab-btn-video-server-py"
            onClick={() => setActiveFile('video_server.py')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg font-mono text-xs sm:text-sm transition-all ${
              activeFile === 'video_server.py'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Video className="w-4 h-4 text-cyan-400" />
            <span>video_server.py (Media Stream)</span>
            <span className="text-[10px] bg-cyan-950 text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-800">
              NEW
            </span>
          </button>

          <button
            id="tab-btn-req-txt"
            onClick={() => setActiveFile('requirements.txt')}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg font-mono text-xs sm:text-sm transition-all ${
              activeFile === 'requirements.txt'
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <FileCode className="w-4 h-4" />
            <span>requirements.txt</span>
          </button>
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
          <button
            id="btn-copy-code"
            onClick={handleCopy}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm border border-slate-700 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-400" />
                <span>Copy Code</span>
              </>
            )}
          </button>
          <button
            id="btn-download-file"
            onClick={handleDownload}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>Download {activeFile}</span>
          </button>
        </div>
      </div>


      {/* Code Annotations / Feature Badges */}
      {activeFile === 'app.py' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-lg flex items-start space-x-3">
            <Zap className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">Host & Port</h4>
              <p className="text-xs text-slate-400 mt-0.5">Listens on <code className="text-amber-300">0.0.0.0:5000</code> for local Android & network access.</p>
            </div>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-lg flex items-start space-x-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">Official SDK</h4>
              <p className="text-xs text-slate-400 mt-0.5">Integrates <code className="text-emerald-300">google-genai</code> with model <code className="text-emerald-300">gemini-3.6-flash</code>.</p>
            </div>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-lg flex items-start space-x-3">
            <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">REST Endpoint</h4>
              <p className="text-xs text-slate-400 mt-0.5"><code className="text-blue-300">POST /api/chat</code> accepts JSON prompt & returns structured response.</p>
            </div>
          </div>
        </div>
      )}

      {/* Code Block Container */}
      <div className="relative bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
        <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block"></span>
            <span className="w-3 h-3 rounded-full bg-yellow-500/80 inline-block"></span>
            <span className="w-3 h-3 rounded-full bg-green-500/80 inline-block"></span>
            <span className="ml-2 font-medium text-slate-300">{activeFile}</span>
          </div>
          <span>{lines.length} lines</span>
        </div>

        <div className="overflow-x-auto p-4 max-h-[600px] font-mono text-sm leading-relaxed text-slate-300 select-text">
          <table className="w-full border-collapse">
            <tbody>
              {lines.map((line, idx) => (
                <tr key={idx} className="hover:bg-slate-900/50">
                  <td className="pr-4 text-right text-slate-600 select-none text-xs w-12 border-r border-slate-800/60 align-top py-0.5">
                    {idx + 1}
                  </td>
                  <td className="pl-4 whitespace-pre font-mono text-xs sm:text-sm align-top py-0.5">
                    <span className={getSyntaxColor(line)}>
                      {line}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

function getSyntaxColor(line: string): string {
  const trimmed = line.trim();
  if (trimmed.startsWith('#') || trimmed.startsWith('"""') || trimmed.startsWith('//')) {
    return 'text-slate-500 italic';
  }
  if (trimmed.startsWith('import ') || trimmed.startsWith('from ') || trimmed.startsWith('def ') || trimmed.startsWith('if ') || trimmed.startsWith('else:') || trimmed.startsWith('try:') || trimmed.startsWith('except ')) {
    return 'text-purple-400 font-semibold';
  }
  if (trimmed.includes('@app.route')) {
    return 'text-amber-300 font-semibold';
  }
  if (trimmed.includes('gemini-2.5-flash') || trimmed.includes('MODEL_NAME')) {
    return 'text-emerald-400 font-medium';
  }
  if (trimmed.includes('logger.')) {
    return 'text-cyan-300';
  }
  if (trimmed.includes('jsonify') || trimmed.includes('genai.Client')) {
    return 'text-blue-300';
  }
  return 'text-slate-300';
}
