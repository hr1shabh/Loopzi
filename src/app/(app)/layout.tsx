import { BottomNav } from "@/components/bottom-nav";

/**
 * Layout for all authenticated app pages.
 * Wraps children with the bottom navigation bar.
 */
export default function AppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen pb-20">
            {children}
            <BottomNav />
        </div>
    );
}
