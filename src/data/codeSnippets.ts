export const APP_PY_CODE = `"""
Termux Gemini Flask Server (app.py)
=====================================
Lightweight Python Flask REST API server optimized for Android Termux.
Integrates the official Google GenAI SDK (google-genai) powered by gemini-3.6-flash.

Prerequisites on Termux:
    pkg update && pkg upgrade -y
    pkg install python -y
    pip install flask google-genai flask-cors

Usage:
    export GEMINI_API_KEY="your-api-key-here"
    python app.py
"""

import os
import sys
import logging
from flask import Flask, request, jsonify

# Configure clean structured logging for Termux console
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(levelname)s in %(module)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger("termux-gemini-server")

# Import Google GenAI SDK
try:
    from google import genai
    from google.genai import types
    HAS_GENAI = True
except ImportError:
    HAS_GENAI = False
    logger.warning("The 'google-genai' package is not installed. Run: pip install google-genai")

# Optional: Flask-CORS for cross-origin mobile client support
try:
    from flask_cors import CORS
    HAS_CORS = True
except ImportError:
    HAS_CORS = False

# Initialize Flask Application
app = Flask(__name__)

if HAS_CORS:
    CORS(app)  # Enable CORS for all routes to allow web & mobile apps to connect
else:
    @app.after_request
    def add_cors_headers(response):
        """Manual fallback CORS headers if flask_cors is not installed."""
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
        return response

# Initialize Gemini Client
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
MODEL_NAME = "gemini-3.6-flash"

genai_client = None
if HAS_GENAI:
    if not GEMINI_API_KEY:
        logger.warning("GEMINI_API_KEY environment variable is missing! API calls will fail until set.")
    else:
        try:
            # Initialize official google-genai Client
            genai_client = genai.Client(api_key=GEMINI_API_KEY)
            logger.info(f"Initialized Google GenAI client with model: {MODEL_NAME}")
        except Exception as e:
            logger.error(f"Failed to initialize GenAI client: {str(e)}")


@app.route('/', methods=['GET'])
def index():
    """Root endpoint for quick health check & server verification."""
    logger.info("GET / - Health check requested")
    return jsonify({
        "status": "online",
        "service": "Termux Gemini Flask Server",
        "model": MODEL_NAME,
        "sdk": "google-genai",
        "api_key_configured": bool(GEMINI_API_KEY),
        "endpoints": {
            "chat": "POST /api/chat"
        }
    }), 200


@app.route('/api/chat', methods=['POST'])
def chat():
    """
    REST API Endpoint: /api/chat
    Method: POST
    Expects JSON Body: {"prompt": "Your question or text here"}
    Returns JSON: {"response": "AI text", "status": "success", "model": "gemini-2.5-flash"}
    """
    logger.info("POST /api/chat - Received request")

    # 1. Validate Content-Type
    if not request.is_json:
        logger.warning("Request header Content-Type is not application/json")
        return jsonify({
            "error": "Bad Request",
            "message": "Content-Type must be application/json"
        }), 400

    data = request.get_json()

    # 2. Validate Prompt in Payload
    prompt = data.get("prompt") if data else None
    if not prompt or not isinstance(prompt, str) or not prompt.strip():
        logger.warning("Missing or invalid 'prompt' field in JSON request body")
        return jsonify({
            "error": "Bad Request",
            "message": "JSON body must contain a non-empty string field named 'prompt'"
        }), 400

    clean_prompt = prompt.strip()
    logger.info(f"Prompt received ({len(clean_prompt)} chars): '{clean_prompt[:50]}...'")

    # 3. Check GEMINI_API_KEY configuration
    current_key = os.environ.get("GEMINI_API_KEY") or GEMINI_API_KEY
    if not current_key:
        logger.error("GEMINI_API_KEY is not set in environment variables")
        return jsonify({
            "error": "Server Configuration Error",
            "message": "GEMINI_API_KEY environment variable is not set. Please export GEMINI_API_KEY in Termux."
        }), 500

    # 4. Check SDK Availability
    if not HAS_GENAI:
        logger.error("google-genai SDK not installed")
        return jsonify({
            "error": "Missing Dependency",
            "message": "google-genai SDK is missing on the server. Run 'pip install google-genai'."
        }), 500

    # 5. Call Gemini API using google-genai SDK
    try:
        # Create client if needed or re-use key
        client = genai_client or genai.Client(api_key=current_key)
        
        logger.info(f"Sending prompt to Gemini API ({MODEL_NAME})...")
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=clean_prompt
        )

        # Extract text response safely
        ai_response_text = response.text if hasattr(response, 'text') else str(response)

        logger.info(f"Successfully received response from Gemini ({len(ai_response_text)} chars)")
        
        return jsonify({
            "status": "success",
            "model": MODEL_NAME,
            "prompt": clean_prompt,
            "response": ai_response_text
        }), 200

    except Exception as err:
        logger.error(f"Error generating content with Gemini: {str(err)}", exc_info=True)
        return jsonify({
            "error": "Gemini API Error",
            "message": str(err)
        }), 500


if __name__ == '__main__':
    logger.info("=========================================")
    logger.info(" Starting Termux Gemini Flask Server    ")
    logger.info(" Host: 0.0.0.0 | Port: 5000             ")
    logger.info(" Model: gemini-3.6-flash                ")
    logger.info(" Endpoint: POST http://0.0.0.0:5000/api/chat ")
    logger.info("=========================================")
    
    # Run server listening on all interfaces (0.0.0.0) on port 5000
    app.run(host='0.0.0.0', port=5000, debug=True)
`;

export const REQUIREMENTS_TXT = `flask>=3.0.0
google-genai>=1.0.0
flask-cors>=4.0.0
`;

export const APP_MEDIA_STREAMER_CODE = `"""
Termux Video & Media Streaming Server (video_server.py)
=======================================================
Streams local video files (.mp4, .mkv, .avi, .webm) from Android folder (/sdcard/Movies or /sdcard/Download)
live on local network or public web via Termux.

Prerequisites in Termux:
    termux-setup-storage
    pkg update && pkg install python -y
    pip install flask flask-cors

Usage:
    python video_server.py
"""

import os
from flask import Flask, render_template_string, send_from_directory, request, Response

app = Flask(__name__)

# Android Storage Folder containing your video files (.mp4, .mkv, .avi, etc.)
# Run 'termux-setup-storage' first in Termux to grant permission!
MEDIA_FOLDER = "/sdcard/Movies"  # You can change this to /sdcard/Download or any custom path

SUPPORTED_EXTENSIONS = ('.mp4', '.mkv', '.avi', '.webm', '.mov', '.m4v', '.mp3', '.flac')

@app.route('/')
def index():
    files = []
    if os.path.exists(MEDIA_FOLDER):
        for f in os.listdir(MEDIA_FOLDER):
            if f.lower().endswith(SUPPORTED_EXTENSIONS):
                size_mb = round(os.path.getsize(os.path.join(MEDIA_FOLDER, f)) / (1024 * 1024), 2)
                files.append({"name": f, "size": size_mb})
    
    # Sort files alphabetically
    files.sort(key=lambda x: x["name"].lower())

    host_header = request.host

    html = """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Android Termux Media Streamer</title>
        <style>
            * { box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 20px; }
            .container { max-width: 900px; margin: 0 auto; }
            header { background: #1e293b; padding: 20px; border-radius: 12px; border: 1px solid #334155; margin-bottom: 24px; shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
            h1 { color: #10b981; margin: 0 0 10px 0; font-size: 24px; flex-items: center; }
            .badge { background: #065f46; color: #34d399; padding: 4px 10px; border-radius: 20px; font-size: 13px; font-weight: 600; display: inline-block; }
            .card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 18px; margin-bottom: 20px; }
            .card-title { font-size: 16px; font-weight: 600; color: #e2e8f0; margin: 0 0 8px 0; word-break: break-all; }
            .card-meta { font-size: 13px; color: #94a3b8; margin-bottom: 12px; }
            video { width: 100%; max-height: 480px; background: #020817; border-radius: 8px; margin-top: 8px; border: 1px solid #475569; }
            a.link { color: #38bdf8; text-decoration: none; word-break: break-all; font-family: monospace; font-size: 13px; }
            a.link:hover { text-decoration: underline; }
            .code-box { background: #090d16; padding: 10px 14px; border-radius: 6px; font-family: monospace; font-size: 12px; color: #38bdf8; overflow-x: auto; margin-top: 6px; border: 1px solid #1e293b; }
            .no-files { background: #451a03; border: 1px solid #78350f; color: #fde68a; padding: 16px; border-radius: 10px; }
        </style>
    </head>
    <body>
        <div class="container">
            <header>
                <h1>🎬 Android Termux Live Video Server</h1>
                <p style="margin: 4px 0 10px 0; color: #94a3b8; font-size: 14px;">Streaming videos live from Android folder: <code style="color:#10b981;">""" + MEDIA_FOLDER + """</code></p>
                <div>
                    <span class="badge">Total Videos: """ + str(len(files)) + """</span>
                    <span class="badge" style="background: #1e3a8a; color: #93c5fd; margin-left: 8px;">Host: """ + host_header + """</span>
                </div>
            </header>

            {% if files %}
                {% for file in files %}
                <div class="card">
                    <div class="card-title">📹 {{ loop.index }}. {{ file.name }}</div>
                    <div class="card-meta">Size: <strong>{{ file.size }} MB</strong></div>
                    <div style="margin-bottom: 8px;">
                        <span style="font-size: 12px; color: #94a3b8;">Live Direct Stream URL:</span>
                        <div class="code-box">http://{{ host_header }}/stream/{{ file.name }}</div>
                    </div>
                    <video controls preload="metadata">
                        <source src="/stream/{{ file.name }}">
                        Your browser does not support HTML5 video tag.
                    </video>
                </div>
                {% endfor %}
            {% else %}
                <div class="no-files">
                    <h3>⚠️ No Video Files Found</h3>
                    <p>No .mp4, .mkv, .avi, or .webm files were found in folder <code>""" + MEDIA_FOLDER + """</code>.</p>
                    <p><strong>Fixing Tips:</strong></p>
                    <ul>
                        <li>Run <code>termux-setup-storage</code> in Termux and grant permission when prompted.</li>
                        <li>Make sure your videos are inside <code>/sdcard/Movies</code> or change <code>MEDIA_FOLDER</code> in <code>video_server.py</code> to <code>/sdcard/Download</code>.</li>
                    </ul>
                </div>
            {% endif %}
        </div>
    </body>
    </html>
    """
    return render_template_string(html, files=files, host_header=host_header)

@app.route('/stream/<path:filename>')
def stream_media(filename):
    """Streams video file directly with byte-range support for seeking."""
    return send_from_directory(MEDIA_FOLDER, filename)

if __name__ == '__main__':
    print("======================================================")
    print("🎬 Termux Video Streaming Server Started!")
    print(f"📁 Serving Media Folder: {MEDIA_FOLDER}")
    print("🌐 Listening on: http://0.0.0.0:5000")
    print("======================================================")
    app.run(host='0.0.0.0', port=5000, debug=False)
`;

export const VIDEO_TUNNEL_COMMANDS = {
  cloudflare: "cloudflared tunnel --url http://localhost:5000",
  serveo: "ssh -R 80:localhost:5000 serveo.net",
  localtunnel: "npx localtunnel --port 5000"
};


export const TERMUX_SETUP_SCRIPT = `#!/data/data/com.termux/files/usr/bin/bash
# Termux One-Click Setup Script for Gemini Flask Server

echo "=== Updating Termux Packages ==="
pkg update && pkg upgrade -y

echo "=== Installing Python & Dependencies ==="
pkg install python -y

echo "=== Installing Python Libraries ==="
pip install --upgrade pip
pip install flask google-genai flask-cors

echo "=== Creating Project Directory ==="
mkdir -p ~/gemini-server
cd ~/gemini-server

echo "=== Setup Complete! ==="
echo "1. Put app.py inside ~/gemini-server"
echo "2. Set your key: export GEMINI_API_KEY='your_api_key_here'"
echo "3. Run server: python app.py"
`;

export const CLIENT_EXAMPLES = {
  curl: `curl -X POST http://localhost:5000/api/chat \\
  -H "Content-Type: application/json" \\
  -d '{"prompt": "What is the distance to the moon?"}'`,

  python_requests: `import requests

url = "http://localhost:5000/api/chat"
payload = {"prompt": "Write a short poem about Android Termux"}
headers = {"Content-Type": "application/json"}

response = requests.post(url, json=payload)
data = response.json()

if response.status_code == 200:
    print("Gemini AI Response:")
    print(data["response"])
else:
    print(f"Error ({response.status_code}):", data.get("message"))`,

  kotlin_android: `// Kotlin / OkHttp Android snippet
val client = OkHttpClient()
val json = JSONObject().apply {
    put("prompt", "Summarize mobile cloud computing")
}
val body = json.toString().toRequestBody("application/json".toMediaType())

val request = Request.Builder()
    .url("http://192.168.1.100:5000/api/chat") // Replace with Termux device IP or localhost
    .post(body)
    .build()

client.newCall(request).enqueue(object : Callback {
    override fun onFailure(call: Call, e: IOException) {
        println("Request failed: \${e.message}")
    }
    override fun onResponse(call: Call, response: Response) {
        val responseData = response.body?.string()
        println("Server Output: $responseData")
    }
})`,

  dart_flutter: `import 'dart:convert';
import 'http/http.dart' as http;

Future<void> sendPromptToTermux(String promptText) async {
  final url = Uri.parse('http://localhost:5000/api/chat');
  final response = await http.post(
    url,
    headers: {'Content-Type': 'application/json'},
    body: jsonEncode({'prompt': promptText}),
  );

  if (response.statusCode == 200) {
    final data = jsonDecode(response.body);
    print('Gemini Response: \${data["response"]}');
  } else {
    print('Error: \${response.body}');
  }
}`,

  tasker: `# Tasker HTTP Request Action
Method: POST
URL: http://localhost:5000/api/chat
Headers: Content-Type: application/json
Body: {"prompt": "%voice_command_input"}
Output Variable: %http_data`
};
