import axios from "axios";

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000",
  headers: {
    "Content-Type": "application/json",
  },
});

// Add Clerk user ID to all requests
export const setAuthHeader = (clerkId: string) => {
  apiClient.defaults.headers.common["x-clerk-id"] = clerkId;
};

// API functions
export const api = {
  // Users
  getMe: () => apiClient.get("/users/me"),
  createUser: (isParalyzed: boolean) =>
    apiClient.post("/users", { isParalyzed }),
  searchUsers: (query: string) =>
    apiClient.get("/users/search", { params: { q: query } }),

  // Contacts
  getContacts: () => apiClient.get("/contacts"),
  addContact: (contactClerkId: string, nickname?: string) =>
    apiClient.post("/contacts", { contactClerkId, nickname }),

  // Conversations
  getConversations: () => apiClient.get("/conversations"),
  getMessages: (conversationId: number, limit = 50, offset = 0) =>
    apiClient.get(`/conversations/${conversationId}/messages`, {
      params: { limit, offset },
    }),
};
