require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { ExpressPeerServer } = require('peer');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 9000;

// Set up the regular HTTP server
const server = app.listen(PORT, () => {
  console.log(`[SyncDrop] Backend Server running on port ${PORT}`);
});

// Attach PeerJS to the Express Server
const peerServer = ExpressPeerServer(server, {
  path: '/'
});

peerServer.on('connection', (client) => {
  console.log(`[+] Client connected: ${client.getId()}`);
});

peerServer.on('disconnect', (client) => {
  console.log(`[-] Client disconnected: ${client.getId()}`);
});

app.use('/peerjs', peerServer);

// Endpoint to securely provide TURN/ICE credentials
app.get('/api/turn', async (req, res) => {
  try {
    const meteredKey = process.env.METERED_TURN_API_KEY;
    
    // Default fallback to public STUN if no key is configured
    let iceServers = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun.cloudflare.com:3478' }
    ];

    if (meteredKey && meteredKey !== 'your_metered_api_key_here') {
      // Fetch dynamic ephemeral credentials from Metered.ca using the user's specific domain
      const meteredDomain = process.env.METERED_DOMAIN || 'api.metered.ca';
      const response = await axios.get(`https://${meteredDomain}/api/v1/turn/credentials?apiKey=${meteredKey}`);
      if (response.data && response.data.length > 0) {
        iceServers = response.data;
      }
    } else {
      console.warn("[TURN] No METERED_TURN_API_KEY configured in .env. Falling back to free STUN-only (NAT traversal may fail on strict networks).");
    }

    res.json({ iceServers });
  } catch (error) {
    console.error("[TURN] Error fetching credentials:", error.message);
    // Even if it fails, send the public STUN servers so the app doesn't break
    res.json({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun.cloudflare.com:3478' }
      ]
    });
  }
});

// Basic health check
app.get('/', (req, res) => res.send('SyncDrop Signaling & TURN API Server is running.'));
