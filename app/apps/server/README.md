# BioSync Backend Server

Real-time chat server with Socket.IO support for accessible communication.

## Features

- ✅ Real-time messaging with Socket.IO
- ✅ **Bun-optimized Socket.IO engine** with zero-copy message passing
- ✅ High-performance broadcasting using `@socket.io/bun-engine`
- ✅ User online/offline status tracking
- ✅ Message delivery confirmation
- ✅ Support for eye-tracking and accessibility features
- ✅ Typing indicators
- ✅ Read receipts
- ✅ Contact list management with unread counts
- ✅ PostgreSQL database with Drizzle ORM

## Performance

This server uses the **`@socket.io/bun-engine`** package, which provides:

- 🚀 **Zero-copy message passing**: Messages are passed directly without unnecessary copies
- ⚡ **Efficient broadcasting**: Native Bun WebSocket support for faster message delivery
- 🔥 **High throughput**: Takes full advantage of Bun's native HTTP server
- 💪 **Native WebSocket handling**: Uses Bun's built-in WebSocket implementation

The Bun engine integrates the Socket.IO high-level API with Bun's low-level, high-performance server capabilities.

## Setup

1. Install dependencies:
```bash
bun install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your database URL
```

3. Push database schema:
```bash
bun run db:push
```

4. Start the server:
```bash
bun run dev
```

The server will run on:
- HTTP API: `http://localhost:3000`
- Socket.IO (Bun Engine): `http://localhost:3002`
- API Docs: `http://localhost:3000/scalar`

## REST API Routes

### Users

#### `GET /users/me`
Get current user profile (including `isParalyzed` flag for UI rendering).

**Headers:**
```
x-clerk-id: user_123456
```

**Response:**
```json
{
  "clerkId": "user_123456",
  "isParalyzed": false,
  "status": "online",
  "createdAt": "2025-11-06T12:00:00.000Z"
}
```

### Contacts

#### `GET /contacts`
Get all contacts for the current user (friends list).

**Headers:**
```
x-clerk-id: user_123456
```

**Response:**
```json
{
  "contacts": [
    {
      "id": 1,
      "contactClerkId": "user_789",
      "contactName": null,
      "nickname": "John Doe",
      "lastMessagePreview": "Hey, how are you?",
      "lastMessageAt": "2025-11-06T12:30:00.000Z",
      "unreadCount": 3,
      "status": "online",
      "isParalyzed": false
    }
  ]
}
```

### Conversations

#### `GET /conversations`
Get all conversations for current user.

**Headers:**
```
x-clerk-id: user_123456
```

**Response:**
```json
{
  "conversations": [
    {
      "id": 5,
      "otherUserClerkId": "user_789",
      "createdAt": "2025-11-05T10:00:00.000Z",
      "lastMessageAt": "2025-11-06T12:30:00.000Z"
    }
  ]
}
```

#### `GET /conversations/:conversationId/messages`
Get messages in a specific conversation.

**Headers:**
```
x-clerk-id: user_123456
```

**Query Params:**
- `limit` (optional, default: 50) - Number of messages to fetch
- `offset` (optional, default: 0) - Pagination offset

**Example:** `/conversations/5/messages?limit=20&offset=0`

**Response:**
```json
{
  "conversationId": 5,
  "messages": [
    {
      "id": 123,
      "fromClerkId": "user_789",
      "toClerkId": "user_123456",
      "content": "Hey, how are you?",
      "messageType": "text",
      "isRead": true,
      "readAt": "2025-11-06T12:35:00.000Z",
      "createdAt": "2025-11-06T12:30:00.000Z",
      "isMine": false
    }
  ]
}
```

## Socket.IO Events

### Client → Server

#### `register_user`
Register a user connection when they open the app.

```typescript
socket.emit('register_user', {
  clerkId: 'user_123456'
})
```

**Response:**
```typescript
socket.on('registered', (data) => {
  // data = { success: true, clerkId, socketId }
})
```

#### `send_message`
Send a message to another user.

```typescript
socket.emit('send_message', {
  fromClerkId: 'user_123456',
  toClerkId: 'user_789012',
  text: 'Hello, how are you?'
})
```

**Responses:**
- Success: `message_delivered` event
- Failure: `message_failed` event

#### `mark_as_read`
Mark messages as read.

```typescript
socket.emit('mark_as_read', {
  messageIds: [1, 2, 3]
})
```

**Response:**
```typescript
socket.on('messages_read', (data) => {
  // data = { messageIds, readAt }
})
```

#### `typing_start`
Notify when user starts typing.

```typescript
socket.emit('typing_start', {
  fromClerkId: 'user_123456',
  toClerkId: 'user_789012'
})
```

#### `typing_stop`
Notify when user stops typing.

```typescript
socket.emit('typing_stop', {
  fromClerkId: 'user_123456',
  toClerkId: 'user_789012'
})
```

### Server → Client

#### `receive_message`
Receive a new message.

```typescript
socket.on('receive_message', (data) => {
  // data = {
  //   messageId: 123,
  //   from: 'user_123456',
  //   text: 'Hello!',
  //   timestamp: '2025-11-06T10:30:00Z',
  //   conversationId: 1,
  //   messageType: 'text'
  // }
})
```

#### `message_delivered`
Confirmation that your message was delivered.

```typescript
socket.on('message_delivered', (data) => {
  // data = {
  //   messageId: 123,
  //   status: 'delivered', // or 'saved' if user offline
  //   timestamp: '2025-11-06T10:30:00Z'
  // }
})
```

#### `message_failed`
Your message failed to send.

```typescript
socket.on('message_failed', (data) => {
  // data = { error: 'Error message' }
})
```

#### `user_typing`
Another user is typing.

```typescript
socket.on('user_typing', (data) => {
  // data = { userId: 'user_123456', isTyping: true }
})
```

## Database Schema

### Why This Design? (Answering Your Question)

You asked: *"why are there multiple clerk_id columns in users table?"*

**Answer:** There aren't! The `users` table only has **one** `clerk_id` column (the primary key). 

The **multiple foreign key columns** you're seeing are in the **`contacts` table**, which is the **correct relational database pattern** for many-to-many relationships.

### How It Works:

```
┌─────────────────────────────────────────────────────────────┐
│                      USERS TABLE                            │
│  ┌─────────────┬──────────────┬─────────┬──────────────┐  │
│  │  clerk_id   │ is_paralyzed │ status  │  created_at  │  │
│  │    (PK)     │   boolean    │ varchar │  timestamp   │  │
│  ├─────────────┼──────────────┼─────────┼──────────────┤  │
│  │ user_123    │    false     │ online  │  2025-11-06  │  │
│  │ user_456    │    true      │ offline │  2025-11-05  │  │
│  │ user_789    │    false     │ online  │  2025-11-04  │  │
│  └─────────────┴──────────────┴─────────┴──────────────┘  │
└─────────────────────────────────────────────────────────────┘

                              ↓ references

┌─────────────────────────────────────────────────────────────┐
│              CONTACTS TABLE (Junction Table)                │
│  ┌────┬─────────────────┬──────────────────┬──────────┐   │
│  │ id │ user_clerk_id   │ contact_clerk_id │ nickname │   │
│  │    │  (FK→users)     │   (FK→users)     │          │   │
│  ├────┼─────────────────┼──────────────────┼──────────┤   │
│  │ 1  │ user_123        │ user_456         │ "John"   │   │ ← user_123's contact list
│  │ 2  │ user_123        │ user_789         │ "Sarah"  │   │ ← user_123's contact list
│  │ 3  │ user_456        │ user_123         │ "Bob"    │   │ ← user_456's contact list
│  └────┴─────────────────┴──────────────────┴──────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**This design allows:**
- User A to have multiple contacts (multiple rows where `user_clerk_id = 'user_A'`)
- Each contact is just a reference to another user in the `users` table
- **No duplicate data** - user info stored once in `users` table
- **Optimal SQL pattern** - This is the standard way to model friendships/contacts

### Database Tables:

#### users
- `clerk_id` (PK) - Clerk user ID
- `is_paralyzed` - Boolean flag for UI rendering (shows eye-tracking mode vs regular chat)
- `status` - online/offline
- `created_at` - Account creation timestamp

#### contacts (Junction Table for User Relationships)
- `id` (PK)
- `user_clerk_id` (FK → users) - User who owns this contact
- `contact_clerk_id` (FK → users) - The contact user (also in users table)
- `nickname` - Optional custom name
- `last_message_preview` - Last message text preview (denormalized for performance)
- `last_message_at` - Timestamp of last message
- `unread_count` - Number of unread messages (denormalized for performance)
- `created_at` - When contact was added

#### conversations
- `id` (PK)
- `user1_clerk_id` (FK → users)
- `user2_clerk_id` (FK → users)
- `created_at`
- `last_message_at`

#### messages
- `id` (PK)
- `conversation_id` (FK → conversations)
- `from_clerk_id` (FK → users)
- `to_clerk_id` (FK → users)
- `content` - Message text
- `message_type` - Message type ('text' for regular messages, extensible for future features)
- `is_read` - Boolean
- `read_at` - Timestamp when read
- `created_at`

## Message Flow

1. **User A opens app** → Emits `register_user` with clerk_id
2. **Backend stores** → `activeUsers.set('user_123456', 'socket_abc123')`
3. **User A sends message** → Emits `send_message`
4. **Backend processes**:
   - Finds/creates conversation
   - Saves message to database
   - Updates contact's unread count
   - Looks up receiver's socket ID
   - Sends message ONLY to receiver's socket
   - Sends delivery confirmation to sender
5. **User B receives** → `receive_message` event
6. **User A gets confirmation** → `message_delivered` event

## Development

- `bun run dev` - Start development server with hot reload
- `bun run db:push` - Push schema changes to database
- `bun run db:studio` - Open Drizzle Studio
- `bun run build` - Build for production

## Architecture

```
Frontend (Next.js) ←→ Socket.IO (Port 3002) ←→ Backend Logic
                                              ↓
                                         PostgreSQL
                                         (Drizzle ORM)
```

## Error Handling

All socket events include error handling:
- Missing fields → `message_failed` with error details
- User not found → Error message
- Database errors → Logged and error emitted
- Offline users → Message saved, status returned

## Security Notes

- CORS configured for frontend origin
- Clerk ID used for authentication
- Socket.IO connection validated on each event
- User status updated on connect/disconnect

## Contributing

This is part of the BioSync monorepo. See main README for contribution guidelines.
