import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./api-client";

// User hooks
export const useMe = () => {
  return useQuery({
    queryKey: ["user", "me"],
    queryFn: async () => {
      const { data } = await api.getMe();
      return data;
    },
  });
};

// Contact hooks
export const useContacts = () => {
  return useQuery({
    queryKey: ["contacts"],
    queryFn: async () => {
      const { data } = await api.getContacts();
      return data.contacts;
    },
  });
};

// Conversation hooks
export const useConversations = () => {
  return useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const { data } = await api.getConversations();
      return data.conversations;
    },
  });
};

export const useMessages = (contactId: string, limit = 50, offset = 0) => {
  return useQuery({
    queryKey: ["messages", contactId, limit, offset],
    queryFn: async () => {
      const { data } = await api.getMessagesByContact(contactId, limit, offset);
      return data;
    },
    enabled: !!contactId,
  });
};

// Invalidate messages when new message arrives
export const useInvalidateMessages = () => {
  const queryClient = useQueryClient();
  
  return (contactId: string) => {
    queryClient.invalidateQueries({ queryKey: ["messages", contactId] });
  };
};
