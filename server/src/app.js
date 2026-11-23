const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { z } = require('zod');
const config = require('./config');

const messageSchema = z.object({
  user: z.string().trim().min(1, 'user is required').max(30, 'user too long'),
  text: z.string().trim().min(1, 'text is required').max(config.maxMessageLength, 'text too long'),
});

function createApp(store, hooks = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(express.json({ limit: '10kb' }));

  app.use(
    '/api',
    cors({
      origin: (origin, cb) => {
        if (!origin || origin === config.clientOrigin) return cb(null, true);
        cb(null, false);
      },
    })
  );

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', store: store.mode, demo: store.mode === 'memory' });
  });

  app.get('/api/rooms', async (req, res) => {
    res.json({ rooms: await store.listRooms() });
  });

  app.get('/api/rooms/:roomId/messages', async (req, res) => {
    const room = await store.getRoom(req.params.roomId);
    if (!room) return res.status(404).json({ error: 'room_not_found', message: 'Room not found' });
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    res.json({ room, messages: await store.listMessages(room.id, limit) });
  });

  app.post('/api/rooms/:roomId/messages', async (req, res) => {
    const room = await store.getRoom(req.params.roomId);
    if (!room) return res.status(404).json({ error: 'room_not_found', message: 'Room not found' });
    const parsed = messageSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'invalid_message',
        message: parsed.error.issues[0]?.message || 'Invalid message',
      });
    }
    const msg = await store.addMessage({ roomId: room.id, ...parsed.data });
    if (hooks.onMessage) hooks.onMessage(msg);
    res.status(201).json({ message: msg });
  });

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    res.status(500).json({ error: 'server_error', message: 'Something went wrong' });
  });

  return app;
}

module.exports = { createApp, messageSchema };
