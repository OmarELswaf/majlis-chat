import { io } from 'socket.io-client';
import { createDemoTransport } from './demoSim';

// Live transport: Socket.io + REST against the real backend (local dev or a
// long-lived host). Demo transport: in-browser simulation, clearly labeled in
// the UI. VITE_CHAT_MODE=demo forces demo mode (set for the Vercel build,
// where WebSockets are unavailable); otherwise we try live and fall back.

function createLiveTransport() {
  const socket = io('/', { transports: ['websocket', 'polling'] });
  const listeners = { message: new Set(), presence: new Set(), typing: new Set() };

  socket.on('message:new', (m) => listeners.message.forEach((cb) => cb(m)));
  socket.on('room:presence', (p) => listeners.presence.forEach((cb) => cb(p)));
  socket.on('typing', (t) => listeners.typing.forEach((cb) => cb(t)));

  return {
    mode: 'live',
    socket,
    async fetchRooms() {
      const res = await fetch('/api/rooms');
      if (!res.ok) throw new Error('rooms failed');
      return (await res.json()).rooms;
    },
    async fetchMessages(roomId) {
      const res = await fetch(`/api/rooms/${roomId}/messages`);
      if (!res.ok) throw new Error('messages failed');
      return (await res.json()).messages;
    },
    join(roomId, user) {
      socket.emit('room:join', { roomId, user });
    },
    send(roomId, user, text) {
      socket.emit('message:send', { roomId, user, text });
    },
    sendTyping(roomId, user) {
      socket.emit('typing', { roomId, user });
    },
    onMessage(cb) { listeners.message.add(cb); return () => listeners.message.delete(cb); },
    onPresence(cb) { listeners.presence.add(cb); return () => listeners.presence.delete(cb); },
    onTyping(cb) { listeners.typing.add(cb); return () => listeners.typing.delete(cb); },
    disconnect() { socket.disconnect(); },
  };
}

export async function createTransport() {
  if (import.meta.env.VITE_CHAT_MODE === 'demo') {
    return createDemoTransport();
  }
  try {
    const res = await fetch('/api/health', { signal: AbortSignal.timeout(4000) });
    if (!res.ok) throw new Error('no backend');
    const body = await res.json();
    if (body.demo) return createDemoTransport();
    return createLiveTransport();
  } catch {
    return createDemoTransport();
  }
}
