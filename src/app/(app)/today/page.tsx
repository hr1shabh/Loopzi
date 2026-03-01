"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { HabitCard } from "@/components/habit-card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Flame, Plus, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TodayDashboardVM, CheckInResponse } from "@/types";

function getLocalDate(): string {
    return new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD
}

function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
}

export default function TodayPage() {
    const [dashboard, setDashboard] = useState<TodayDashboardVM | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [checkingIds, setCheckingIds] = useState<Set<string>>(new Set());
    const [userName, setUserName] = useState("");
    const [greeting, setGreeting] = useState(getGreeting);
    const localDateRef = useRef(getLocalDate());

    // Fetch user name from Supabase auth
    useEffect(() => {
        const supabase = createClient();
        supabase.auth.getUser().then(({ data: { user } }) => {
            setUserName(
                user?.user_metadata?.full_name?.split(" ")[0] || "there"
            );
        });
    }, []);

    const fetchDashboard = useCallback(async () => {
        try {
            const date = getLocalDate();
            localDateRef.current = date;
            const res = await fetch(`/api/today?date=${date}`);
            if (res.ok) {
                const data: TodayDashboardVM = await res.json();
                setDashboard(data);
            }
        } catch (err) {
            console.error("Failed to fetch dashboard:", err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDashboard();
    }, [fetchDashboard]);

    // Re-fetch when user returns to tab (handles midnight rollover)
    useEffect(() => {
        function handleVisibilityChange() {
            if (document.visibilityState === "visible") {
                const newDate = getLocalDate();
                if (newDate !== localDateRef.current) {
                    localDateRef.current = newDate;
                    setGreeting(getGreeting());
                    fetchDashboard();
                }
            }
        }
        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () =>
            document.removeEventListener(
                "visibilitychange",
                handleVisibilityChange
            );
    }, [fetchDashboard]);

    const handleCheckIn = useCallback(
        async (habitId: string) => {
            if (checkingIds.has(habitId)) return;

            setCheckingIds((prev) => new Set(prev).add(habitId));

            // Optimistic update
            setDashboard((prev) => {
                if (!prev) return prev;
                const updatedHabits = prev.habits.map((card) => {
                    if (card.habit.id !== habitId) return card;
                    const newCount = card.todayCount + 1;
                    const newCompleted = newCount >= card.targetToday;
                    return {
                        ...card,
                        todayCount: newCount,
                        completedToday: newCompleted,
                    };
                });
                const completedCount = updatedHabits.filter(
                    (h) => h.completedToday
                ).length;
                return {
                    ...prev,
                    habits: updatedHabits,
                    completionRate:
                        updatedHabits.length > 0
                            ? completedCount / updatedHabits.length
                            : 0,
                };
            });

            try {
                const res = await fetch(`/api/habits/${habitId}/check-ins`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ date: localDateRef.current }),
                });

                if (!res.ok) {
                    // Revert optimistic update on failure
                    fetchDashboard();
                    return;
                }

                const result: CheckInResponse = await res.json();

                // Update with server-confirmed data (streak etc.)
                setDashboard((prev) => {
                    if (!prev) return prev;
                    return {
                        ...prev,
                        habits: prev.habits.map((card) =>
                            card.habit.id === habitId
                                ? {
                                      ...card,
                                      todayCount: result.todayCount,
                                      completedToday: result.completedToday,
                                      streak: result.streak,
                                  }
                                : card
                        ),
                    };
                });
            } catch {
                fetchDashboard();
            } finally {
                setCheckingIds((prev) => {
                    const next = new Set(prev);
                    next.delete(habitId);
                    return next;
                });
            }
        },
        [checkingIds, fetchDashboard]
    );

    // Computed values
    const completedCount =
        dashboard?.habits.filter((h) => h.completedToday).length || 0;
    const totalCount = dashboard?.habits.length || 0;
    const percentage = Math.round((dashboard?.completionRate || 0) * 100);
    const topStreak = dashboard
        ? Math.max(0, ...dashboard.habits.map((h) => h.streak.current))
        : 0;
    const allDone = totalCount > 0 && completedCount === totalCount;

    const formattedDate = new Date().toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
    });

    return (
        <main className="mx-auto max-w-lg px-4 pt-6 pb-4">
            {/* ── Greeting Header ──────────────────────── */}
            <p className="text-sm text-muted-foreground">{formattedDate}</p>
            <div className="mt-1 flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight">
                    {greeting}, {userName || "there"}
                </h1>
                {topStreak > 0 && (
                    <Badge
                        variant="secondary"
                        className="gap-1 px-2.5 py-1 text-xs font-semibold"
                    >
                        <Flame className="h-3.5 w-3.5 text-orange-500" />
                        {topStreak} day streak
                    </Badge>
                )}
            </div>

            {/* ── Overall Progress ──────────────────────── */}
            {!isLoading && totalCount > 0 && (
                <div className="mt-6 rounded-2xl bg-card p-4 shadow-sm">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                            {completedCount} / {totalCount} habits done
                        </span>
                        <span
                            className={cn(
                                "font-semibold",
                                allDone
                                    ? "text-emerald-600"
                                    : "text-coral"
                            )}
                        >
                            {percentage}%
                        </span>
                    </div>
                    <Progress
                        value={percentage}
                        className={cn(
                            "mt-2 h-3",
                            allDone
                                ? "[&>[data-slot=progress-indicator]]:bg-emerald-500"
                                : "[&>[data-slot=progress-indicator]]:bg-coral"
                        )}
                    />
                    {allDone && (
                        <p className="mt-2 text-center text-xs font-medium text-emerald-600">
                            <Sparkles className="mr-1 inline h-3.5 w-3.5" />
                            All habits completed! Great job!
                        </p>
                    )}
                </div>
            )}

            {/* ── Habit Cards ──────────────────────────── */}
            <div className="mt-6 space-y-3">
                {isLoading && (
                    <>
                        {[1, 2, 3].map((i) => (
                            <div
                                key={i}
                                className="h-[76px] animate-pulse rounded-2xl bg-muted"
                            />
                        ))}
                    </>
                )}

                {!isLoading && totalCount === 0 && (
                    <div className="mt-8 text-center">
                        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-coral/10">
                            <Sparkles className="h-8 w-8 text-coral" />
                        </div>
                        <h2 className="text-xl font-semibold">
                            No habits yet
                        </h2>
                        <p className="mt-1.5 text-sm text-muted-foreground">
                            Create your first habit to start tracking your
                            progress.
                        </p>
                        <Button
                            asChild
                            className="mt-6 gap-2 rounded-xl bg-coral text-white shadow-sm hover:bg-coral-dark"
                        >
                            <Link href="/habits">
                                <Plus className="h-4 w-4" />
                                Create a Habit
                            </Link>
                        </Button>
                    </div>
                )}

                {!isLoading &&
                    dashboard?.habits.map((card) => (
                        <HabitCard
                            key={card.habit.id}
                            card={card}
                            onCheckIn={handleCheckIn}
                            isChecking={checkingIds.has(card.habit.id)}
                        />
                    ))}
            </div>
        </main>
    );
}
