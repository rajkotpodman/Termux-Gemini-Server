import React, { useState } from 'react';
import { Play, RefreshCw, Send, CheckCircle2, AlertCircle, Clock, Code, Terminal, Copy, Check, Sparkles } from 'lucide-react';
import { ApiTestLog, ChatResponse } from '../types';

export const ApiPlayground: React.FC = () => {
  const [prompt, setPrompt] = useState('Explain how to run a Python script in Android Termux in 3 bullet points.');
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<ApiTestLog[]>([]);
  const [latestResponse, setLatestResponse] = useState<ChatResponse | null>(null);
  const [copiedCurl, setCopiedCurl] = useState(false);

  const presets = [
    { label: 'Termux Python Guide', text: 'Explain how to run a Python script in Android Termux in 3 bullet points.' },
    { label: 'Write Python Script', text: 'Write a lightweight Python script that calculates disk space usage on Linux/Android.' },
    { label: 'Gemini 2.5 Advantages', text: 'What makes Gemini 2.5 Flash ideal for mobile edge microservices?' },
    { label: 'JSON Parsing Snippet', text: 'Show a short Python Flask snippet that receives JSON and returns a response.' }
  ];

  const handleSend = async (customPrompt?: string) => {
    const textToSend = customPrompt !== undefined ? customPrompt : prompt;
    if (!textToSend.trim() || loading) return;

    setLoading(true);
    const startTime = performance.now();
    const timestamp = new Date().toLocaleTimeString();

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt: textToSend.trim() })
      });

      const endTime = performance.now();
      const durationMs = Math.round(endTime - startTime);
      const data: ChatResponse = await res.json();

      setLatestResponse(data);

      const newLog: ApiTestLog = {
        id: Math.random().toString(36).substring(2, 9),
        timestamp,
        method: 'POST',
        url: '/api/chat',
        requestBody: { prompt: textToSend.trim() },
        status: res.status,
        durationMs,
        responseBody: data
      };

      setLogs((prev) => [newLog, ...prev.slice(0, 10)]);
    } catch (err: any) {
      const endTime = performance.now();
      const durationMs = Math.round(endTime - startTime);
      const errResponse: ChatResponse = {
        status: 'error',
        error: 'Network Failure',
        message: err.message || 'Failed to reach API endpoint'
      };

      setLatestResponse(errResponse);

      setLogs((prev) => [
        {
          id: Math.random().toString(36).substring(2, 9),
          timestamp,
          method: 'POST',
          url: '/api/chat',
          requestBody: { prompt: textToSend.trim() },
          status: 500,
          durationMs,
          responseBody: errResponse
        },
        ...prev.slice(0, 10)
      ]);
    } finally {
      setLoading(false);
    }
  };

  const curlCommand = `curl -X POST http://localhost:5000/api/chat \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify({ prompt: prompt.trim() })}'`;

  const copyCurl = () => {
    navigator.clipboard.writeText(curlCommand);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Playground Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-md">
        <div>
          <div className="flex items-center space-x-2 text-emerald-400 font-mono text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            <span>Interactive REST API Client Sandbox</span>
          </div>
          <h2 className="text-xl font-bold text-slate-100 mt-1">
            Test <code className="text-emerald-400 font-mono">POST /api/chat</code>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Send test JSON payloads to the REST endpoint and inspect latency, request headers, JSON schema, and Gemini response.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Target Model: <strong className="text-emerald-400">gemini-2.5-flash</strong></span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Request Form & Presets */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span>JSON Request Body (<code className="text-emerald-400">prompt</code>)</span>
              </label>
              <span className="text-xs text-slate-500 font-mono">POST /api/chat</span>
            </div>

            {/* Presets */}
            <div className="space-y-1.5">
              <span className="text-xs text-slate-400">Preset Prompts:</span>
              <div className="flex flex-wrap gap-2">
                {presets.map((preset, idx) => (
                  <button
                    key={idx}
                    id={`btn-preset-${idx}`}
                    onClick={() => {
                      setPrompt(preset.text);
                      handleSend(preset.text);
                    }}
                    className="text-xs px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Prompt Input Area */}
            <div className="relative">
              <textarea
                id="input-prompt"
                rows={5}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Type your prompt here..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-slate-100 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none shadow-inner"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-1">
              <button
                id="btn-copy-curl"
                onClick={copyCurl}
                className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors"
              >
                {copiedCurl ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">cURL Copied</span>
                  </>
                ) : (
                  <>
                    <Code className="w-3.5 h-3.5" />
                    <span>Copy cURL</span>
                  </>
                )}
              </button>

              <button
                id="btn-send-chat"
                onClick={() => handleSend()}
                disabled={loading || !prompt.trim()}
                className="flex items-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium text-sm transition-all shadow-lg"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Sending to Gemini...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Execute POST /api/chat</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* cURL Display Preview */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-300 space-y-1 overflow-x-auto">
            <div className="text-slate-500 font-sans text-xs uppercase font-semibold">Equivalent Terminal Command</div>
            <pre className="text-emerald-400 whitespace-pre">{curlCommand}</pre>
          </div>
        </div>

        {/* Right Column: Live Response Inspector */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4 min-h-[380px] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
                  <Code className="w-4 h-4 text-blue-400" />
                  <span>Response Inspector</span>
                </h3>

                {latestResponse && (
                  <div className="flex items-center space-x-2 text-xs font-mono">
                    <span
                      className={`px-2 py-0.5 rounded-full font-semibold ${
                        latestResponse.status === 'success'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : 'bg-red-950 text-red-400 border border-red-800'
                      }`}
                    >
                      {latestResponse.status === 'success' ? '200 OK' : '500 Error'}
                    </span>
                  </div>
                )}
              </div>

              {/* Output Content */}
              {!latestResponse && !loading && (
                <div className="flex flex-col items-center justify-center py-16 text-slate-500 text-center space-y-2">
                  <Terminal className="w-10 h-10 text-slate-700 stroke-[1.5]" />
                  <p className="text-sm">Click "Execute POST /api/chat" to view real response payload.</p>
                </div>
              )}

              {loading && (
                <div className="flex flex-col items-center justify-center py-16 text-emerald-400 text-center space-y-3">
                  <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
                  <p className="text-sm font-mono text-slate-300">Processing prompt through gemini-2.5-flash...</p>
                </div>
              )}

              {latestResponse && !loading && (
                <div className="mt-4 space-y-4">
                  {latestResponse.status === 'success' ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs text-slate-400 font-mono bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                        <span>Status: <strong className="text-emerald-400">Success</strong></span>
                        <span>Model: <strong className="text-slate-200">{latestResponse.model}</strong></span>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs text-slate-400 uppercase font-semibold">Gemini Output:</label>
                        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-200 text-sm leading-relaxed font-sans max-h-64 overflow-y-auto whitespace-pre-wrap">
                          {latestResponse.response}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-red-950/40 border border-red-800/80 rounded-xl p-4 text-red-300 text-sm space-y-2">
                      <div className="flex items-center space-x-2 font-semibold">
                        <AlertCircle className="w-5 h-5 text-red-400" />
                        <span>{latestResponse.error || 'Error'}</span>
                      </div>
                      <p className="text-xs font-mono text-red-200">{latestResponse.message}</p>
                    </div>
                  )}

                  {/* Raw JSON Accordion */}
                  <details className="text-xs font-mono group">
                    <summary className="cursor-pointer text-slate-400 hover:text-slate-200 flex items-center space-x-1 py-1">
                      <span>Show Raw JSON Payload</span>
                    </summary>
                    <pre className="mt-2 bg-slate-950 p-3 rounded-lg border border-slate-800 text-emerald-400 overflow-x-auto text-xs">
                      {JSON.stringify(latestResponse, null, 2)}
                    </pre>
                  </details>
                </div>
              )}
            </div>

            {/* Test History Log */}
            {logs.length > 0 && (
              <div className="border-t border-slate-800 pt-3">
                <span className="text-xs text-slate-400 uppercase font-semibold">Recent Execution History</span>
                <div className="mt-2 space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between text-xs font-mono bg-slate-950 p-2 rounded border border-slate-800/70"
                    >
                      <div className="flex items-center space-x-2">
                        <span className="text-emerald-400 font-bold">{log.method}</span>
                        <span className="text-slate-300 truncate max-w-[140px]">"{log.requestBody.prompt}"</span>
                      </div>
                      <div className="flex items-center space-x-3 text-slate-500">
                        <span className={log.status === 200 ? 'text-emerald-400' : 'text-red-400'}>
                          {log.status}
                        </span>
                        <span>{log.durationMs}ms</span>
                        <span>{log.timestamp}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
