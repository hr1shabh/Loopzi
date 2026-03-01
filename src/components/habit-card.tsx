"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Plus, Flame, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HabitCardVM } from "@/types";

interface HabitCardProps {
    card: HabitCardVM;
    onCheckIn: (habitId: string) => Promise<void>;
    isChecking: boolean;
}

export function HabitCard({ card, onCheckIn, isChecking }: HabitCardProps) {
    const { habit, completedToday, todayCount, targetToday, streak } = card;
    const progressText =
        completedToday && targetToday === 1
            ? "Done"
            : `${todayCount}/${targetToday}`;
    const isSingleTarget = targetToday === 1;

    return (
        <Card
            className={cn(
                "overflow-hidden border-0 shadow-sm transition-all duration-300",
                completedToday
                    ? "bg-emerald-50 dark:bg-emerald-950/20"
                    : "hover:shadow-md"
            )}
        >
            <CardContent className="flex items-center gap-3 p-4">
                {/* Emoji icon */}
                <div
                    className={cn(
                        "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl",
                        completedToday &&
                            "bg-emerald-100 dark:bg-emerald-900/30"
                    )}
                    style={{
                        backgroundColor:
                            !completedToday && habit.color
                                ? `${habit.color}20`
                                : undefined,
                    }}
                >
                    {habit.emoji || "🎯"}
                </div>

                {/* Details */}
                <div className="min-w-0 flex-1">
                    <p
                        className={cn(
                            "truncate font-medium",
                            completedToday &&
                                "text-emerald-800 dark:text-emerald-200"
                        )}
                    >
                        {habit.name}
                    </p>
                    <div className="mt-0.5 flex items-center gap-2">
                        <span
                            className={cn(
                                "text-xs",
                                completedToday
                                    ? "font-medium text-emerald-600 dark:text-emerald-400"
                                    : "text-muted-foreground"
                            )}
                        >
                            {progressText}
                        </span>
                        {streak.current > 0 && (
                            <Badge
                                variant="secondary"
                                className={cn(
                                    "gap-0.5 px-1.5 text-[10px]",
                                    completedToday &&
                                        "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                                )}
                            >
                                <Flame className="h-2.5 w-2.5 text-orange-500" />
                                {streak.current}
                            </Badge>
                        )}
                    </div>
                </div>

                {/* Action button */}
                {completedToday ? (
                    <div className="animate-check-in flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                        <Check className="h-5 w-5" strokeWidth={3} />
                    </div>
                ) : (
                    <Button
                        onClick={() => onCheckIn(habit.id)}
                        disabled={isChecking}
                        size="sm"
                        className="shrink-0 rounded-xl bg-coral font-semibold text-white shadow-sm transition-transform hover:bg-coral-dark active:scale-95"
                    >
                        {isChecking ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : isSingleTarget ? (
                            "Done"
                        ) : (
                            <>
                                <Plus className="h-4 w-4" /> 1
                            </>
                        )}
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}
