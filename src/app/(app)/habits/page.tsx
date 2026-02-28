"use client";

import { useState, useEffect, useCallback } from "react";
import { HabitFormSheet } from "@/components/habit-form-sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Archive, Sparkles, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface HabitRow {
    id: string;
    name: string;
    emoji: string | null;
    color: string | null;
    period: string;
    target_per_period: number;
    reminder_time: string | null;
    is_archived: boolean;
    created_at: string;
}

// ─── Suggested habit templates for onboarding ───────────────
const SUGGESTED_HABITS = [
    { name: "Drink Water", emoji: "💧", color: "#0EA5E9", period: "daily" as const, targetPerPeriod: 3 },
    { name: "Morning Run", emoji: "🏃", color: "#FF6B6B", period: "daily" as const, targetPerPeriod: 1 },
    { name: "Read 30 min", emoji: "📖", color: "#7C3AED", period: "daily" as const, targetPerPeriod: 1 },
    { name: "Meditate", emoji: "🧘", color: "#2EC4B6", period: "daily" as const, targetPerPeriod: 1 },
];

export default function HabitsPage() {
    const [habits, setHabits] = useState<HabitRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [editingHabit, setEditingHabit] = useState<HabitRow | undefined>();
    const [showArchived, setShowArchived] = useState(false);

    const fetchHabits = useCallback(async () => {
        try {
            const url = showArchived
                ? "/api/habits?archived=true"
                : "/api/habits";
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                setHabits(data);
            }
        } catch (err) {
            console.error("Failed to fetch habits:", err);
        } finally {
            setIsLoading(false);
        }
    }, [showArchived]);

    useEffect(() => {
        fetchHabits();
    }, [fetchHabits]);

    function openCreate() {
        setEditingHabit(undefined);
        setSheetOpen(true);
    }

    function openEdit(habit: HabitRow) {
        setEditingHabit(habit);
        setSheetOpen(true);
    }

    async function handleQuickCreate(template: typeof SUGGESTED_HABITS[0]) {
        try {
            const res = await fetch("/api/habits", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(template),
            });
            if (res.ok) {
                fetchHabits();
            }
        } catch (err) {
            console.error("Failed to create habit:", err);
        }
    }

    async function handleUnarchive(habitId: string) {
        try {
            const res = await fetch(`/api/habits/${habitId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isArchived: false }),
            });
            if (res.ok) {
                fetchHabits();
            }
        } catch (err) {
            console.error("Failed to unarchive:", err);
        }
    }

    const activeHabits = habits.filter((h) => !h.is_archived);
    const archivedHabits = habits.filter((h) => h.is_archived);
    const hasNoHabits = !isLoading && activeHabits.length === 0 && !showArchived;

    return (
        <main className="mx-auto max-w-lg px-4 pt-6">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight">
                    My Habits
                </h1>
                {!hasNoHabits && (
                    <Button
                        id="add-habit-btn"
                        onClick={openCreate}
                        size="sm"
                        className="gap-1.5 rounded-xl bg-coral text-white shadow-sm hover:bg-coral-dark active:scale-95"
                    >
                        <Plus className="h-4 w-4" />
                        Add Habit
                    </Button>
                )}
            </div>

            {/* Loading state */}
            {isLoading && (
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className="h-20 animate-pulse rounded-2xl bg-muted"
                        />
                    ))}
                </div>
            )}

            {/* ── Onboarding: zero habits state ──────────── */}
            {hasNoHabits && (
                <div className="mt-8 text-center">
                    <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-coral/10">
                        <Sparkles className="h-8 w-8 text-coral" />
                    </div>
                    <h2 className="text-xl font-semibold">
                        Create your first habit
                    </h2>
                    <p className="mt-1.5 text-sm text-muted-foreground">
                        Pick a template to get started, or create your own.
                    </p>

                    {/* Suggested templates */}
                    <div className="mt-6 grid grid-cols-2 gap-3">
                        {SUGGESTED_HABITS.map((t) => (
                            <button
                                key={t.name}
                                onClick={() => handleQuickCreate(t)}
                                className="flex flex-col items-center gap-2 rounded-2xl border border-border/60 p-4 text-left transition-all hover:border-coral/40 hover:bg-coral/5 hover:shadow-sm active:scale-[0.97]"
                            >
                                <span className="text-2xl">{t.emoji}</span>
                                <span className="text-sm font-medium">
                                    {t.name}
                                </span>
                                <Badge
                                    variant="secondary"
                                    className="text-[10px]"
                                >
                                    {t.period} · {t.targetPerPeriod}x
                                </Badge>
                            </button>
                        ))}
                    </div>

                    {/* Or create custom */}
                    <Button
                        onClick={openCreate}
                        variant="outline"
                        className="mt-4 w-full gap-2 rounded-xl"
                    >
                        <Plus className="h-4 w-4" />
                        Create Custom Habit
                    </Button>
                </div>
            )}

            {/* ── Active habits list ────────────────────── */}
            {!isLoading && activeHabits.length > 0 && (
                <div className="space-y-3">
                    {activeHabits.map((habit) => (
                        <Card
                            key={habit.id}
                            className="overflow-hidden border-0 shadow-sm transition-all hover:shadow-md"
                        >
                            <CardContent className="flex items-center gap-3 p-4">
                                {/* Emoji + color pip */}
                                <div
                                    className="flex h-11 w-11 items-center justify-center rounded-xl text-xl"
                                    style={{
                                        backgroundColor: habit.color
                                            ? `${habit.color}20`
                                            : undefined,
                                    }}
                                >
                                    {habit.emoji || "🎯"}
                                </div>

                                {/* Details */}
                                <div className="flex-1 min-w-0">
                                    <p className="truncate font-medium">
                                        {habit.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {habit.period === "daily"
                                            ? "Daily"
                                            : "Weekly"}{" "}
                                        · {habit.target_per_period}x
                                        {habit.reminder_time &&
                                            ` · ⏰ ${habit.reminder_time}`}
                                    </p>
                                </div>

                                {/* Edit button */}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => openEdit(habit)}
                                    className="h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground"
                                >
                                    <Pencil className="h-4 w-4" />
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* ── Archived section ──────────────────────── */}
            {!isLoading && (
                <div className="mt-6">
                    {archivedHabits.length > 0 && (
                        <button
                            onClick={() => setShowArchived(!showArchived)}
                            className="mb-3 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                        >
                            <Archive className="h-3.5 w-3.5" />
                            {showArchived ? "Hide" : "Show"} archived (
                            {archivedHabits.length})
                        </button>
                    )}

                    {showArchived && archivedHabits.length > 0 && (
                        <div className="space-y-2">
                            {archivedHabits.map((habit) => (
                                <Card
                                    key={habit.id}
                                    className="border-0 opacity-60 shadow-sm"
                                >
                                    <CardContent className="flex items-center gap-3 p-4">
                                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted text-xl">
                                            {habit.emoji || "🎯"}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="truncate font-medium line-through">
                                                {habit.name}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                Archived
                                            </p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() =>
                                                handleUnarchive(habit.id)
                                            }
                                            className="gap-1 text-xs text-muted-foreground"
                                        >
                                            <RotateCcw className="h-3 w-3" />
                                            Restore
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Habit form sheet */}
            <HabitFormSheet
                open={sheetOpen}
                onOpenChange={setSheetOpen}
                habit={editingHabit}
                onSuccess={fetchHabits}
            />
        </main>
    );
}
