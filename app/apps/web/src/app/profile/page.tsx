"use client";

import { useUser, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { LogOut, User, Mail, AtSign, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ProfilePage() {
	const { user, isLoaded } = useUser();
	const { signOut } = useClerk();
	const router = useRouter();

	const handleSignOut = async () => {
		await signOut();
		router.push("/");
	};

	if (!isLoaded) {
		return (
			<div className="h-screen w-screen flex items-center justify-center bg-white dark:bg-gray-950">
				<Loader2 className="w-10 h-10 animate-spin text-blue-500" />
			</div>
		);
	}

	if (!user) {
		return (
			<div className="h-screen w-screen flex items-center justify-center bg-white dark:bg-gray-950">
				<div className="text-center">
					<p className="text-gray-600 dark:text-gray-400">Not signed in</p>
				</div>
			</div>
		);
	}

	const displayName = user.fullName || user.username || "User";
	const displayInitials = displayName.slice(0, 2).toUpperCase();

	return (
		<div className="min-h-screen w-full bg-white dark:bg-gray-950 flex items-center justify-center px-4 py-10">
			<div className="w-full max-w-2xl">
				<div className="bg-white dark:bg-gray-900 rounded-3xl border-2 border-gray-200 dark:border-gray-800 shadow-xl p-8 md:p-12">
					{/* Avatar */}
					<div className="flex justify-center mb-8">
						<div className="w-32 h-32 rounded-full bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-4xl font-bold shadow-lg">
							{displayInitials}
						</div>
					</div>

					{/* User Info */}
					<div className="space-y-6 mb-8">
						{user.fullName && (
							<div className="flex items-start gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
								<User className="w-6 h-6 text-blue-500 mt-1 shrink-0" />
								<div className="flex-1 min-w-0">
									<p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
										Full Name
									</p>
									<p className="text-lg font-semibold text-gray-900 dark:text-white wrap-break-word">
										{user.fullName}
									</p>
								</div>
							</div>
						)}

						{user.username && (
							<div className="flex items-start gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
								<AtSign className="w-6 h-6 text-purple-500 mt-1 shrink-0" />
								<div className="flex-1 min-w-0">
									<p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
										Username
									</p>
									<p className="text-lg font-semibold text-gray-900 dark:text-white wrap-break-word">
										{user.username}
									</p>
								</div>
							</div>
						)}

						{user.primaryEmailAddress && (
							<div className="flex items-start gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
								<Mail className="w-6 h-6 text-green-500 mt-1 shrink-0" />
								<div className="flex-1 min-w-0">
									<p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
										Email Address
									</p>
									<p className="text-lg font-semibold text-gray-900 dark:text-white wrap-break-word">
										{user.primaryEmailAddress.emailAddress}
									</p>
								</div>
							</div>
						)}
					</div>

					{/* Logout Button */}
					<Button
						onClick={handleSignOut}
						className="w-full bg-red-500 hover:bg-red-600 text-white text-lg py-6 rounded-xl shadow-lg transition-all duration-200"
						size="lg"
					>
						<LogOut className="w-5 h-5 mr-2" />
						Sign Out
					</Button>
				</div>
			</div>
		</div>
	);
}
