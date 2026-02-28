"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    createHabitSchema,
    type CreateHabitInput,
} from "@/lib/validations/habit";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Curated emoji options ──────────────────────────────────
const EMOJI_OPTIONS = [
    "🏃", "💧", "📖", "🧘", "💪", "🎯", "✍️", "💤",
    "🥗", "🚶", "🎹", "📝", "🧠", "🌅", "🚴", "🎨",
    "💊", "🍎", "🏋️", "🧹",
];

// ─── Preset color options ───────────────────────────────────
const COLOR_OPTIONS = [
    { name: "Coral", value: "#FF6B6B" },
    { name: "Teal", value: "#2EC4B6" },
    { name: "Violet", value: "#7C3AED" },
    { name: "Amber", value: "#F59E0B" },
    { name: "Sky", value: "#0EA5E9" },
    { name: "Rose", value: "#F43F5E" },
];

interface HabitFormSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** If provided, form is in edit mode and prefilled */
    habit?: {
        id: string;
        name: string;
        emoji?: string | null;
        color?: string | null;
        period: string;
        target_per_period: number;
        reminder_time?: string | null;
    };
    onSuccess: () => void;
}

export function HabitFormSheet({
    open,
    onOpenChange,
    habit,
    onSuccess,
}: HabitFormSheetProps) {
    const isEditing = !!habit;
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isArchiving, setIsArchiving] = useState(false);
    const [selectedEmoji, setSelectedEmoji] = useState(
        habit?.emoji || EMOJI_OPTIONS[0]
    );
    const [selectedColor, setSelectedColor] = useState(
        habit?.color || COLOR_OPTIONS[0].value
    );

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
    } = useForm<CreateHabitInput>({
        resolver: zodResolver(createHabitSchema),
        defaultValues: {
            name: habit?.name || "",
            period: (habit?.period as "daily" | "weekly") || "daily",
            targetPerPeriod: habit?.target_per_period || 1,
            reminderTime: habit?.reminder_time || "",
        },
    });

    async function onSubmit(data: CreateHabitInput) {
        setIsSubmitting(true);
        try {
            const payload = {
                ...data,
                emoji: selectedEmoji,
                color: selectedColor,
            };

            const url = isEditing
                ? `/api/habits/${habit.id}`
                : "/api/habits";
            const method = isEditing ? "PATCH" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed to save habit");
            }

            reset();
            onOpenChange(false);
            onSuccess();
        } catch (err) {
            console.error("Failed to save habit:", err);
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleArchive() {
        if (!habit) return;
        setIsArchiving(true);
        try {
            const res = await fetch(`/api/habits/${habit.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isArchived: true }),
            });

            if (!res.ok) {
                throw new Error("Failed to archive habit");
            }

            onOpenChange(false);
            onSuccess();
        } catch (err) {
            console.error("Failed to archive:", err);
        } finally {
            setIsArchiving(false);
        }
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="bottom"
                className="mx-auto max-w-lg rounded-t-3xl px-6 pb-8"
            >
                <SheetHeader className="pb-2">
                    <SheetTitle className="text-lg">
                        {isEditing ? "Edit Habit" : "New Habit"}
                    </SheetTitle>
                    <SheetDescription className="sr-only">
                        {isEditing
                            ? "Edit your habit details"
                            : "Create a new habit to track"}
                    </SheetDescription>
                </SheetHeader>

                <form
                    onSubmit={handleSubmit(onSubmit)}
                    className="space-y-5"
                >
                    {/* Name */}
                    <div className="space-y-1.5">
                        <label
                            htmlFor="habit-name"
                            className="text-sm font-medium"
                        >
                            Name
                        </label>
                        <Input
                            id="habit-name"
                            placeholder="e.g. Morning Run"
                            className="h-11 rounded-xl"
                            {...register("name")}
                        />
                        {errors.name && (
                            <p className="text-xs text-destructive">
                                {errors.name.message}
                            </p>
                        )}
                    </div>

                    {/* Emoji picker */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Emoji</label>
                        <div className="flex flex-wrap gap-1.5">
                            {EMOJI_OPTIONS.map((emoji) => (
                                <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => setSelectedEmoji(emoji)}
                                    className={cn(
                                        "flex h-9 w-9 items-center justify-center rounded-lg text-lg transition-all",
                                        selectedEmoji === emoji
                                            ? "bg-coral/15 ring-2 ring-coral scale-110"
                                            : "hover:bg-muted"
                                    )}
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Color picker */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Color</label>
                        <div className="flex gap-2">
                            {COLOR_OPTIONS.map((c) => (
                                <button
                                    key={c.value}
                                    type="button"
                                    onClick={() => setSelectedColor(c.value)}
                                    className={cn(
                                        "h-8 w-8 rounded-full transition-all",
                                        selectedColor === c.value
                                            ? "ring-2 ring-offset-2 ring-foreground scale-110"
                                            : "hover:scale-105"
                                    )}
                                    style={{ backgroundColor: c.value }}
                                    title={c.name}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Frequency */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">
                            Frequency
                        </label>
                        <div className="flex gap-2">
                            {(["daily", "weekly"] as const).map((p) => (
                                <label
                                    key={p}
                                    className={cn(
                                        "flex flex-1 cursor-pointer items-center justify-center rounded-xl border px-4 py-2.5 text-sm font-medium transition-all",
                                        "has-[:checked]:border-coral has-[:checked]:bg-coral/10 has-[:checked]:text-coral"
                                    )}
                                >
                                    <input
                                        type="radio"
                                        value={p}
                                        className="sr-only"
                                        {...register("period")}
                                    />
                                    {p === "daily" ? "Daily" : "Weekly"}
                                </label>
                            ))}
                        </div>
                        {errors.period && (
                            <p className="text-xs text-destructive">
                                {errors.period.message}
                            </p>
                        )}
                    </div>

                    {/* Target per period */}
                    <div className="space-y-1.5">
                        <label
                            htmlFor="habit-target"
                            className="text-sm font-medium"
                        >
                            Target per period
                        </label>
                        <Input
                            id="habit-target"
                            type="number"
                            min={1}
                            max={99}
                            className="h-11 w-24 rounded-xl"
                            {...register("targetPerPeriod", {
                                valueAsNumber: true,
                            })}
                        />
                        {errors.targetPerPeriod && (
                            <p className="text-xs text-destructive">
                                {errors.targetPerPeriod.message}
                            </p>
                        )}
                    </div>

                    {/* Reminder time */}
                    <div className="space-y-1.5">
                        <label
                            htmlFor="habit-reminder"
                            className="text-sm font-medium"
                        >
                            Reminder time{" "}
                            <span className="text-muted-foreground">
                                (optional)
                            </span>
                        </label>
                        <Input
                            id="habit-reminder"
                            type="time"
                            className="h-11 w-36 rounded-xl"
                            {...register("reminderTime")}
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="h-12 flex-1 rounded-xl bg-coral text-sm font-semibold text-white shadow-md shadow-coral/20 transition-all hover:bg-coral-dark active:scale-[0.98]"
                        >
                            {isSubmitting && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            {isEditing ? "Update Habit" : "Save Habit"}
                        </Button>

                        {isEditing && (
                            <Button
                                type="button"
                                variant="outline"
                                disabled={isArchiving}
                                onClick={handleArchive}
                                className="h-12 rounded-xl border-destructive/30 text-sm font-medium text-destructive hover:bg-destructive/10"
                            >
                                {isArchiving ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    "Archive"
                                )}
                            </Button>
                        )}
                    </div>
                </form>
            </SheetContent>
        </Sheet>
    );
}
