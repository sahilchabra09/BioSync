"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import ContactGrid from "@/components/contact-grid";
import { useContacts } from "@/lib/hooks";
import { useSocket } from "@/components/socket-provider";

export default function ContactList() {
  const router = useRouter();
  const [page, setPage] = useState(0);
  const contactsPerPage = 5;

  const { data: contacts, isLoading, error } = useContacts();
  const { isConnected } = useSocket();

  const handleContactClick = (
    contactId: string,
    isParalyzed: boolean | null | undefined = false,
  ) => {
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

  const displayedContacts =
    contacts?.slice(page * contactsPerPage, (page + 1) * contactsPerPage) || [];

  return (
    <ContactGrid
      contacts={displayedContacts}
      isConnected={isConnected}
      onContactClick={handleContactClick}
      onNext={handleNextPage}
      showNextTile
    />
  );
}
