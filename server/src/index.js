const http = require('http');
const { createApp } = require('./app');
const { attachRealtime } = require('./realtime');
const { createStore } = require('./store');
const config = require('./config');

async function main() {
  const store = await createStore();
  const app = createApp(store);
  const server = http.createServer(app);
  attachRealtime(server, store);

  server.listen(config.port, () => {
    console.log(`majlis-server listening on :${config.port} (store: ${store.mode})`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
