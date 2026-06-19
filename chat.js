import { randomUUID } from 'node:crypto';

const DEFAULT_USER_LIMIT = 100;

const normalizeChatValue = (value, maxLength) => String(value ?? '')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, maxLength);

const normalizeSenderId = value => normalizeChatValue(value, 80)
  .replace(/[^a-zA-Z0-9_-]/g, '')
  .slice(0, 80);

const normalizeLocationCode = value => normalizeChatValue(value, 2).toUpperCase();
const isLegacyDefaultName = value => /^Guest [A-Z0-9]{1,4}$/i.test(value);

const generateDefaultName = async (ChatUser, locationCode) => {
  const prefix = locationCode === 'US' ? 'engineer' : 'developer';
  const pattern = new RegExp(`^${prefix}\\d+$`, 'i');
  let number = await ChatUser.countDocuments({ name: pattern }).exec();
  let name;

  do {
    number += 1;
    name = `${prefix}${number}`;
  } while (await ChatUser.exists({ name }).exec());

  return name;
};

const personalRoom = senderId => `chat-user:${senderId}`;
const serializeChatUser = (user, onlineIds) => ({
  id: user.senderId,
  name: user.name,
  online: onlineIds.has(user.senderId),
  lastSeen: new Date(user.lastSeen).toISOString()
});

export const registerChatHandlers = (io, {
  ChatUser,
  userLimit = DEFAULT_USER_LIMIT
}) => {
  const emitUsers = async () => {
    try {
      const users = await ChatUser.find({})
        .sort({ lastSeen: -1 })
        .limit(userLimit)
        .lean()
        .exec();
      const onlineIds = new Set(
        users
          .filter(user => (io.sockets.adapter.rooms.get(personalRoom(user.senderId))?.size || 0) > 0)
          .map(user => user.senderId)
      );
      io.emit('chat:users', users.map(user => serializeChatUser(user, onlineIds)));
      io.emit('chat:presence', { count: onlineIds.size });
    } catch (error) {
      console.error('Chat user list error:', error);
    }
  };

  io.on('connection', async socket => {
    const senderId = normalizeSenderId(socket.handshake.auth?.senderId) || socket.id;
    const requestedName = normalizeChatValue(socket.handshake.auth?.senderName, 60);
    const locationCode = normalizeLocationCode(socket.handshake.auth?.locationCode);
    let senderName = requestedName;

    socket.data.senderId = senderId;
    socket.data.recipientId = '';
    socket.data.lastMessageAt = 0;
    socket.join(personalRoom(senderId));

    try {
      if (!senderName) {
        const existingUser = await ChatUser.findOne({ senderId }).lean().exec();
        senderName = existingUser?.name && !isLegacyDefaultName(existingUser.name)
          ? existingUser.name
          : await generateDefaultName(ChatUser, locationCode);
      }

      await ChatUser.findOneAndUpdate(
        { senderId },
        { $set: { name: senderName, lastSeen: new Date() } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      ).exec();
      socket.data.senderName = senderName;
      socket.emit('chat:identity', { id: senderId, name: senderName });
      await emitUsers();
    } catch (error) {
      senderName ||= locationCode === 'US' ? 'engineer1' : 'developer1';
      socket.data.senderName = senderName;
      console.error('Chat user registration error:', error);
      socket.emit('chat:error', { message: 'Unable to register chat profile' });
    }

    socket.on('chat:open', async (payload, acknowledge) => {
      const reply = typeof acknowledge === 'function' ? acknowledge : () => {};
      const recipientId = normalizeSenderId(payload?.recipientId);

      if (!recipientId || recipientId === senderId) {
        return reply({ ok: false, error: 'Select another developer' });
      }

      try {
        const recipient = await ChatUser.findOne({ senderId: recipientId }).lean().exec();
        if (!recipient) return reply({ ok: false, error: 'Developer is unavailable' });

        socket.data.recipientId = recipientId;
        socket.emit('chat:history', {
          participant: serializeChatUser(recipient, new Set([
            ...(io.sockets.adapter.rooms.get(personalRoom(recipientId))?.size ? [recipientId] : [])
          ])),
          messages: []
        });
        reply({ ok: true });
      } catch (error) {
        console.error('Chat history error:', error);
        reply({ ok: false, error: 'Unable to load conversation' });
      }
    });

    socket.on('chat:message', async (payload, acknowledge) => {
      const reply = typeof acknowledge === 'function' ? acknowledge : () => {};
      const now = Date.now();
      const text = normalizeChatValue(payload?.text, 1000);
      const recipientId = socket.data.recipientId;

      if (!recipientId) return reply({ ok: false, error: 'Select a developer first' });
      if (!text) return reply({ ok: false, error: 'Message cannot be empty' });
      if (now - socket.data.lastMessageAt < 500) {
        return reply({ ok: false, error: 'Please wait before sending another message' });
      }
      socket.data.lastMessageAt = now;

      try {
        const message = {
          id: randomUUID(),
          senderId,
          recipientId,
          senderName,
          text,
          createdAt: new Date().toISOString()
        };

        io.to(personalRoom(senderId))
          .to(personalRoom(recipientId))
          .emit('chat:message', message);
        reply({ ok: true });
      } catch (error) {
        console.error('Chat message error:', error);
        reply({ ok: false, error: 'Unable to send message' });
      }
    });

    socket.on('disconnect', async () => {
      try {
        await ChatUser.updateOne({ senderId }, { $set: { lastSeen: new Date() } }).exec();
        await emitUsers();
      } catch (error) {
        console.error('Chat disconnect update error:', error);
      }
    });
  });
};
