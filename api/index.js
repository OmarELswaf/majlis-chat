// Vercel serverless entry: REST endpoints only.
// NOTE: WebSockets (Socket.io) do not run on Vercel serverless functions, so the
// deployed demo serves the REST API here and the client runs in its clearly
// labeled simulated-demo mode. The full realtime server runs locally / on any
// long-lived host: `npm install && npm run dev`.
process.env.DATA_MODE = process.env.DATA_MODE || 'memory';

const { createApp } = require('../server/src/app');
const { createStore } = require('../server/src/store');

let appPromise;

module.exports = async (req, res) => {
  if (!appPromise) {
    appPromise = createStore({ storeMode: 'memory' }).then((store) => createApp(store));
  }
  const app = await appPromise;
  return app(req, res);
};
