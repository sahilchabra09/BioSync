"use client";

import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ContactGridItem {
  id: string | number;
  contactClerkId: string;
  nickname?: string | null;
  contactName?: string | null;
  isParalyzed?: boolean | null;
  unreadCount?: number | null;
  status?: string | null;
  lastMessagePreview?: string | null;
  lastMessageAt?: string | null;
}

interface ContactGridProps {
  contacts: ContactGridItem[];
  isConnected?: boolean;
  showConnectionStatus?: boolean;
  onContactClick?: (contactId: string, isParalyzed?: boolean | null) => void;
  onNext?: () => void;
  showNextTile?: boolean;
  className?: string;
  emptyLabel?: string;
}

const CONTACT_SLOTS = 5;

const formatTime = (isoString: string | null | undefined) => {
  if (!isoString) return "No messages";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "No messages";

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

export function ContactGrid({
  contacts,
  isConnected = false,
  showConnectionStatus = true,
  onContactClick,
  onNext,
  showNextTile = true,
  className,
  emptyLabel = "No contact",
}: ContactGridProps) {
  const displayedContacts = contacts.slice(0, CONTACT_SLOTS);
  const filledContacts = [
    ...displayedContacts,
    ...Array(Math.max(0, CONTACT_SLOTS - displayedContacts.length)).fill(null),
  ];

  const renderPlaceholder = (key: string | number) => (
    <div
      key={key}
      className="relative flex flex-col items-center justify-center border border-gray-200 dark:border-gray-800"
    >
      <div className="absolute inset-0 m-5 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border-4 border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center">
        <p className="text-gray-400 dark:text-gray-600 text-sm">{emptyLabel}</p>
      </div>
    </div>
  );

  return (
    <div
      className={cn(
        "h-screen w-screen bg-white dark:bg-gray-950 overflow-hidden fixed inset-0",
        className,
      )}
    >
      {showConnectionStatus && (
        <div className="absolute top-4 left-4 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200 dark:border-gray-800">
          <div
            className={cn(
              "w-2 h-2 rounded-full",
              isConnected ? "bg-green-500" : "bg-red-500",
            )}
          />
          <span className="text-xs font-medium">
            {isConnected ? "Connected" : "Disconnected"}
          </span>
        </div>
      )}

      <div className="grid grid-cols-3 grid-rows-2 h-full w-full gap-0">
        {filledContacts.map((contact, index) => {
          if (!contact) {
            return renderPlaceholder(`empty-${index}`);
          }

          const displayName =
            contact.nickname || contact.contactName || contact.contactClerkId;
          const displayInitials = displayName?.slice(0, 2).toUpperCase() || "??";

          return (
            <div
              key={contact.id}
              onClick={() => onContactClick?.(contact.contactClerkId, contact.isParalyzed ?? undefined)}
              className="relative cursor-pointer flex flex-col items-center justify-center border border-gray-200 dark:border-gray-800 group"
            >
              <div className="absolute inset-0 m-5 bg-white dark:bg-gray-900 rounded-2xl border-4 border-transparent group-hover:border-blue-500 group-hover:shadow-xl group-hover:scale-[1.02] transition-all duration-300 flex flex-col items-center justify-center p-6">
                {contact.unreadCount && contact.unreadCount > 0 && (
                  <div className="absolute top-4 right-4 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                    {contact.unreadCount}
                  </div>
                )}

                <div
                  className={cn(
                    "absolute top-4 left-4 w-3 h-3 rounded-full",
                    contact.status === "online" ? "bg-green-500" : "bg-gray-400",
                  )}
                />

                <div className="w-24 h-24 rounded-full bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold mb-4 shadow-lg">
                  {displayInitials}
                </div>

                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2 text-center">
                  {displayName}
                </h2>

                <p className="text-sm text-gray-600 dark:text-gray-400 text-center line-clamp-2 mb-2 px-4">
                  {contact.lastMessagePreview || "No messages yet"}
                </p>

                <p className="text-xs text-gray-500 dark:text-gray-500">
                  {formatTime(contact.lastMessageAt)}
                </p>
              </div>
            </div>
          );
        })}

        {showNextTile && onNext ? (
          <div
            onClick={onNext}
            className="relative cursor-pointer flex flex-col items-center justify-center group border border-gray-200 dark:border-gray-800"
          >
            <div className="absolute inset-0 m-5 bg-blue-500 group-hover:bg-blue-600 group-hover:scale-[1.02] rounded-2xl flex flex-col items-center justify-center transition-all duration-300 group-hover:shadow-xl">
              <div className="text-white text-3xl font-bold mb-2">Next</div>
              <ArrowRight className="text-white w-12 h-12 group-hover:translate-x-2 transition-transform duration-300" />
            </div>
          </div>
        ) : (
          renderPlaceholder("empty-next")
        )}
      </div>
    </div>
  );
}

export default ContactGrid;
