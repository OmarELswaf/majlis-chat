// Socket.io realtime layer: rooms, presence, live messages, typing indicators.
const { Server } = require('socket.io');
const { messageSchema } = require('./app');
const config = require('./config');

function attachRealtime(httpServer, store) {
  const io = new Server(httpServer, {
    cors: { origin: config.clientOrigin === '*' ? true : [config.clientOrigin] },
  });

  // roomId -> Map<socketId, user>
  const presence = new Map();

  function roomUsers(roomId) {
    return [...new Set([...(presence.get(roomId) || new Map()).values()])];
  }

  function broadcastPresence(roomId) {
    io.to(roomId).emit('room:presence', { roomId, users: roomUsers(roomId) });
  }

  io.on('connection', (socket) => {
    socket.data.rooms = new Set();

    socket.on('room:join', async (payload = {}) => {
      const { roomId, user } = payload;
      if (typeof roomId !== 'string' || typeof user !== 'string' || !user.trim()) return;
      const room = await store.getRoom(roomId);
      if (!room) return socket.emit('error:message', { error: 'room_not_found' });
      socket.join(roomId);
      socket.data.rooms.add(roomId);
      if (!presence.has(roomId)) presence.set(roomId, new Map());
      presence.get(roomId).set(socket.id, user.trim().slice(0, 30));
      socket.emit('room:joined', { room });
      socket.emit('room:presence', { roomId, users: roomUsers(roomId) });
      socket.to(roomId).emit('room:presence', { roomId, users: roomUsers(roomId) });
    });

    socket.on('message:send', async (payload = {}, ack) => {
      const roomId = payload && payload.roomId;
      const room = typeof roomId === 'string' ? await store.getRoom(roomId) : null;
      if (!room) return ack && ack({ ok: false, error: 'room_not_found' });
      const parsed = messageSchema.safeParse(payload);
      if (!parsed.success) {
        return ack && ack({ ok: false, error: parsed.error.issues[0]?.message || 'invalid_message' });
      }
      const msg = await store.addMessage({ roomId: room.id, ...parsed.data });
      io.to(room.id).emit('message:new', msg);
      if (ack) ack({ ok: true, message: msg });
    });

    socket.on('typing', (payload = {}) => {
      const { roomId, user } = payload;
      if (typeof roomId !== 'string' || typeof user !== 'string') return;
      socket.to(roomId).emit('typing', { roomId, user: user.slice(0, 30) });
    });

    socket.on('disconnect', () => {
      for (const roomId of socket.data.rooms) {
        const users = presence.get(roomId);
        if (users) {
          users.delete(socket.id);
          if (!users.size) presence.delete(roomId);
          broadcastPresence(roomId);
        }
      }
    });
  });

  return io;
}

module.exports = { attachRealtime };
