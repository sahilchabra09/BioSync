"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import Loader from "@/components/loader";

interface OnboardingDialogProps {
  onComplete: () => void;
}

export default function OnboardingDialog({ onComplete }: OnboardingDialogProps) {
  const [isParalyzed, setIsParalyzed] = useState<boolean | null>(null);
  const queryClient = useQueryClient();

  const createUserMutation = useMutation({
    mutationFn: async (isParalyzed: boolean) => {
      const response = await api.createUser(isParalyzed);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Welcome to BioSync!");
      queryClient.invalidateQueries({ queryKey: ["user"] });
      onComplete();
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || "Failed to complete onboarding";
      toast.error(errorMessage);
    },
  });

  const handleSubmit = () => {
    if (isParalyzed === null) {
      toast.error("Please select an option");
      return;
    }
    createUserMutation.mutate(isParalyzed);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl bg-zinc-900 border-zinc-800">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4 text-white">
              Welcome to BioSync! 👋
            </h1>
            <p className="text-xl text-gray-400">
              Let&apos;s personalize your experience
            </p>
          </div>

          <div className="mb-8">
            <p className="text-2xl font-semibold mb-6 text-white text-center">
              Do you need eye-tracking accessibility features?
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Yes - I need eye-tracking */}
              <button
                onClick={() => setIsParalyzed(true)}
                className={`p-8 rounded-lg border-2 transition-all hover:scale-105 ${
                  isParalyzed === true
                    ? "border-blue-500 bg-blue-500/20"
                    : "border-zinc-700 bg-zinc-800 hover:border-zinc-600"
                }`}
              >
                <div className="text-6xl mb-4">👁️</div>
                <h3 className="text-2xl font-bold mb-2 text-white">Yes</h3>
                <p className="text-gray-400 text-lg">
                  Enable larger UI elements and eye-tracking optimized interface
                </p>
              </button>

              {/* No - Standard interface */}
              <button
                onClick={() => setIsParalyzed(false)}
                className={`p-8 rounded-lg border-2 transition-all hover:scale-105 ${
                  isParalyzed === false
                    ? "border-blue-500 bg-blue-500/20"
                    : "border-zinc-700 bg-zinc-800 hover:border-zinc-600"
                }`}
              >
                <div className="text-6xl mb-4">✋</div>
                <h3 className="text-2xl font-bold mb-2 text-white">No</h3>
                <p className="text-gray-400 text-lg">
                  Use standard interface with regular UI elements
                </p>
              </button>
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={isParalyzed === null || createUserMutation.isPending}
            className="w-full h-16 text-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {createUserMutation.isPending ? <Loader /> : "Continue"}
          </Button>

          <p className="text-center text-gray-500 mt-6 text-sm">
            You can change this setting later in your profile
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
