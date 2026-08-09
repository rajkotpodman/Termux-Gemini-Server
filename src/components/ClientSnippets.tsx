import React, { useState } from 'react';
import { Smartphone, Copy, Check, Terminal, Code2 } from 'lucide-react';
import { CLIENT_EXAMPLES } from '../data/codeSnippets';

type ClientLang = 'curl' | 'python_requests' | 'kotlin_android' | 'dart_flutter' | 'tasker';

export const ClientSnippets: React.FC = () => {
  const [activeLang, setActiveLang] = useState<ClientLang>('curl');
  const [copied, setCopied] = useState(false);

  const langNames: Record<ClientLang, string> = {
    curl: 'cURL Terminal',
    python_requests: 'Python Requests',
    kotlin_android: 'Kotlin (Android OkHttp)',
    dart_flutter: 'Flutter / Dart',
    tasker: 'Tasker Automation'
  };

  const currentSnippet = CLIENT_EXAMPLES[activeLang];

  const handleCopy = () => {
    navigator.clipboard.writeText(currentSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-md space-y-2">
        <div className="flex items-center space-x-2 text-blue-400 font-mono text-xs font-semibold uppercase tracking-wider">
          <Smartphone className="w-4 h-4" />
          <span>Integration Code Examples</span>
        </div>
        <h2 className="text-xl font-bold text-slate-100">
          Connect External Apps to Termux Flask Server
        </h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          The Termux Flask server runs on <code className="text-emerald-400">0.0.0.0:5000</code>. You can query it from another Android app, script, or Wi-Fi connected device using the code templates below.
        </p>
      </div>

      {/* Selector tabs */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-900 p-2 border border-slate-800 rounded-xl">
        {(Object.keys(langNames) as ClientLang[]).map((key) => (
          <button
            key={key}
            id={`btn-lang-${key}`}
            onClick={() => setActiveLang(key)}
            className={`px-4 py-2 rounded-lg text-xs font-mono transition-all ${
              activeLang === key
                ? 'bg-emerald-600 text-white shadow-md font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            {langNames[key]}
          </button>
        ))}
      </div>

      {/* Code Display Box */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-xl space-y-0">
        <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex items-center justify-between text-xs text-slate-300 font-mono">
          <div className="flex items-center space-x-2">
            <Code2 className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold">{langNames[activeLang]}</span>
          </div>

          <button
            id="btn-copy-client-snippet"
            onClick={handleCopy}
            className="flex items-center space-x-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Copy Snippet</span>
              </>
            )}
          </button>
        </div>

        <pre className="p-5 font-mono text-xs sm:text-sm text-slate-200 overflow-x-auto leading-relaxed bg-slate-950">
          {currentSnippet}
        </pre>
      </div>
    </div>
  );
};
