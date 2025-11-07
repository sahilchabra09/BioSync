import axios, { AxiosError } from "axios";

const DEFAULT_API_URL = "http://localhost:3000";
const DEFAULT_TRANSCRIBE_URL = "http://localhost:8000";

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000, // 10 second timeout
});

// Add request interceptor to validate auth header
apiClient.interceptors.request.use(
  (config) => {
    const clerkId = config.headers?.["x-clerk-id"];
    
    // Only log warning in development
    if (!clerkId && process.env.NODE_ENV === 'development') {
      console.warn("[API Request] No x-clerk-id header set for:", config.url);
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor for better error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Format error message based on error type
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const data = error.response.data as any;
      
      let message = `Server error (${status})`;
      
      if (status === 404) {
        message = data?.message || "Resource not found";
      } else if (status === 400) {
        message = data?.message || "Bad request";
      } else if (status === 401) {
        message = "Unauthorized - Please sign in again";
      } else if (status === 403) {
        message = "Access forbidden";
      } else if (status === 500) {
        message = "Server error - Please try again later";
      } else if (data?.message) {
        message = data.message;
      }
      
      console.error(`[API Error ${status}]:`, message, error.config?.url);
      
      // Create enhanced error object
      const enhancedError: any = new Error(message);
      enhancedError.status = status;
      enhancedError.originalError = error;
      enhancedError.url = error.config?.url;
      
      return Promise.reject(enhancedError);
    } else if (error.request) {
      // Request made but no response received
      console.error("[API Error] No response:", error.config?.url);
      const networkError: any = new Error("Network error - Cannot reach server");
      networkError.status = 0;
      networkError.originalError = error;
      return Promise.reject(networkError);
    } else if (error.code === 'ECONNABORTED') {
      // Request timeout
      console.error("[API Error] Timeout:", error.config?.url);
      const timeoutError: any = new Error("Request timeout - Server is not responding");
      timeoutError.status = 408;
      timeoutError.originalError = error;
      return Promise.reject(timeoutError);
    } else {
      // Something else happened
      console.error("[API Error] Unknown:", error.message);
      return Promise.reject(error);
    }
  }
);

// Add Clerk user ID to all requests
export const setAuthHeader = (clerkId: string) => {
  if (!clerkId) {
    console.warn("[API Client] Attempted to set empty auth header");
    return;
  }
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
  getMessagesByContact: (contactId: string, limit = 50, offset = 0) =>
    apiClient.get(`/conversations/with/${contactId}/messages`, {
      params: { limit, offset },
    }),

  transcribeAudio: (audioFile: File) => {
    const formData = new FormData();
    formData.append("file", audioFile);

    const endpointBase = process.env.NEXT_PUBLIC_TRANSCRIBE_API_URL || DEFAULT_TRANSCRIBE_URL;
    const endpoint = new URL("/audio/transcribe", endpointBase).toString();

    return axios.post(endpoint, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
        Accept: "application/json",
      },
    });
  },

  // Chat AI Options
  getChatOptions: (message: string) => {
    const endpointBase = process.env.NEXT_PUBLIC_TRANSCRIBE_API_URL || DEFAULT_TRANSCRIBE_URL;
    const endpoint = new URL("/chat/options", endpointBase).toString();

    return axios.post(endpoint, { message }, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });
  },
};
