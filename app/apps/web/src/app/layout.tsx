import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./index.css";
import Providers from "@/components/providers";
import Header from "@/components/header";
import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from '@clerk/nextjs'
import { auth } from '@clerk/nextjs/server'

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "app",
	description: "app",
};

export default async function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const { userId } = await auth();
	const isSignedIn = !!userId;

	return (
		<ClerkProvider>
		<html lang="en" suppressHydrationWarning>
			<body
				className={`${geistSans.variable} ${geistMono.variable} antialiased`}
			>
				<Providers isSignedIn={isSignedIn}>
					<Header />
					{children}
				</Providers>
			</body>
		</html>
		</ClerkProvider>

	);
}
