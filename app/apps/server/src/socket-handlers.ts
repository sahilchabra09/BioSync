import { Server, Socket } from "socket.io";
import { db } from "./db/connections";
import { usersTable, conversationsTable, messagesTable, contactsTable } from "./db/schema";
import { eq, and, or } from "drizzle-orm";

// Store active users: clerk_id -> socket_id
const activeUsers = new Map<string, string>();

interface SendMessageData {
  fromClerkId: string;
  toClerkId: string;
  text: string;
}

interface RegisterUserData {
  clerkId: string;
}

export function setupSocketHandlers(io: Server) {
  io.on("connection", (socket: Socket) => {
    console.log(`[Socket] New connection: ${socket.id}`);

    // ===== STEP 1: User Registration =====
    socket.on("register_user", async (data: RegisterUserData) => {
      const { clerkId } = data;

      if (!clerkId) {
        console.error("[Socket] register_user: Missing clerkId");
        return;
      }

      // Store the mapping
      activeUsers.set(clerkId, socket.id);
      console.log(`[Socket] Registered user: ${clerkId} -> ${socket.id}`);
      console.log(`[Socket] Active users count: ${activeUsers.size}`);

      // Update user status to online in database
      try {
        await db
          .update(usersTable)
          .set({ status: "online" })
          .where(eq(usersTable.clerkId, clerkId));
        console.log(`[Socket] Updated ${clerkId} status to online`);
      } catch (error) {
        console.error("[Socket] Error updating user status:", error);
      }

      // Send confirmation back to user
      socket.emit("registered", {
        success: true,
        clerkId,
        socketId: socket.id,
      });
    });

    // ===== STEP 2: Send Message =====
    socket.on("send_message", async (data: SendMessageData) => {
      const { fromClerkId, toClerkId, text } = data;

      console.log(`[Socket] Message from ${fromClerkId} to ${toClerkId}: "${text}"`);

      if (!fromClerkId || !toClerkId || !text) {
        socket.emit("message_failed", {
          error: "Missing required fields",
        });
        return;
      }

      try {
        // === Find or create conversation ===
        let conversation = await db
          .select()
          .from(conversationsTable)
          .where(
            or(
              and(
                eq(conversationsTable.user1ClerkId, fromClerkId),
                eq(conversationsTable.user2ClerkId, toClerkId)
              ),
              and(
                eq(conversationsTable.user1ClerkId, toClerkId),
                eq(conversationsTable.user2ClerkId, fromClerkId)
              )
            )
          )
          .limit(1);

        let conversationId: number;

        if (conversation.length === 0) {
          // Create new conversation
          const [newConversation] = await db
            .insert(conversationsTable)
            .values({
              user1ClerkId: fromClerkId,
              user2ClerkId: toClerkId,
              lastMessageAt: new Date(),
            })
            .returning();

          if (!newConversation) {
            throw new Error("Failed to create conversation");
          }

          conversationId = newConversation.id;
          console.log(`[Socket] Created new conversation: ${conversationId}`);
        } else {
          if (!conversation[0]) {
            throw new Error("Conversation not found");
          }
          
          conversationId = conversation[0].id;
          
          // Update last message timestamp
          await db
            .update(conversationsTable)
            .set({ lastMessageAt: new Date() })
            .where(eq(conversationsTable.id, conversationId));

          console.log(`[Socket] Using existing conversation: ${conversationId}`);
        }

        // === Save message to database ===
        const [savedMessage] = await db
          .insert(messagesTable)
          .values({
            conversationId,
            fromClerkId,
            toClerkId,
            content: text,
            messageType: "text",
            isRead: false,
            createdAt: new Date(),
          })
          .returning();

        if (!savedMessage) {
          throw new Error("Failed to save message");
        }

        console.log(`[Socket] ✅ Message saved to DB: ${savedMessage.id}`);

        // === Update contact's last message preview and unread count ===
        // For receiver's contact list
        const existingContact = await db
          .select()
          .from(contactsTable)
          .where(
            and(
              eq(contactsTable.userClerkId, toClerkId),
              eq(contactsTable.contactClerkId, fromClerkId)
            )
          )
          .limit(1);

        if (existingContact.length > 0) {
          const contact = existingContact[0];
          if (contact) {
            await db
              .update(contactsTable)
              .set({
                lastMessagePreview: text.substring(0, 100),
                lastMessageAt: new Date(),
                unreadCount: contact.unreadCount + 1,
              })
              .where(eq(contactsTable.id, contact.id));
          }
        } else {
          // Create contact entry if doesn't exist
          await db.insert(contactsTable).values({
            userClerkId: toClerkId,
            contactClerkId: fromClerkId,
            lastMessagePreview: text.substring(0, 100),
            lastMessageAt: new Date(),
            unreadCount: 1,
          });
        }

        // === Find receiver's socket ===
        const receiverSocketId = activeUsers.get(toClerkId);

        if (receiverSocketId) {
          // Receiver is online - send message
          io.to(receiverSocketId).emit("receive_message", {
            messageId: savedMessage.id,
            from: fromClerkId,
            text: text,
            timestamp: savedMessage.createdAt,
            conversationId,
            messageType: savedMessage.messageType,
          });
          console.log(`[Socket] ✅ Sent to receiver's socket: ${receiverSocketId}`);

          // Send delivery confirmation to sender
          socket.emit("message_delivered", {
            messageId: savedMessage.id,
            status: "delivered",
            timestamp: savedMessage.createdAt,
          });
          console.log(`[Socket] ✅ Sent delivery confirmation to sender`);
        } else {
          // Receiver is offline
          console.log(`[Socket] ⚠️ Receiver offline: ${toClerkId}`);
          
          socket.emit("message_delivered", {
            messageId: savedMessage.id,
            status: "saved",
            timestamp: savedMessage.createdAt,
            note: "User is offline, message saved",
          });
        }
      } catch (error) {
        console.error("[Socket] Error handling message:", error);
        socket.emit("message_failed", {
          error: "Failed to send message",
          details: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });

    // ===== STEP 3: Mark messages as read =====
    socket.on("mark_as_read", async (data: { messageIds: number[] }) => {
      const { messageIds } = data;

      if (!messageIds || messageIds.length === 0) {
        return;
      }

      try {
        const messageId = messageIds[0];
        if (messageId !== undefined) {
          await db
            .update(messagesTable)
            .set({
              isRead: true,
              readAt: new Date(),
            })
            .where(eq(messagesTable.id, messageId));

          console.log(`[Socket] ✅ Marked messages as read: ${messageIds.join(", ")}`);

          socket.emit("messages_read", {
            messageIds,
            readAt: new Date(),
          });
        }
      } catch (error) {
        console.error("[Socket] Error marking messages as read:", error);
      }
    });

    // ===== STEP 4: Typing indicator =====
    socket.on("typing_start", (data: { fromClerkId: string; toClerkId: string }) => {
      const { fromClerkId, toClerkId } = data;
      const receiverSocketId = activeUsers.get(toClerkId);

      if (receiverSocketId) {
        io.to(receiverSocketId).emit("user_typing", {
          userId: fromClerkId,
          isTyping: true,
        });
      }
    });

    socket.on("typing_stop", (data: { fromClerkId: string; toClerkId: string }) => {
      const { fromClerkId, toClerkId } = data;
      const receiverSocketId = activeUsers.get(toClerkId);

      if (receiverSocketId) {
        io.to(receiverSocketId).emit("user_typing", {
          userId: fromClerkId,
          isTyping: false,
        });
      }
    });

    // ===== STEP 5: User Disconnect =====
    socket.on("disconnect", async () => {
      console.log(`[Socket] Disconnected: ${socket.id}`);

      // Find and remove user from activeUsers
      let disconnectedUserId: string | null = null;

      for (const [clerkId, socketId] of activeUsers.entries()) {
        if (socketId === socket.id) {
          disconnectedUserId = clerkId;
          activeUsers.delete(clerkId);
          console.log(`[Socket] Removed user from active list: ${clerkId}`);
          break;
        }
      }

      // Update user status to offline
      if (disconnectedUserId) {
        try {
          await db
            .update(usersTable)
            .set({ status: "offline" })
            .where(eq(usersTable.clerkId, disconnectedUserId));
          console.log(`[Socket] Updated ${disconnectedUserId} status to offline`);
        } catch (error) {
          console.error("[Socket] Error updating user status on disconnect:", error);
        }
      }

      console.log(`[Socket] Active users count: ${activeUsers.size}`);
    });
  });

  console.log("[Socket] Socket.IO handlers registered");
}
