const config = require('../config');
const { createMemoryStore } = require('./memory');

async function createStore(overrides = {}) {
  const mode = overrides.storeMode || config.storeMode;
  if (mode === 'mongo') {
    const { createMongoStore } = require('./mongo');
    return createMongoStore(overrides.mongoUri || config.mongoUri, {
      maxMessagesPerRoom: config.maxMessagesPerRoom,
    });
  }
  return createMemoryStore({ maxMessagesPerRoom: config.maxMessagesPerRoom });
}

module.exports = { createStore };
