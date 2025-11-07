"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { socketClient, type Message, type DeliveryConfirmation, type TypingIndicator } from "@/lib/socket-client";
import { setAuthHeader } from "@/lib/api-client";

interface SocketContextType {
  socket: typeof socketClient;
  isConnected: boolean;
  sendMessage: (toClerkId: string, text: string) => void;
  markAsRead: (messageIds: number[]) => void;
  startTyping: (toClerkId: string) => void;
  stopTyping: (toClerkId: string) => void;
  onReceiveMessage: (callback: (data: Message) => void) => void;
  onMessageDelivered: (callback: (data: DeliveryConfirmation) => void) => void;
  onMessageFailed: (callback: (data: { error: string; details?: string }) => void) => void;
  onUserTyping: (callback: (data: TypingIndicator) => void) => void;
  onMessageSent: (callback: (data: { messageId: number; conversationId: number; timestamp: Date }) => void) => void;
  offReceiveMessage: (callback: (data: Message) => void) => void;
  offMessageDelivered: (callback: (data: DeliveryConfirmation) => void) => void;
  offMessageFailed: (callback: (data: { error: string; details?: string }) => void) => void;
  offUserTyping: (callback: (data: TypingIndicator) => void) => void;
}

const SocketContext = createContext<SocketContextType | null>(null);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!user?.id) return;

    // Set auth header for API requests
    setAuthHeader(user.id);

    // Connect to Socket.IO
    const socket = socketClient.connect(user.id);

    const handleConnect = () => {
      console.log("[SocketProvider] Connected");
      setIsConnected(true);
    };

    const handleDisconnect = () => {
      console.log("[SocketProvider] Disconnected");
      setIsConnected(false);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    // Set initial connection state
    setIsConnected(socket.connected);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socketClient.disconnect();
    };
  }, [user?.id]);

  const sendMessage = (toClerkId: string, text: string) => {
    if (!user?.id) return;
    socketClient.sendMessage(user.id, toClerkId, text);
  };

  const markAsRead = (messageIds: number[]) => {
    socketClient.markAsRead(messageIds);
  };

  const startTyping = (toClerkId: string) => {
    if (!user?.id) return;
    socketClient.startTyping(user.id, toClerkId);
  };

  const stopTyping = (toClerkId: string) => {
    if (!user?.id) return;
    socketClient.stopTyping(user.id, toClerkId);
  };

  const value: SocketContextType = {
    socket: socketClient,
    isConnected,
    sendMessage,
    markAsRead,
    startTyping,
    stopTyping,
    onReceiveMessage: socketClient.onReceiveMessage.bind(socketClient),
    onMessageDelivered: socketClient.onMessageDelivered.bind(socketClient),
    onMessageFailed: socketClient.onMessageFailed.bind(socketClient),
    onUserTyping: socketClient.onUserTyping.bind(socketClient),
    onMessageSent: socketClient.onMessageSent.bind(socketClient),
    offReceiveMessage: socketClient.offReceiveMessage.bind(socketClient),
    offMessageDelivered: socketClient.offMessageDelivered.bind(socketClient),
    offMessageFailed: socketClient.offMessageFailed.bind(socketClient),
    offUserTyping: socketClient.offUserTyping.bind(socketClient),
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within SocketProvider");
  }
  return context;
}
