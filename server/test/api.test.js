const { test, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const { createApp } = require('../src/app');
const { createStore } = require('../src/store');

let server, base, store;

before(async () => {
  store = await createStore({ storeMode: 'memory' });
  server = http.createServer(createApp(store));
  await new Promise((r) => server.listen(0, r));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

test('health reports ok and demo memory mode', async () => {
  const res = await fetch(`${base}/api/health`);
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.status, 'ok');
  assert.equal(body.store, 'memory');
  assert.equal(body.demo, true);
});

test('rooms are seeded with demo data', async () => {
  const res = await fetch(`${base}/api/rooms`);
  const { rooms } = await res.json();
  assert.equal(res.status, 200);
  assert.ok(rooms.length >= 3);
  const general = rooms.find((r) => r.id === 'general');
  assert.ok(general);
  assert.ok(general.messageCount > 0);
  assert.ok(general.lastMessage);
});

test('list messages of a room', async () => {
  const res = await fetch(`${base}/api/rooms/general/messages`);
  const { room, messages } = await res.json();
  assert.equal(res.status, 200);
  assert.equal(room.id, 'general');
  assert.ok(messages.length > 0);
  assert.ok(messages[0].at <= messages[messages.length - 1].at);
});

test('post a message, then read it back', async () => {
  const res = await fetch(`${base}/api/rooms/tech/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user: 'Tester', text: 'hello from the test suite' }),
  });
  assert.equal(res.status, 201);
  const { message } = await res.json();
  assert.equal(message.user, 'Tester');

  const list = await (await fetch(`${base}/api/rooms/tech/messages`)).json();
  assert.ok(list.messages.some((m) => m.id === message.id));
});

test('validation: empty text rejected', async () => {
  const res = await fetch(`${base}/api/rooms/tech/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user: 'Tester', text: '   ' }),
  });
  assert.equal(res.status, 400);
});

test('validation: overlong text rejected', async () => {
  const res = await fetch(`${base}/api/rooms/tech/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user: 'Tester', text: 'x'.repeat(501) }),
  });
  assert.equal(res.status, 400);
});

test('unknown room returns 404', async () => {
  const res = await fetch(`${base}/api/rooms/nope/messages`);
  assert.equal(res.status, 404);
  const post = await fetch(`${base}/api/rooms/nope/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user: 'Tester', text: 'hi' }),
  });
  assert.equal(post.status, 404);
});
