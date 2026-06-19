import assert from 'node:assert/strict';
import test from 'node:test';
import { registerChatHandlers } from './chat.js';

class FakeIO {
  constructor() {
    this.handlers = new Map();
    this.broadcasts = [];
    this.rooms = new Map();
    this.sockets = { adapter: { rooms: this.rooms } };
  }

  on(event, handler) {
    this.handlers.set(event, handler);
  }

  emit(event, payload) {
    this.broadcasts.push({ rooms: [], event, payload });
  }

  to(room) {
    const rooms = [room];
    const operator = {
      to: nextRoom => {
        rooms.push(nextRoom);
        return operator;
      },
      emit: (event, payload) => this.broadcasts.push({ rooms, event, payload })
    };
    return operator;
  }
}

class FakeSocket {
  constructor(
    io,
    auth = { senderId: ' user-1 ', senderName: '', locationCode: 'US' },
    id = 'socket-1'
  ) {
    this.io = io;
    this.id = id;
    this.handshake = { auth };
    this.data = {};
    this.handlers = new Map();
    this.emitted = [];
  }

  join(room) {
    const members = this.io.rooms.get(room) || new Set();
    members.add(this.id);
    this.io.rooms.set(room, members);
  }

  on(event, handler) {
    this.handlers.set(event, handler);
  }

  emit(event, payload) {
    this.emitted.push({ event, payload });
  }
}

test('chat handler assigns a US engineer name and relays messages without persistence', async () => {
  const io = new FakeIO();
  const users = [
    { senderId: 'user-1', name: 'engineer1', lastSeen: new Date('2026-01-02T00:00:00Z') },
    { senderId: 'user-2', name: 'Other Developer', lastSeen: new Date('2026-01-01T00:00:00Z') }
  ];
  const ChatUser = {
    find: () => ({
      sort: () => ({ limit: () => ({ lean: () => ({ exec: async () => [...users] }) }) })
    }),
    countDocuments: () => ({ exec: async () => 0 }),
    exists: () => ({ exec: async () => null }),
    findOneAndUpdate: () => ({ exec: async () => users[0] }),
    findOne: query => ({ lean: () => ({
      exec: async () => query.senderId === 'user-1'
        ? null
        : users.find(user => user.senderId === query.senderId) || null
    }) }),
    updateOne: () => ({ exec: async () => ({ acknowledged: true }) })
  };
  registerChatHandlers(io, { ChatUser });
  const socket = new FakeSocket(io);
  await io.handlers.get('connection')(socket);
  const recipientSocket = new FakeSocket(io, {
    senderId: 'user-2',
    senderName: 'Other Developer',
    locationCode: 'CA'
  }, 'socket-2');
  await io.handlers.get('connection')(recipientSocket);

  assert.equal(socket.data.senderId, 'user-1');
  assert.equal(socket.data.senderName, 'engineer1');
  assert.equal(socket.emitted.find(item => item.event === 'chat:identity').payload.name, 'engineer1');
  assert.equal(io.broadcasts.find(item => item.event === 'chat:users').payload.length, 2);

  const openReply = await new Promise(resolve => {
    socket.handlers.get('chat:open')({ recipientId: 'user-2' }, resolve);
  });
  assert.equal(openReply.ok, true);
  const historyEvent = socket.emitted.find(item => item.event === 'chat:history');
  assert.equal(historyEvent.payload.participant.name, 'Other Developer');
  assert.equal(historyEvent.payload.messages.length, 0);

  const reply = await new Promise(resolve => {
    socket.handlers.get('chat:message')({ text: '  Hello   team  ' }, resolve);
  });
  assert.equal(reply.ok, true);
  const broadcast = io.broadcasts.find(item => item.event === 'chat:message');
  assert.deepEqual(broadcast.rooms, ['chat-user:user-1', 'chat-user:user-2']);
  assert.equal(broadcast.payload.recipientId, 'user-2');
  assert.equal(broadcast.payload.text, 'Hello team');
  assert.equal('status' in broadcast.payload, false);
  assert.match(broadcast.payload.id, /^[0-9a-f-]{36}$/);

  io.rooms.delete('chat-user:user-2');
  socket.data.lastMessageAt = 0;
  const offlineReply = await new Promise(resolve => {
    socket.handlers.get('chat:message')({ text: 'Are you there?' }, resolve);
  });
  assert.equal(offlineReply.ok, true);
  const offlineMessage = io.broadcasts.filter(item => item.event === 'chat:message').at(-1);
  assert.equal('status' in offlineMessage.payload, false);
});

test('chat handler assigns the next developer name outside the US', async () => {
  const io = new FakeIO();
  let savedName = '';
  const ChatUser = {
    find: () => ({
      sort: () => ({ limit: () => ({ lean: () => ({ exec: async () => [] }) }) })
    }),
    countDocuments: () => ({ exec: async () => 1 }),
    exists: () => ({ exec: async () => null }),
    findOne: () => ({ lean: () => ({ exec: async () => null }) }),
    findOneAndUpdate: (query, update) => ({
      exec: async () => {
        savedName = update.$set.name;
        return { senderId: query.senderId, ...update.$set };
      }
    }),
    updateOne: () => ({ exec: async () => ({ acknowledged: true }) })
  };

  registerChatHandlers(io, { ChatUser });
  const socket = new FakeSocket(io, {
    senderId: 'user-3',
    senderName: '',
    locationCode: 'CA'
  });
  await io.handlers.get('connection')(socket);

  assert.equal(savedName, 'developer2');
  assert.equal(socket.data.senderName, 'developer2');
  assert.equal(socket.emitted.find(item => item.event === 'chat:identity').payload.name, 'developer2');
});
