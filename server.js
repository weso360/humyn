const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve React build in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client/build')));
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', rooms: rooms.size });
});

// Track rooms: roomId -> { sender: socketId | null, senderToken: string | null, viewers: Set<socketId> }
const rooms = new Map();

io.on('connection', (socket) => {
  console.log(`[+] Connected: ${socket.id}`);

  // --- SENDER joins a room ---
  // Anyone who knows a room's viewer link also knows its roomId, so without this check a second
  // person could open /send/<same-id> and silently hijack an active stream. The first sender to
  // claim a room gets a token back; only that token (or an empty/dead room) can claim it after.
  socket.on('sender-join', ({ roomId, token }, ack) => {
    if (!rooms.has(roomId)) {
      rooms.set(roomId, { sender: null, senderToken: null, viewers: new Set() });
    }
    const room = rooms.get(roomId);

    const isHijack = room.sender && room.sender !== socket.id && token !== room.senderToken;
    if (isHijack) {
      console.log(`[SENDER] ${socket.id} rejected — room ${roomId} already has an active sender`);
      if (typeof ack === 'function') ack({ ok: false, reason: 'taken' });
      return;
    }

    const senderToken = room.senderToken || crypto.randomBytes(12).toString('hex');
    room.sender = socket.id;
    room.senderToken = senderToken;
    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.role = 'sender';

    console.log(`[SENDER] ${socket.id} joined room ${roomId}`);

    // Notify any existing viewers that a sender is available
    socket.to(roomId).emit('sender-available');
    if (typeof ack === 'function') ack({ ok: true, token: senderToken });
  });

  // --- VIEWER joins a room ---
  socket.on('viewer-join', ({ roomId }) => {
    if (!rooms.has(roomId)) {
      rooms.set(roomId, { sender: null, viewers: new Set() });
    }
    const room = rooms.get(roomId);
    room.viewers.add(socket.id);
    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.role = 'viewer';

    console.log(`[VIEWER] ${socket.id} joined room ${roomId}`);

    // Tell viewer if a sender is live
    if (room.sender) {
      socket.emit('sender-available');
    }
  });

  // --- WebRTC signaling: viewer requests an offer from sender ---
  socket.on('request-offer', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (room?.sender) {
      // Tell the sender to create an offer for this specific viewer
      io.to(room.sender).emit('create-offer', { viewerId: socket.id });
    }
  });

  // --- Sender sends offer to a specific viewer ---
  socket.on('offer', ({ viewerId, sdp }) => {
    io.to(viewerId).emit('offer', { senderId: socket.id, sdp });
  });

  // --- Viewer sends answer back to sender ---
  socket.on('answer', ({ senderId, sdp }) => {
    io.to(senderId).emit('answer', { viewerId: socket.id, sdp });
  });

  // --- ICE candidates relay ---
  socket.on('ice-candidate', ({ targetId, candidate }) => {
    io.to(targetId).emit('ice-candidate', { fromId: socket.id, candidate });
  });

  // --- Sender updates stream quality info ---
  socket.on('stream-info', ({ roomId, width, height, fps, label }) => {
    socket.to(roomId).emit('stream-info', { width, height, fps, label });
  });

  // --- Disconnect cleanup ---
  socket.on('disconnect', () => {
    const { roomId, role } = socket.data;
    if (!roomId || !rooms.has(roomId)) return;

    const room = rooms.get(roomId);

    if (role === 'sender') {
      room.sender = null;
      socket.to(roomId).emit('sender-disconnected');
      console.log(`[SENDER] ${socket.id} left room ${roomId}`);
    } else if (role === 'viewer') {
      room.viewers.delete(socket.id);
      console.log(`[VIEWER] ${socket.id} left room ${roomId}`);
    }

    // Cleanup empty rooms
    if (!room.sender && room.viewers.size === 0) {
      rooms.delete(roomId);
      console.log(`[ROOM] ${roomId} deleted (empty)`);
    }
  });
});

// Catch-all for React in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
  });
}

// Only auto-listen when run directly (`node server.js` / `npm start`) — tests require() this
// module and control their own port/lifecycle instead.
if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`🎥 StreamLink signaling server running on port ${PORT}`);
  });
}

module.exports = { server, io };
