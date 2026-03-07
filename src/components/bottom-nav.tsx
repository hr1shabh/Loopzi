"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    CalendarCheck,
    LayoutGrid,
    History,
    User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/lib/constants";

const NAV_ITEMS = [
    { label: "Today", href: ROUTES.TODAY, icon: CalendarCheck },
    { label: "Habits", href: ROUTES.HABITS, icon: LayoutGrid },
    { label: "History", href: ROUTES.HISTORY, icon: History },

    { label: "Me", href: ROUTES.SETTINGS, icon: User },
];

/**
 * Bottom navigation bar — fixed at the bottom on mobile.
 * Highlights the active route.
 */
export function BottomNav() {
    const pathname = usePathname();

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/80 backdrop-blur-lg safe-bottom">
            <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-1.5">
                {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
                    const isActive =
                        pathname === href ||
                        pathname.startsWith(`${href}/`);

                    return (
                        <Link
                            key={href}
                            href={href}
                            className={cn(
                                "flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-[11px] font-medium transition-colors",
                                isActive
                                    ? "text-coral"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Icon
                                className={cn(
                                    "h-5 w-5 transition-transform",
                                    isActive && "scale-110"
                                )}
                                strokeWidth={isActive ? 2.5 : 2}
                            />
                            {label}
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
