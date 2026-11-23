// In-memory store: default for tests and demo mode.
// Seeded with demo rooms and demo messages so the app is explorable immediately.
const crypto = require('crypto');

const now = Date.now();
const mins = (n) => new Date(now - n * 60 * 1000).toISOString();

function seed() {
  return {
    rooms: [
      { id: 'general', name: 'General', topic: 'Everyday talk', demo: true },
      { id: 'tech', name: 'Tech', topic: 'Code, tools and side projects', demo: true },
      { id: 'random', name: 'Random', topic: 'Anything goes', demo: true },
    ],
    messages: {
      general: [
        { id: crypto.randomUUID(), roomId: 'general', user: 'Salma', text: 'Morning everyone, how is the week treating you?', at: mins(42) },
        { id: crypto.randomUUID(), roomId: 'general', user: 'Karim', text: 'Quiet so far. Finishing a side project today.', at: mins(38) },
        { id: crypto.randomUUID(), roomId: 'general', user: 'Nour', text: 'Nice, what stack?', at: mins(36) },
        { id: crypto.randomUUID(), roomId: 'general', user: 'Karim', text: 'Node + React, nothing fancy but it ships.', at: mins(31) },
      ],
      tech: [
        { id: crypto.randomUUID(), roomId: 'tech', user: 'Nour', text: 'Anyone moved an Express app to serverless? Websockets are the pain point.', at: mins(25) },
        { id: crypto.randomUUID(), roomId: 'tech', user: 'Salma', text: 'Socket.io needs a long-lived server. Render or a small VPS works.', at: mins(19) },
        { id: crypto.randomUUID(), roomId: 'tech', user: 'Karim', text: 'Or fall back to polling for the demo and document it honestly.', at: mins(12) },
      ],
      random: [
        { id: crypto.randomUUID(), roomId: 'random', user: 'Salma', text: 'Coffee count today: 3. Send help.', at: mins(9) },
      ],
    },
  };
}

function createMemoryStore({ maxMessagesPerRoom = 500 } = {}) {
  const state = seed();

  async function listRooms() {
    return state.rooms.map((r) => ({
      ...r,
      messageCount: (state.messages[r.id] || []).length,
      lastMessage: (state.messages[r.id] || []).slice(-1)[0] || null,
    }));
  }

  async function getRoom(roomId) {
    return state.rooms.find((r) => r.id === roomId) || null;
  }

  async function listMessages(roomId, limit = 50) {
    const msgs = state.messages[roomId] || [];
    return msgs.slice(-limit);
  }

  async function addMessage({ roomId, user, text }) {
    if (!state.messages[roomId]) state.messages[roomId] = [];
    const msg = { id: crypto.randomUUID(), roomId, user, text, at: new Date().toISOString() };
    state.messages[roomId].push(msg);
    if (state.messages[roomId].length > maxMessagesPerRoom) {
      state.messages[roomId] = state.messages[roomId].slice(-maxMessagesPerRoom);
    }
    return msg;
  }

  async function close() {}

  return { mode: 'memory', listRooms, getRoom, listMessages, addMessage, close };
}

module.exports = { createMemoryStore };
