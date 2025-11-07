"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ModeToggle } from "./mode-toggle";
import { UserButton } from "@clerk/nextjs";

export default function Header() {
	const pathname = usePathname();
	
	// Hide header on talk page
	if (pathname === "/talk") {
		return null;
	}
	
	const links = [
		{ to: "/", label: "Home" },
		{ to: "/chat", label: "Messages" },
		{ to: "/profile", label: "Profile" },
	] as const;

	return (
		<div>
			<div className="flex flex-row items-center justify-between px-2 py-1">
				<nav className="flex gap-4 text-lg">
					{links.map(({ to, label }) => {
						return (
							<Link key={to} href={to}>
								{label}
							</Link>
						);
					})}
				</nav>
				<div className="flex items-center gap-2">
					<UserButton />
					<ModeToggle />
				</div>
			</div>
			<hr />
		</div>
	);
}
