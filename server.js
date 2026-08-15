const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { 
  cors: { origin: "*" },
  maxHttpBufferSize: 1e6 
});

// Simple homepage
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Vibration Server</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: -apple-system, sans-serif;
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          margin: 0;
          padding: 20px;
        }
        .box {
          background: rgba(255,255,255,0.1);
          padding: 40px;
          border-radius: 20px;
          text-align: center;
          backdrop-filter: blur(10px);
        }
        h1 { margin: 0 0 10px; }
        .status { font-size: 18px; margin-top: 20px; }
        .dot {
          display: inline-block;
          width: 10px;
          height: 10px;
          background: #4ade80;
          border-radius: 50%;
          animation: pulse 1.5s infinite;
          margin-right: 8px;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      </style>
    </head>
    <body>
      <div class="box">
        <h1>📳 Vibration Server</h1>
        <p>Server is running!</p>
        <div class="status">
          <span class="dot"></span>
          <span id="count">0</span>/2 phones connected
        </div>
        <p style="font-size:12px;opacity:0.7;margin-top:20px;">
          (Web browsers don't count as phones)
        </p>
      </div>
      <script src="/socket.io/socket.io.js"></script>
      <script>
        const socket = io();
        socket.on('status', (data) => {
          document.getElementById('count').textContent = data.count;
        });
      </script>
    </body>
    </html>
  `);
});

// Track only REAL phones (not browser tabs)
let phones = [];
const MAX_PHONES = 2;

io.on('connection', (socket) => {
  // Check if this is a phone or a browser
  const userAgent = socket.handshake.headers['user-agent'] || '';
  const isPhone = socket.handshake.auth?.isPhone === true;
  
  console.log(`🔌 Connection from: ${userAgent.substring(0, 50)}...`);
  console.log(`📱 Is phone? ${isPhone}`);

  // Only accept phone connections, ignore browser tabs
  if (!isPhone) {
    console.log(`🌐 Ignoring browser/web connection: ${socket.id}`);
    // Still let it connect for status display, but don't count it
    socket.emit('status', { count: phones.length });
    socket.on('disconnect', () => {});
    return;
  }

  // Limit to MAX_PHONES
  if (phones.length >= MAX_PHONES) {
    console.log(`⚠️  Max phones reached, rejecting: ${socket.id}`);
    socket.emit('error', { message: 'Server is full (2/2 phones connected)' });
    socket.disconnect(true);
    return;
  }

  console.log(`📱 Phone connected: ${socket.id} (Total: ${phones.length + 1})`);
  phones.push(socket.id);
  io.emit('status', { count: phones.length });

  // When one phone buzzes, vibrate the OTHER phone
  socket.on('buzz', () => {
    const otherPhone = phones.find(id => id !== socket.id);
    if (otherPhone) {
      io.to(otherPhone).emit('vibrate');
      console.log(`⚡ Buzz: ${socket.id} → ${otherPhone}`);
    } else {
      console.log(`⚠️  Buzz ignored - only 1 phone connected`);
    }
  });

  socket.on('disconnect', () => {
    console.log(`📱 Phone disconnected: ${socket.id}`);
    phones = phones.filter(id => id !== socket.id);
    io.emit('status', { count: phones.length });
  });
});

// Render-compatible port
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Max phones: ${MAX_PHONES}`);
});
