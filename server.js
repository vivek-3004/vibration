const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// Just 2 phones - keep it simple
let phones = [];

io.on('connection', (socket) => {
  console.log(`📱 Phone connected: ${socket.id}`);
  phones.push(socket.id);
  
  // Tell everyone how many phones are connected
  io.emit('status', { count: phones.length });
  
  // When one phone buzzes, vibrate the OTHER phone
  socket.on('buzz', () => {
    const otherPhone = phones.find(id => id !== socket.id);
    if (otherPhone) {
      io.to(otherPhone).emit('vibrate');
      console.log(`⚡ Buzz: ${socket.id} → ${otherPhone}`);
    }
  });
  
  socket.on('disconnect', () => {
    phones = phones.filter(id => id !== socket.id);
    io.emit('status', { count: phones.length });
    console.log(`📱 Phone disconnected: ${socket.id}`);
  });
});

server.listen(3000, '0.0.0.0', () => {
  console.log(`\n🚀 Server running on port 3000`);
  console.log(`📱 Phones can connect now\n`);
});
