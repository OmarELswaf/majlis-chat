// Simulated demo transport: same event surface as the live Socket.io backend,
// running fully in the browser with clearly labeled bot participants.
// Used only when the realtime server is not reachable (e.g. the Vercel demo,
// where WebSockets are unavailable) - the UI states this openly.

const BOT_LINES = {
  general: [
    'Anyone up to something this weekend?',
    'I finally organized my desk. New person.',
    'Tea or coffee for late work nights?',
    'Just came back from a walk, highly recommend.',
  ],
  tech: [
    'Tried the new Vite release yet? Builds feel faster.',
    'Hot take: most apps do not need microservices.',
    'I keep a makefile in every project now. Life changing.',
    'Socket.io reconnection logic saved my demo yesterday.',
  ],
  random: [
    'Plot twist: the bug was a missing comma.',
    'Day 4 of naming my plants after databases.',
    'Unpopular opinion: Cairo traffic builds character.',
  ],
};

const REPLIES = [
  'Good point.',
  'Ha, fair enough.',
  'I was just thinking the same.',
  'Interesting, tell me more.',
  'True, seen that happen before.',
];

const now = () => new Date().toISOString();
const minsAgo = (n) => new Date(Date.now() - n * 60 * 1000).toISOString();
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
let seq = 0;
const mid = () => `demo-${Date.now()}-${seq++}`;

const seedRooms = () => ([
  { id: 'general', name: 'General', topic: 'Everyday talk' },
  { id: 'tech', name: 'Tech', topic: 'Code, tools and side projects' },
  { id: 'random', name: 'Random', topic: 'Anything goes' },
]);

const seedMessages = () => ({
  general: [
    { id: mid(), roomId: 'general', user: 'Salma', text: 'Morning everyone, how is the week treating you?', at: minsAgo(42) },
    { id: mid(), roomId: 'general', user: 'Karim', text: 'Quiet so far. Finishing a side project today.', at: minsAgo(38) },
    { id: mid(), roomId: 'general', user: 'Nour', text: 'Nice, what stack?', at: minsAgo(36) },
    { id: mid(), roomId: 'general', user: 'Karim', text: 'Node + React, nothing fancy but it ships.', at: minsAgo(31) },
  ],
  tech: [
    { id: mid(), roomId: 'tech', user: 'Nour', text: 'Anyone moved an Express app to serverless? Websockets are the pain point.', at: minsAgo(25) },
    { id: mid(), roomId: 'tech', user: 'Salma', text: 'Socket.io needs a long-lived server. Render or a small VPS works.', at: minsAgo(19) },
    { id: mid(), roomId: 'tech', user: 'Karim', text: 'Or fall back to polling for the demo and document it honestly.', at: minsAgo(12) },
  ],
  random: [
    { id: mid(), roomId: 'random', user: 'Salma', text: 'Coffee count today: 3. Send help.', at: minsAgo(9) },
  ],
});

export function createDemoTransport() {
  const rooms = seedRooms();
  const messages = seedMessages();
  const botsByRoom = {
    general: ['Salma', 'Karim'],
    tech: ['Nour', 'Salma'],
    random: ['Karim', 'Nour'],
  };
  const listeners = { message: new Set(), presence: new Set(), typing: new Set() };
  const timers = new Set();
  let currentRoom = null;
  let currentUser = null;

  const emit = (kind, data) => listeners[kind].forEach((cb) => cb(data));

  function later(fn, ms) {
    const t = setTimeout(() => {
      timers.delete(t);
      fn();
    }, ms);
    timers.add(t);
  }

  function botSays(roomId, user, text) {
    emit('typing', { roomId, user });
    later(() => {
      const msg = { id: mid(), roomId, user, text, at: now(), demo: true };
      messages[roomId].push(msg);
      emit('message', msg);
    }, 900 + Math.random() * 900);
  }

  function scheduleAmbient() {
    if (!currentRoom) return;
    later(() => {
      if (currentRoom) {
        const user = pick(botsByRoom[currentRoom]);
        botSays(currentRoom, user, pick(BOT_LINES[currentRoom]));
        scheduleAmbient();
      }
    }, 14000 + Math.random() * 14000);
  }

  return {
    mode: 'demo',
    async fetchRooms() {
      return rooms.map((r) => ({
        ...r,
        messageCount: (messages[r.id] || []).length,
        lastMessage: (messages[r.id] || []).slice(-1)[0] || null,
      }));
    },
    async fetchMessages(roomId) {
      return (messages[roomId] || []).slice(-50);
    },
    join(roomId, user) {
      currentRoom = roomId;
      currentUser = user;
      const users = [user, ...botsByRoom[roomId]];
      later(() => emit('presence', { roomId, users }), 250);
      scheduleAmbient();
    },
    send(roomId, user, text) {
      const msg = { id: mid(), roomId, user, text, at: now() };
      messages[roomId].push(msg);
      later(() => emit('message', msg), 60);
      // a bot reacts to what the user said
      const bot = pick(botsByRoom[roomId].filter((b) => b !== user));
      later(() => botSays(roomId, bot, pick(REPLIES)), 1600 + Math.random() * 1800);
      return msg;
    },
    sendTyping() {},
    onMessage(cb) { listeners.message.add(cb); return () => listeners.message.delete(cb); },
    onPresence(cb) { listeners.presence.add(cb); return () => listeners.presence.delete(cb); },
    onTyping(cb) { listeners.typing.add(cb); return () => listeners.typing.delete(cb); },
    disconnect() {
      timers.forEach(clearTimeout);
      timers.clear();
      currentRoom = null;
    },
  };
}
