import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createCheckInSchema } from "@/lib/validations/check-in";
import type { CheckInResponse, HabitStreak } from "@/types";

/**
 * POST /api/habits/:id/check-ins
 * Create a check-in for a habit. Enforces target cap and updates streak.
 */
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: habitId } = await params;

    let body;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json(
            { error: "Invalid JSON body" },
            { status: 400 }
        );
    }

    const parsed = createCheckInSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { error: "Validation failed", details: parsed.error.flatten() },
            { status: 400 }
        );
    }

    const { date, note } = parsed.data;

    // Verify habit ownership and state
    const { data: habit, error: habitError } = await supabase
        .from("habits")
        .select("*")
        .eq("id", habitId)
        .eq("user_id", user.id)
        .single();

    if (habitError || !habit) {
        return NextResponse.json(
            { error: "Habit not found" },
            { status: 404 }
        );
    }

    if (habit.is_archived) {
        return NextResponse.json(
            { error: "Habit is archived" },
            { status: 400 }
        );
    }

    // Count existing check-ins for this period
    let currentCount = 0;
    const isWeekly = habit.period === "weekly";

    if (isWeekly) {
        // Compute week range (Monday–Sunday)
        const dateObj = new Date(date + "T00:00:00");
        const dayOfWeek = dateObj.getDay();
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const monday = new Date(dateObj);
        monday.setDate(dateObj.getDate() + mondayOffset);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        const weekStart = monday.toISOString().split("T")[0];
        const weekEnd = sunday.toISOString().split("T")[0];

        const { data: weekCheckins } = await supabase
            .from("check_ins")
            .select("id")
            .eq("habit_id", habitId)
            .eq("user_id", user.id)
            .gte("date", weekStart)
            .lte("date", weekEnd);

        currentCount = weekCheckins?.length || 0;
    } else {
        const { data: dayCheckins } = await supabase
            .from("check_ins")
            .select("id")
            .eq("habit_id", habitId)
            .eq("user_id", user.id)
            .eq("date", date);

        currentCount = dayCheckins?.length || 0;
    }

    // Enforce target cap
    if (currentCount >= habit.target_per_period) {
        return NextResponse.json(
            { error: "Target already reached for this period" },
            { status: 409 }
        );
    }

    // Insert check-in
    const { error: insertError } = await supabase.from("check_ins").insert({
        habit_id: habitId,
        user_id: user.id,
        date,
        note: note || null,
    });

    if (insertError) {
        return NextResponse.json(
            { error: insertError.message },
            { status: 500 }
        );
    }

    const newCount = currentCount + 1;
    const completedToday = newCount >= habit.target_per_period;

    // Basic streak update when target is met
    let updatedStreak: HabitStreak = {
        habitId,
        current: 0,
        best: 0,
        freezesLeft: 0,
    };

    // Fetch current streak
    const { data: streakRow } = await supabase
        .from("streaks")
        .select("*")
        .eq("habit_id", habitId)
        .eq("user_id", user.id)
        .single();

    if (streakRow) {
        updatedStreak = {
            habitId,
            current: streakRow.current,
            best: streakRow.best,
            lastCompletedDate: streakRow.last_completed_date ?? undefined,
            freezesLeft: streakRow.freezes_left,
        };
    }

    if (completedToday) {
        const lastDate = streakRow?.last_completed_date;
        let newCurrent = 1;

        if (lastDate) {
            // Check if the previous completion was yesterday (daily) or same week (weekly)
            const lastDateObj = new Date(lastDate + "T00:00:00");
            const todayObj = new Date(date + "T00:00:00");
            const diffMs = todayObj.getTime() - lastDateObj.getTime();
            const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

            if (isWeekly) {
                // For weekly: streak continues if last completed within last 7 days
                if (diffDays <= 7 && diffDays > 0) {
                    newCurrent = (streakRow?.current || 0) + 1;
                } else if (diffDays === 0) {
                    // Same date — already counted, keep current streak
                    newCurrent = streakRow?.current || 1;
                }
            } else {
                // For daily: streak continues if last completed was yesterday
                if (diffDays === 1) {
                    newCurrent = (streakRow?.current || 0) + 1;
                } else if (diffDays === 0) {
                    // Same day — already counted, keep current streak
                    newCurrent = streakRow?.current || 1;
                }
                // diffDays > 1 means gap → reset to 1
            }
        }

        const newBest = Math.max(newCurrent, streakRow?.best || 0);

        await supabase
            .from("streaks")
            .upsert({
                habit_id: habitId,
                user_id: user.id,
                current: newCurrent,
                best: newBest,
                last_completed_date: date,
                freezes_left: streakRow?.freezes_left || 0,
            })
            .eq("habit_id", habitId);

        updatedStreak = {
            habitId,
            current: newCurrent,
            best: newBest,
            lastCompletedDate: date,
            freezesLeft: streakRow?.freezes_left || 0,
        };
    }

    const response: CheckInResponse = {
        todayCount: newCount,
        completedToday,
        streak: updatedStreak,
    };

    return NextResponse.json(response, { status: 201 });
}
