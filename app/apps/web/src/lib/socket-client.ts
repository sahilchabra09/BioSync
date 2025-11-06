import { io, Socket } from "socket.io-client";

interface Message {
  messageId: number;
  from: string;
  text: string;
  timestamp: Date;
  conversationId: number;
  messageType: string;
}

interface DeliveryConfirmation {
  messageId: number;
  status: "delivered" | "saved";
  timestamp: Date;
  note?: string;
}

interface TypingIndicator {
  userId: string;
  isTyping: boolean;
}

interface SocketEvents {
  // Client → Server
  register_user: (data: { clerkId: string }) => void;
  send_message: (data: {
    fromClerkId: string;
    toClerkId: string;
    text: string;
  }) => void;
  mark_as_read: (data: { messageIds: number[] }) => void;
  typing_start: (data: { fromClerkId: string; toClerkId: string }) => void;
  typing_stop: (data: { fromClerkId: string; toClerkId: string }) => void;

  // Server → Client
  registered: (data: { success: boolean; clerkId: string; socketId: string }) => void;
  receive_message: (data: Message) => void;
  message_delivered: (data: DeliveryConfirmation) => void;
  message_failed: (data: { error: string; details?: string }) => void;
  messages_read: (data: { messageIds: number[]; readAt: Date }) => void;
  user_typing: (data: TypingIndicator) => void;
}

class SocketIOClient {
  private socket: Socket | null = null;
  private clerkId: string | null = null;

  connect(clerkId: string) {
    if (this.socket?.connected && this.clerkId === clerkId) {
      return this.socket;
    }

    this.clerkId = clerkId;

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3002";
    console.log("[Socket.IO] Connecting to:", socketUrl);

    this.socket = io(socketUrl, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    // Register user on connection
    this.socket.on("connect", () => {
      console.log("[Socket.IO] Connected:", this.socket?.id);
      if (this.clerkId) {
        this.socket?.emit("register_user", { clerkId: this.clerkId });
      }
    });

    this.socket.on("disconnect", (reason) => {
      console.log("[Socket.IO] Disconnected:", reason);
    });

    this.socket.on("connect_error", (error) => {
      console.error("[Socket.IO] Connection error:", error.message);
    });

    this.socket.on("registered", (data) => {
      console.log("[Socket.IO] Registered:", data);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.clerkId = null;
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  // Message methods
  sendMessage(fromClerkId: string, toClerkId: string, text: string) {
    if (!this.socket?.connected) {
      throw new Error("Socket not connected");
    }
    this.socket.emit("send_message", { fromClerkId, toClerkId, text });
  }

  markAsRead(messageIds: number[]) {
    if (!this.socket?.connected) {
      throw new Error("Socket not connected");
    }
    this.socket.emit("mark_as_read", { messageIds });
  }

  // Typing indicators
  startTyping(fromClerkId: string, toClerkId: string) {
    if (!this.socket?.connected) return;
    this.socket.emit("typing_start", { fromClerkId, toClerkId });
  }

  stopTyping(fromClerkId: string, toClerkId: string) {
    if (!this.socket?.connected) return;
    this.socket.emit("typing_stop", { fromClerkId, toClerkId });
  }

  // Event listeners
  onReceiveMessage(callback: (data: Message) => void) {
    this.socket?.on("receive_message", callback);
  }

  onMessageDelivered(callback: (data: DeliveryConfirmation) => void) {
    this.socket?.on("message_delivered", callback);
  }

  onMessageFailed(callback: (data: { error: string; details?: string }) => void) {
    this.socket?.on("message_failed", callback);
  }

  onUserTyping(callback: (data: TypingIndicator) => void) {
    this.socket?.on("user_typing", callback);
  }

  offReceiveMessage(callback: (data: Message) => void) {
    this.socket?.off("receive_message", callback);
  }

  offMessageDelivered(callback: (data: DeliveryConfirmation) => void) {
    this.socket?.off("message_delivered", callback);
  }

  offMessageFailed(callback: (data: { error: string; details?: string }) => void) {
    this.socket?.off("message_failed", callback);
  }

  offUserTyping(callback: (data: TypingIndicator) => void) {
    this.socket?.off("user_typing", callback);
  }
}

export const socketClient = new SocketIOClient();
export type { Message, DeliveryConfirmation, TypingIndicator };
