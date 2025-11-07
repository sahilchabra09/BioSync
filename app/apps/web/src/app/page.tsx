"use client";

import Link from "next/link";
import { MessageSquare, Eye, Settings, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
	return (
		<div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
			<div className="container mx-auto px-4 py-16 max-w-6xl">
				{/* Hero Section */}
				<div className="text-center mb-16">
					<h1 className="text-6xl font-bold mb-6 bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
						BioSync
					</h1>
					<p className="text-2xl text-gray-600 dark:text-gray-400 mb-4">
						Accessible Communication for Everyone
					</p>
					<p className="text-lg text-gray-500 dark:text-gray-500 max-w-2xl mx-auto">
						An innovative chat platform designed with accessibility at its core,
						featuring eye-tracking technology and AI-powered assistance for
						paralyzed users.
					</p>
				</div>

				{/* Feature Cards */}
				<div className="grid md:grid-cols-3 gap-8 mb-12">
					<div className="bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-lg border border-gray-200 dark:border-gray-800 hover:shadow-xl transition-all duration-300">
						<div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mb-4">
							<MessageSquare className="w-8 h-8 text-blue-600 dark:text-blue-400" />
						</div>
						<h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">
							Smart Messaging
						</h3>
						<p className="text-gray-600 dark:text-gray-400">
							Seamless communication with intelligent message management and
							real-time status updates.
						</p>
					</div>

					<div className="bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-lg border border-gray-200 dark:border-gray-800 hover:shadow-xl transition-all duration-300">
						<div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center mb-4">
							<Eye className="w-8 h-8 text-purple-600 dark:text-purple-400" />
						</div>
						<h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">
							Eye-Tracking Support
						</h3>
						<p className="text-gray-600 dark:text-gray-400">
							Advanced eye-tracking interface with AI-generated response options
							for enhanced accessibility.
						</p>
					</div>

					<div className="bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-lg border border-gray-200 dark:border-gray-800 hover:shadow-xl transition-all duration-300">
						<div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center mb-4">
							<Settings className="w-8 h-8 text-green-600 dark:text-green-400" />
						</div>
						<h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">
							Customizable Settings
						</h3>
						<p className="text-gray-600 dark:text-gray-400">
							Personalize your experience with adjustable text sizes, dwell
							times, and high contrast modes.
						</p>
					</div>
				</div>

				{/* CTA Section */}
				<div className="bg-linear-to-r from-blue-600 to-purple-600 rounded-3xl p-12 text-center text-white shadow-2xl">
					<h2 className="text-4xl font-bold mb-4">Ready to Get Started?</h2>
					<p className="text-xl mb-8 opacity-90">
						Experience the future of accessible communication
					</p>
					<div className="flex gap-4 justify-center">
						<Link href="/chat">
							<Button
								size="lg"
								className="bg-white text-blue-600 hover:bg-gray-100 text-lg px-8 py-6 rounded-xl shadow-lg"
							>
								Open Messages
								<ArrowRight className="ml-2 w-5 h-5" />
							</Button>
						</Link>
					</div>
				</div>

				{/* Footer Info */}
				<div className="mt-16 text-center">
					<p className="text-gray-500 dark:text-gray-600">
						Built with ❤️ for accessibility | Powered by AI
					</p>
				</div>
			</div>
		</div>
	);
}
