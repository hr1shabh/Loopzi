import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateStreak } from "@/lib/streaks";
import type { Habit, HabitCardVM, HabitStreak, TodayDashboardVM } from "@/types";

/**
 * GET /api/today?date=YYYY-MM-DD
 * Returns the TodayDashboardVM for the authenticated user.
 */
export async function GET(request: Request) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const date =
        searchParams.get("date") || new Date().toISOString().split("T")[0];

    // Compute week range (Monday–Sunday) for weekly habits
    const dateObj = new Date(date + "T00:00:00");
    const dayOfWeek = dateObj.getDay(); // 0 = Sun
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(dateObj);
    monday.setDate(dateObj.getDate() + mondayOffset);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const weekStart = monday.toISOString().split("T")[0];
    const weekEnd = sunday.toISOString().split("T")[0];

    // Fetch habits, today's check-ins, weekly check-ins, and streaks in parallel
    const [habitsResult, dailyCheckInsResult, weeklyCheckInsResult, streaksResult] =
        await Promise.all([
            supabase
                .from("habits")
                .select("*")
                .eq("user_id", user.id)
                .eq("is_archived", false)
                .order("created_at", { ascending: true }),
            supabase
                .from("check_ins")
                .select("habit_id")
                .eq("user_id", user.id)
                .eq("date", date),
            supabase
                .from("check_ins")
                .select("habit_id")
                .eq("user_id", user.id)
                .gte("date", weekStart)
                .lte("date", weekEnd),
            supabase.from("streaks").select("*").eq("user_id", user.id),
        ]);

    if (habitsResult.error) {
        return NextResponse.json(
            { error: habitsResult.error.message },
            { status: 500 }
        );
    }

    // Count check-ins per habit for today
    const dailyCounts = new Map<string, number>();
    for (const row of dailyCheckInsResult.data || []) {
        dailyCounts.set(row.habit_id, (dailyCounts.get(row.habit_id) || 0) + 1);
    }

    // Count check-ins per habit for the week
    const weeklyCounts = new Map<string, number>();
    for (const row of weeklyCheckInsResult.data || []) {
        weeklyCounts.set(
            row.habit_id,
            (weeklyCounts.get(row.habit_id) || 0) + 1
        );
    }

    // Index streaks by habit_id
    const streakMap = new Map<string, HabitStreak>();
    for (const row of streaksResult.data || []) {
        streakMap.set(row.habit_id, {
            habitId: row.habit_id,
            current: row.current,
            best: row.best,
            lastCompletedDate: row.last_completed_date ?? undefined,
            freezesLeft: row.freezes_left,
        });
    }

    // Build HabitCardVM array
    const habits: HabitCardVM[] = (habitsResult.data || []).map((row) => {
        const habit: Habit = {
            id: row.id,
            name: row.name,
            emoji: row.emoji ?? undefined,
            color: row.color ?? undefined,
            period: row.period,
            targetPerPeriod: row.target_per_period,
            reminderTime: row.reminder_time ?? undefined,
            isArchived: row.is_archived,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };

        const isWeekly = habit.period === "weekly";
        const todayCount = isWeekly
            ? weeklyCounts.get(habit.id) || 0
            : dailyCounts.get(habit.id) || 0;
        const targetToday = habit.targetPerPeriod;

        const rawStreak = streakMap.get(habit.id);
        const streak: HabitStreak = rawStreak
            ? {
                  ...rawStreak,
                  current: validateStreak(
                      habit.period,
                      rawStreak.current,
                      rawStreak.lastCompletedDate,
                      date
                  ),
              }
            : { habitId: habit.id, current: 0, best: 0, freezesLeft: 0 };

        return {
            habit,
            completedToday: todayCount >= targetToday,
            todayCount,
            targetToday,
            streak,
        };
    });

    const completedCount = habits.filter((h) => h.completedToday).length;
    const completionRate = habits.length > 0 ? completedCount / habits.length : 0;

    const dashboard: TodayDashboardVM = {
        date,
        habits,
        completionRate,
    };

    return NextResponse.json(dashboard);
}
