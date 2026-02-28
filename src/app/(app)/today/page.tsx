import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LayoutGrid } from "lucide-react";

/**
 * Placeholder /today page.
 * Shows a greeting and links to /habits.
 * Will be fully built in Step 5.
 */
export default async function TodayPage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    const name = user?.user_metadata?.full_name?.split(" ")[0] || "there";

    // Determine greeting based on time
    const hour = new Date().getHours();
    let greeting = "Good morning";
    if (hour >= 12 && hour < 17) greeting = "Good afternoon";
    if (hour >= 17) greeting = "Good evening";

    return (
        <main className="mx-auto max-w-lg px-4 pt-8">
            <p className="text-sm text-muted-foreground">
                {new Date().toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                })}
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">
                {greeting}, {name} 👋
            </h1>

            {/* Placeholder content */}
            <div className="mt-12 flex flex-col items-center text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-teal/10">
                    <LayoutGrid className="h-8 w-8 text-teal" />
                </div>
                <h2 className="text-lg font-semibold">
                    Dashboard coming soon
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                    Your daily check-in view will be here. For now, manage your
                    habits below.
                </p>
                <Button
                    asChild
                    className="mt-6 gap-2 rounded-xl bg-coral text-white hover:bg-coral-dark"
                >
                    <Link href="/habits">Go to Habits →</Link>
                </Button>
            </div>
        </main>
    );
}
