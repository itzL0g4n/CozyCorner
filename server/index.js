import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Serve static files from the React build (dist)
const distPath = join(__dirname, '../dist');
app.use(express.static(distPath));

// Socket.io Signaling Logic
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', (roomId, userData) => {
    socket.join(roomId);
    
    // Notify others in the room
    socket.to(roomId).emit('user-connected', {
      socketId: socket.id,
      user: userData
    });

    // Send list of existing users to the new user
    const usersInRoom = Array.from(io.sockets.adapter.rooms.get(roomId) || []);
    const existingUsers = usersInRoom
        .filter(id => id !== socket.id)
        .map(id => ({ socketId: id })); // We could store full user data in memory if needed

    socket.emit('all-users', existingUsers);
  });

  // Relay WebRTC Signals (Offer, Answer, ICE Candidate)
  socket.on('signal', (payload) => {
    // payload: { target: targetSocketId, signal: { ... } }
    io.to(payload.target).emit('signal', {
      sender: socket.id,
      signal: payload.signal
    });
  });

  // Relay User State Updates (Name, Mute status, Desk items)
  socket.on('state-update', (payload) => {
    // payload: { roomId, updates: { ... } }
    socket.to(payload.roomId).emit('state-update', {
      socketId: socket.id,
      updates: payload.updates
    });
  });

  // Relay Whiteboard Actions
  socket.on('whiteboard-action', (payload) => {
    // payload: { roomId, action: { ... } }
    socket.to(payload.roomId).emit('whiteboard-action', {
      socketId: socket.id,
      action: payload.action
    });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    // Broadcast to all rooms this user was in
    // Note: socket.rooms is cleared on disconnect, so we handle this via broadcast before full cleanup usually,
    // but io.emit sends to everyone. For efficiency, we rely on the client to handle stream closure,
    // but here we can emit a global event or just let the peer connection fail.
    // Better:
    socket.broadcast.emit('user-disconnected', socket.id);
  });
});

// Handle React Routing (SPA)
app.get('*', (req, res) => {
  res.sendFile(join(distPath, 'index.html'));
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});