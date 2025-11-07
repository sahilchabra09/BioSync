"use client";

import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useContacts } from "@/lib/hooks";
import { useSocket } from "@/components/socket-provider";

export default function ContactList() {
  const router = useRouter();
  const [page, setPage] = useState(0);
  const contactsPerPage = 5;

  const { data: contacts, isLoading, error } = useContacts();
  const { isConnected } = useSocket();

  const handleContactClick = (contactId: string, isParalyzed: boolean = false) => {
    router.push(`/chat/${contactId}${isParalyzed ? "?mode=eye-tracking" : ""}`);
  };

  const handleNextPage = () => {
    setPage((prev) => prev + 1);
  };

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-white dark:bg-gray-950">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-600 dark:text-gray-400">Loading contacts...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-white dark:bg-gray-950">
        <div className="text-center">
          <p className="text-red-500 mb-4">Failed to load contacts</p>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            {error instanceof Error ? error.message : "Unknown error"}
          </p>
        </div>
      </div>
    );
  }

  const displayedContacts = contacts?.slice(
    page * contactsPerPage,
    (page + 1) * contactsPerPage
  ) || [];

  // Fill empty slots with placeholders
  const filledContacts = [
    ...displayedContacts,
    ...Array(Math.max(0, 5 - displayedContacts.length)).fill(null),
  ];

  return (
    <div className="h-screen w-screen bg-white dark:bg-gray-950 overflow-hidden fixed inset-0">
      {/* Connection Status Indicator */}
      <div className="absolute top-4 left-4 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200 dark:border-gray-800">
        <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`} />
        <span className="text-xs font-medium">
          {isConnected ? "Connected" : "Disconnected"}
        </span>
      </div>

      {/* Grid Layout - 3x2 - No gaps for eye-tracking precision */}
      <div className="grid grid-cols-3 grid-rows-2 h-full w-full gap-0">
        {/* Contact Cards (Boxes 1-5) */}
        {filledContacts.slice(0, 5).map((contact, index) => {
          if (!contact) {
            return (
              <div
                key={`empty-${index}`}
                className="relative flex flex-col items-center justify-center border border-gray-200 dark:border-gray-800"
              >
                <div className="absolute inset-0 m-5 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border-4 border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center">
                  <p className="text-gray-400 dark:text-gray-600 text-sm">No contact</p>
                </div>
              </div>
            );
          }

          // Format timestamp
          const formatTime = (isoString: string | null) => {
            if (!isoString) return "No messages";
            const date = new Date(isoString);
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMs / 3600000);
            const diffDays = Math.floor(diffMs / 86400000);

            if (diffMins < 1) return "Just now";
            if (diffMins < 60) return `${diffMins}m ago`;
            if (diffHours < 24) return `${diffHours}h ago`;
            return `${diffDays}d ago`;
          };
          const displayName = contact.nickname || contact.contactName || contact.contactClerkId;
          const displayInitials = displayName.slice(0, 2).toUpperCase();

          return (
            <div
              key={contact.id}
              onClick={() => handleContactClick(contact.contactClerkId, contact.isParalyzed)}
              className="relative cursor-pointer flex flex-col items-center justify-center border border-gray-200 dark:border-gray-800 group"
            >
              {/* Inner content with visual spacing and hover effects */}
              <div className="absolute inset-0 m-5 bg-white dark:bg-gray-900 rounded-2xl border-4 border-transparent group-hover:border-blue-500 group-hover:shadow-xl group-hover:scale-[1.02] transition-all duration-300 flex flex-col items-center justify-center p-6"
              >
                {/* Unread Badge */}
                {contact.unreadCount > 0 && (
                  <div className="absolute top-4 right-4 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                    {contact.unreadCount}
                  </div>
                )}

                {/* Online Status Indicator */}
                <div
                  className={`absolute top-4 left-4 w-3 h-3 rounded-full ${
                    contact.status === "online" ? "bg-green-500" : "bg-gray-400"
                  }`}
                />

                {/* Contact Avatar */}
                <div className="w-24 h-24 rounded-full bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold mb-4 shadow-lg">
                  {displayInitials}
                </div>

                {/* Contact Name */}
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2 text-center">
                  {displayName}
                </h2>

                {/* Last Message Preview */}
                <p className="text-sm text-gray-600 dark:text-gray-400 text-center line-clamp-2 mb-2 px-4">
                  {contact.lastMessagePreview || "No messages yet"}
                </p>

                {/* Timestamp */}
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  {formatTime(contact.lastMessageAt)}
                </p>
              </div>
            </div>
          );
        })}

        {/* Next Button (Box 6) */}
        <div
          onClick={handleNextPage}
          className="relative cursor-pointer flex flex-col items-center justify-center group border border-gray-200 dark:border-gray-800"
        >
          {/* Inner content with visual spacing and hover effects */}
          <div className="absolute inset-0 m-5 bg-blue-500 group-hover:bg-blue-600 group-hover:scale-[1.02] rounded-2xl flex flex-col items-center justify-center transition-all duration-300 group-hover:shadow-xl">
            <div className="text-white text-3xl font-bold mb-2">Next</div>
            <ArrowRight className="text-white w-12 h-12 group-hover:translate-x-2 transition-transform duration-300" />
          </div>
        </div>
      </div>
    </div>
  );
}
