// Ciscord Voice Signaling Server
const { WebSocketServer } = require('ws');

let wss = null;
const connectedPeers = new Map();

function startVoiceServer(port = 8080) {
  if (wss) {
    console.log('[Voice Server] Already running');
    return;
  }

  wss = new WebSocketServer({ port });
  console.log(`[Voice Server] 🚀 Running on ws://localhost:${port}`);

  wss.on('connection', (ws) => {
    const userId = 'User_' + Math.random().toString(36).substring(2, 7);
    connectedPeers.set(userId, ws);
    const currentPeers = Array.from(connectedPeers.keys()).filter(id => id !== userId);
    console.log(`[Voice Server] User connected: ${userId} (existing peers: ${currentPeers.length})`);

    // Send welcome with list of already-connected peers
    ws.send(JSON.stringify({
      type: 'welcome',
      id: userId,
      peers: currentPeers
    }));

    // Notify existing peers about the new user
    broadcast({ type: 'peer-joined', id: userId }, userId);

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        
        // Handle broadcast messages (e.g., leave notifications)
        if (data.type === 'leave') {
          console.log(`[Voice Server] User ${userId} leaving call`);
          broadcast({ type: 'peer-left', id: userId }, userId);
          return;
        }
        
        const targetSocket = connectedPeers.get(data.target);

        if (targetSocket && targetSocket.readyState === 1) { // 1 = OPEN
          data.sender = userId;
          targetSocket.send(JSON.stringify(data));
          console.log(`[Voice Server] Forwarded ${data.type} from ${userId} to ${data.target}`);
        } else {
          console.warn(`[Voice Server] Target ${data.target} not found or not open (readyState: ${targetSocket ? targetSocket.readyState : 'null'})`);
        }
      } catch (err) {
        console.error('[Voice Server] Signaling error:', err);
      }
    });

    ws.on('close', () => {
      connectedPeers.delete(userId);
      console.log(`[Voice Server] User disconnected: ${userId} (remaining: ${connectedPeers.size})`);
      broadcast({ type: 'peer-left', id: userId });
    });

    ws.on('error', (err) => {
      console.error(`[Voice Server] WebSocket error for ${userId}:`, err.message);
    });
  });

  wss.on('error', (err) => {
    console.error('[Voice Server] Server error:', err);
  });
}

function broadcast(message, skipId = null) {
  const payload = JSON.stringify(message);
  connectedPeers.forEach((ws, id) => {
    if (id !== skipId && ws.readyState === 1) { // 1 = WebSocket.OPEN
      ws.send(payload);
    }
  });
}

function stopVoiceServer() {
  if (wss) {
    wss.close();
    wss = null;
    connectedPeers.clear();
    console.log('[Voice Server] Stopped');
  }
}

module.exports = { startVoiceServer, stopVoiceServer };
