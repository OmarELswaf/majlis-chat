// MongoDB store via Mongoose: used when MONGODB_URI is set (full local/prod run).
const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  _id: String,
  name: { type: String, required: true },
  topic: { type: String, default: '' },
});

const messageSchema = new mongoose.Schema({
  roomId: { type: String, required: true, index: true },
  user: { type: String, required: true },
  text: { type: String, required: true },
  at: { type: Date, default: Date.now },
});

async function createMongoStore(uri, { maxMessagesPerRoom = 500 } = {}) {
  await mongoose.connect(uri);
  const Room = mongoose.models.Room || mongoose.model('Room', roomSchema);
  const Message = mongoose.models.Message || mongoose.model('Message', messageSchema);

  const defaults = [
    { _id: 'general', name: 'General', topic: 'Everyday talk' },
    { _id: 'tech', name: 'Tech', topic: 'Code, tools and side projects' },
    { _id: 'random', name: 'Random', topic: 'Anything goes' },
  ];
  for (const r of defaults) {
    await Room.updateOne({ _id: r._id }, { $setOnInsert: r }, { upsert: true });
  }

  const toMessage = (m) => ({ id: String(m._id), roomId: m.roomId, user: m.user, text: m.text, at: m.at.toISOString() });

  async function listRooms() {
    const rooms = await Room.find().lean();
    return Promise.all(
      rooms.map(async (r) => {
        const messageCount = await Message.countDocuments({ roomId: r._id });
        const last = await Message.findOne({ roomId: r._id }).sort({ at: -1 }).lean();
        return { id: r._id, name: r.name, topic: r.topic, messageCount, lastMessage: last ? toMessage(last) : null };
      })
    );
  }

  async function getRoom(roomId) {
    const r = await Room.findById(roomId).lean();
    return r ? { id: r._id, name: r.name, topic: r.topic } : null;
  }

  async function listMessages(roomId, limit = 50) {
    const msgs = await Message.find({ roomId }).sort({ at: -1 }).limit(limit).lean();
    return msgs.reverse().map(toMessage);
  }

  async function addMessage({ roomId, user, text }) {
    const m = await Message.create({ roomId, user, text });
    const extra = await Message.find({ roomId }).sort({ at: -1 }).skip(maxMessagesPerRoom).select('_id').lean();
    if (extra.length) await Message.deleteMany({ _id: { $in: extra.map((x) => x._id) } });
    return toMessage(m);
  }

  async function close() {
    await mongoose.disconnect();
  }

  return { mode: 'mongo', listRooms, getRoom, listMessages, addMessage, close };
}

module.exports = { createMongoStore };
