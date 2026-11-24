/* Diagnostic main: captures renderer console + load failures. */
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const http = require('http');
const https = require('https');
const fs = require('fs');
const { startVoiceServer } = require('./voice-server');

app.disableHardwareAcceleration();

let serverPort = 3000;
const voicePort = 8080;

// AI API Configuration (SECURE - Server-side only)
// Users can provide their own API keys via settings menu
let userAiSettings = null; // Will be set via IPC from renderer

// Default config (fallback if user hasn't set their own)
let aiConfig = {
  provider: 'alibaba',
  api_key: '', // Empty - users must provide their own
  api_url: 'https://coding-intl.dashscope.aliyuncs.com/v1/chat/completions',
  model: 'qwen-plus',
  enabled: true,
  rate_limit: {
    max_requests_per_minute: 10,
    max_tokens_per_day: 100000
  }
};

try {
  const configPath = path.join(__dirname, 'config.json');
  if (fs.existsSync(configPath)) {
    const userConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (userConfig.ai) {
      aiConfig = { ...aiConfig, ...userConfig.ai };
    }
  }
} catch (err) {
  console.warn('[CONFIG] Error loading config.json, using defaults:', err.message);
}

// Use user settings if available, otherwise use default config
function getActiveAiConfig() {
  if (userAiSettings && userAiSettings.apiKey) {
    return {
      provider: userAiSettings.provider,
      api_key: userAiSettings.apiKey,
      api_url: userAiSettings.apiUrl,
      model: userAiSettings.model,
      enabled: true
    };
  }
  return aiConfig;
}

const AI_ENABLED = aiConfig.enabled !== false;

// Rate limiting (simple in-memory tracking)
const requestLog = new Map();
let dailyTokenCount = 0;
let lastResetDate = new Date().toDateString();

function checkRateLimit(userId) {
  const now = Date.now();
  const minuteAgo = now - 60000;
  
  // Reset daily counter if new day
  const today = new Date().toDateString();
  if (today !== lastResetDate) {
    dailyTokenCount = 0;
    lastResetDate = today;
  }
  
  // Check daily limit
  if (dailyTokenCount >= aiConfig.rate_limit.max_tokens_per_day) {
    return { allowed: false, reason: 'Daily token limit reached' };
  }
  
  // Check per-minute limit
  if (!requestLog.has(userId)) {
    requestLog.set(userId, []);
  }
  const userRequests = requestLog.get(userId).filter(t => t > minuteAgo);
  if (userRequests.length >= aiConfig.rate_limit.max_requests_per_minute) {
    return { allowed: false, reason: 'Rate limit: max 10 requests per minute' };
  }
  
  userRequests.push(now);
  requestLog.set(userId, userRequests);
  return { allowed: true };
}

// Send message to AI API (SECURE - API key never exposed to client)
function sendToAIAPI(message, userId = 'anonymous') {
  return new Promise((resolve, reject) => {
    const activeConfig = getActiveAiConfig();
    
    if (!AI_ENABLED) {
      return reject(new Error('AI integration is disabled'));
    }
    
    if (!activeConfig.api_key) {
      return reject(new Error('No API key configured. Please add your API key in AI Settings.'));
    }
    
    // Check rate limit
    const rateCheck = checkRateLimit(userId);
    if (!rateCheck.allowed) {
      return reject(new Error(rateCheck.reason));
    }
    
    const payload = JSON.stringify({
      model: activeConfig.model,
      messages: [
        { role: 'user', content: message }
      ],
      stream: false
    });
    
    const url = new URL(activeConfig.api_url);
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${activeConfig.api_key}`,
        'Content-Length': Buffer.byteLength(payload)
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (res.statusCode === 200 && response.choices && response.choices[0]) {
            const reply = response.choices[0].message.content;
            const tokensUsed = response.usage?.total_tokens || 0;
            dailyTokenCount += tokensUsed;
            console.log(`[AI] Reply sent, tokens: ${tokensUsed}, daily total: ${dailyTokenCount}`);
            resolve({ 
              success: true, 
              reply: reply,
              tokens: tokensUsed,
              model: response.model || activeConfig.model,
              provider: activeConfig.provider
            });
          } else {
            reject(new Error(response.error?.message || `API error: ${res.statusCode}`));
          }
        } catch (e) {
          reject(new Error('Failed to parse AI response'));
        }
      });
    });
    
    req.on('error', (err) => {
      console.error(`[AI] Error: ${err.message}`);
      reject(err);
    });
    
    req.write(payload);
    req.end();
  });
}

// Create local HTTP server for Firebase Auth compatibility
function startServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      let filePath = req.url === '/' ? '/index.html' : req.url;
      filePath = filePath.split('?')[0];
      filePath = decodeURIComponent(filePath);
      
      const fullPath = path.join(__dirname, filePath);
      
      fs.readFile(fullPath, (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end('Not found');
          return;
        }
        
        const ext = path.extname(fullPath).toLowerCase();
        const mimeTypes = {
          '.html': 'text/html; charset=utf-8',
          '.js': 'application/javascript; charset=utf-8',
          '.css': 'text/css; charset=utf-8',
          '.json': 'application/json; charset=utf-8',
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.gif': 'image/gif',
          '.svg': 'image/svg+xml',
          '.ico': 'image/x-icon'
        };
        const mimeType = mimeTypes[ext] || 'application/octet-stream';
        
        res.writeHead(200, { 'Content-Type': mimeType });
        res.end(data);
      });
    });
    
    server.listen(serverPort, '0.0.0.0', () => {
      console.log(`[SERVER] Running on http://0.0.0.0:${serverPort}`);
      console.log(`[SERVER] Local access: http://localhost:${serverPort}`);
      console.log(`[SERVER] Network access: http://<YOUR_IP>:${serverPort}`);
      resolve(server);
    });
    
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        serverPort++;
        server.listen(serverPort, '0.0.0.0');
      } else {
        reject(err);
      }
    });
  });
}

// Handle window control IPC from preload
ipcMain.handle('win-control', (event, action) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return;
  switch (action) {
    case 'minimize': win.minimize(); break;
    case 'maximize': win.isMaximized() ? win.unmaximize() : win.maximize(); break;
    case 'close': win.close(); break;
  }
});

// Handle DeepSeek API message IPC (SECURE - API key stays server-side)
ipcMain.handle('deepseek-send', async (event, message) => {
  if (!AI_ENABLED) {
    return { success: false, error: 'AI integration is disabled' };
  }
  
  // Get user ID from the event (for rate limiting)
  const userId = event.sender.id || 'anonymous';
  
  try {
    const result = await sendToAIAPI(message, userId);
    return result;
  } catch (err) {
    console.error(`[AI IPC] Error: ${err.message}`);
    return { success: false, error: err.message };
  }
});

// Handle AI settings save from renderer
ipcMain.handle('ai-save-settings', async (event, settings) => {
  try {
    userAiSettings = {
      provider: settings.provider,
      apiKey: settings.apiKey,
      apiUrl: settings.apiUrl,
      model: settings.model
    };
    console.log(`[AI] User settings saved for provider: ${settings.provider}`);
    return { success: true };
  } catch (err) {
    console.error(`[AI] Error saving settings: ${err.message}`);
    return { success: false, error: err.message };
  }
});

app.whenReady().then(async () => {
  await startServer();
  startVoiceServer(voicePort);
  
  const win = new BrowserWindow({
    width: 1320, height: 860, show: false,
    backgroundColor: '#12161b',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  win.webContents.on('console-message', (e, level, message, line, sourceId) => {
    console.log(`[RENDERER:${level}] ${message}  @${(sourceId||'').split('/').pop()}:${line}`);
  });
  win.webContents.on('did-fail-load', (e, code, desc, url) => {
    console.log(`[LOAD-FAIL] ${code} ${desc} ${url}`);
  });
  win.webContents.on('render-process-gone', (e, d) => {
    console.log('[GONE] ' + JSON.stringify(d));
  });

  win.loadURL(`http://localhost:${serverPort}`);

  win.webContents.on('did-finish-load', () => {
    win.show();
    console.log('[DIAG] Application window finished loading.');
  });
});
