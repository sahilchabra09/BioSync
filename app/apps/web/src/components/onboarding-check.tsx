"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@clerk/nextjs";
import { api, setAuthHeader } from "@/lib/api-client";
import OnboardingDialog from "./onboarding-dialog";
import Loader from "./loader";

interface User {
  clerkId: string;
  isParalyzed: boolean;
  status: "online" | "offline";
  createdAt: string;
}

export default function OnboardingCheck({ children }: { children: React.ReactNode }) {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { user: clerkUser, isLoaded } = useUser();

  // Set auth header when user is loaded
  useEffect(() => {
    if (clerkUser?.id) {
      setAuthHeader(clerkUser.id);
    }
  }, [clerkUser?.id]);

  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["user"],
    queryFn: async () => {
      const response = await api.getMe();
      return response.data;
    },
    retry: false,
    enabled: !!clerkUser?.id, // Only run query when Clerk user is loaded
  });

  useEffect(() => {
    // If user is null (doesn't exist in DB), show onboarding
    if (isLoaded && clerkUser && !isLoading && user === null) {
      setShowOnboarding(true);
    }
  }, [user, isLoading, clerkUser, isLoaded]);

  // Show loader while checking user status
  if (!isLoaded || isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <Loader />
      </div>
    );
  }

  // Show onboarding dialog for first-time users
  if (showOnboarding) {
    return (
      <OnboardingDialog
        onComplete={() => {
          setShowOnboarding(false);
        }}
      />
    );
  }

  // User exists, show the app
  return <>{children}</>;
}
