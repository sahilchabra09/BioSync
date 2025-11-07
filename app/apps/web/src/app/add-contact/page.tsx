"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import Loader from "@/components/loader";

interface User {
  clerkId: string;
  username: string;
  email: string;
  fullName: string | null;
  profileImage: string | null;
  status: "online" | "offline";
  isParalyzed: boolean;
}

export default function AddContactPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [addingContactId, setAddingContactId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Debounce search query
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    const timer = setTimeout(() => {
      setDebouncedQuery(value);
    }, 500);
    return () => clearTimeout(timer);
  };

  // Search users query
  const { data: searchResults, isLoading } = useQuery({
    queryKey: ["searchUsers", debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.length < 2) {
        return { users: [] };
      }
      const response = await api.searchUsers(debouncedQuery);
      return response.data as { users: User[] };
    },
    enabled: debouncedQuery.length >= 2,
  });

  // Add contact mutation
  const addContactMutation = useMutation({
    mutationFn: async (contactClerkId: string) => {
      setAddingContactId(contactClerkId);
      const response = await api.addContact(contactClerkId);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Contact added successfully!");
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      setAddingContactId(null);
    },
    onError: (error: any) => {
      const errorMessage =
        error.response?.data?.error || "Failed to add contact";
      toast.error(errorMessage);
      setAddingContactId(null);
    },
  });

  return (
    <div className="min-h-screen bg-black text-white">
      
      <div className="container mx-auto p-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Add Contact</h1>
          <p className="text-gray-400">Search for users by username</p>
        </div>

        {/* Search Input */}
        <div className="mb-8">
          <Input
            type="text"
            placeholder="Search username..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full h-16 text-2xl bg-zinc-900 border-zinc-800 focus:border-blue-500"
          />
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader />
          </div>
        )}

        {/* Search Results */}
        {!isLoading && searchResults && searchResults.users.length > 0 && (
          <div className="grid gap-4">
            {searchResults.users.map((user) => (
              <Card
                key={user.clerkId}
                className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors"
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {/* Profile Image */}
                      {user.profileImage ? (
                        <img
                          src={user.profileImage}
                          alt={user.username}
                          className="w-16 h-16 rounded-full"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-2xl font-bold">
                          {user.username[0].toUpperCase()}
                        </div>
                      )}

                      {/* User Info */}
                      <div>
                        <h3 className="text-xl font-semibold">
                          {user.fullName || user.username}
                        </h3>
                        <p className="text-gray-400">@{user.username}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`w-3 h-3 rounded-full ${
                              user.status === "online"
                                ? "bg-green-500"
                                : "bg-gray-500"
                            }`}
                          />
                          <span className="text-sm text-gray-400">
                            {user.status}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Add Button */}
                    <Button
                      onClick={() => addContactMutation.mutate(user.clerkId)}
                      disabled={addingContactId === user.clerkId}
                      className="h-12 px-8 text-lg bg-blue-600 hover:bg-blue-700"
                    >
                      {addingContactId === user.clerkId ? (
                        <Loader />
                      ) : (
                        "Add Contact"
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* No Results */}
        {!isLoading &&
          debouncedQuery.length >= 2 &&
          searchResults &&
          searchResults.users.length === 0 && (
            <div className="text-center py-12">
              <p className="text-xl text-gray-400">
                No users found matching &quot;{debouncedQuery}&quot;
              </p>
            </div>
          )}

        {/* Initial State */}
        {!debouncedQuery && (
          <div className="text-center py-12">
            <p className="text-xl text-gray-400">
              Type at least 2 characters to search
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
