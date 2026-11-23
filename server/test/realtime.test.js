const { test, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const { io: ioc } = require('socket.io-client');
const { createApp } = require('../src/app');
const { attachRealtime } = require('../src/realtime');
const { createStore } = require('../src/store');

let server, base, store, io;

before(async () => {
  store = await createStore({ storeMode: 'memory' });
  server = http.createServer(createApp(store));
  io = attachRealtime(server, store);
  await new Promise((r) => server.listen(0, r));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  io.close();
  server.close();
});

function connect() {
  return new Promise((resolve, reject) => {
    const s = ioc(base, { transports: ['websocket'] });
    s.on('connect', () => resolve(s));
    s.on('connect_error', reject);
  });
}

function once(socket, event, timeoutMs = 3000) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout waiting for ${event}`)), timeoutMs);
    socket.once(event, (data) => {
      clearTimeout(t);
      resolve(data);
    });
  });
}

test('join room, send message, second client receives it live', async () => {
  const a = await connect();
  const b = await connect();
  try {
    a.emit('room:join', { roomId: 'general', user: 'Alice' });
    await once(a, 'room:joined');
    b.emit('room:join', { roomId: 'general', user: 'Bob' });
    await once(b, 'room:joined');

    const received = once(b, 'message:new');
    const ack = await new Promise((r) =>
      a.emit('message:send', { roomId: 'general', user: 'Alice', text: 'socket hello' }, r)
    );
    assert.equal(ack.ok, true);
    const msg = await received;
    assert.equal(msg.text, 'socket hello');
    assert.equal(msg.user, 'Alice');

    // persisted too
    const list = await (await fetch(`${base}/api/rooms/general/messages`)).json();
    assert.ok(list.messages.some((m) => m.id === msg.id));
  } finally {
    a.close();
    b.close();
  }
});

test('presence lists joined users and updates on disconnect', async () => {
  const a = await connect();
  const b = await connect();
  try {
    a.emit('room:join', { roomId: 'random', user: 'Solo' });
    await once(a, 'room:joined');

    const presenceSeen = new Promise((resolve) => {
      b.on('room:presence', (p) => {
        if (p.users.includes('Solo') && p.users.includes('Duo')) resolve(p);
      });
    });
    b.emit('room:join', { roomId: 'random', user: 'Duo' });
    const p = await presenceSeen;
    assert.ok(p.users.includes('Solo'));
    assert.ok(p.users.includes('Duo'));

    const afterLeave = new Promise((resolve) => {
      b.on('room:presence', (q) => {
        if (!q.users.includes('Solo')) resolve(q);
      });
    });
    a.close();
    const q = await afterLeave;
    assert.deepEqual(q.users, ['Duo']);
  } finally {
    b.close();
  }
});

test('typing indicator reaches other members only', async () => {
  const a = await connect();
  const b = await connect();
  try {
    a.emit('room:join', { roomId: 'tech', user: 'Typer' });
    await once(a, 'room:joined');
    b.emit('room:join', { roomId: 'tech', user: 'Reader' });
    await once(b, 'room:joined');

    const seen = once(b, 'typing');
    a.emit('typing', { roomId: 'tech', user: 'Typer' });
    const t = await seen;
    assert.equal(t.user, 'Typer');
  } finally {
    a.close();
    b.close();
  }
});

test('invalid socket message is acked with an error, nothing stored', async () => {
  const a = await connect();
  try {
    a.emit('room:join', { roomId: 'general', user: 'Val' });
    await once(a, 'room:joined');
    const before = (await (await fetch(`${base}/api/rooms/general/messages`)).json()).messages.length;
    const ack = await new Promise((r) =>
      a.emit('message:send', { roomId: 'general', user: 'Val', text: '' }, r)
    );
    assert.equal(ack.ok, false);
    const afterCount = (await (await fetch(`${base}/api/rooms/general/messages`)).json()).messages.length;
    assert.equal(afterCount, before);
  } finally {
    a.close();
  }
});
