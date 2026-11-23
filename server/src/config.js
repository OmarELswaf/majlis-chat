module.exports = {
  port: process.env.PORT || 4100,
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  mongoUri: process.env.MONGODB_URI || null,
  // memory: volatile in-process store (tests, demo). mongo: Mongoose models (full local/prod run).
  storeMode: process.env.MONGODB_URI ? 'mongo' : 'memory',
  maxMessageLength: 500,
  maxMessagesPerRoom: 500,
};
