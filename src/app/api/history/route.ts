import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type {
  HistoryVM,
  HistoryDaySummary,
  HistoryActivityItem,
  HistoryHabitOption,
} from "@/types";

/**
 * GET /api/history?year=2026&month=3&habitId=all
 * Returns the HistoryVM for the authenticated user.
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
  const now = new Date();
  const year = parseInt(searchParams.get("year") || String(now.getFullYear()), 10);
  const month = parseInt(searchParams.get("month") || String(now.getMonth() + 1), 10);
  const habitId = searchParams.get("habitId") || "all";

  // Compute month date range
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  // Build check-in query for the month
  let monthCheckInsQuery = supabase
    .from("check_ins")
    .select("id, habit_id, date, completed_at, note")
    .eq("user_id", user.id)
    .gte("date", startDate)
    .lte("date", endDate);

  if (habitId !== "all") {
    monthCheckInsQuery = monthCheckInsQuery.eq("habit_id", habitId);
  }

  // Build recent activity query
  let recentQuery = supabase
    .from("check_ins")
    .select("id, habit_id, date, completed_at, note")
    .eq("user_id", user.id)
    .order("completed_at", { ascending: false })
    .limit(20);

  if (habitId !== "all") {
    recentQuery = recentQuery.eq("habit_id", habitId);
  }

  // 3 parallel queries
  const [habitsResult, monthCheckInsResult, recentResult] = await Promise.all([
    supabase
      .from("habits")
      .select("id, name, emoji, color, target_per_period")
      .eq("user_id", user.id)
      .eq("is_archived", false)
      .order("created_at", { ascending: true }),
    monthCheckInsQuery,
    recentQuery,
  ]);

  if (habitsResult.error) {
    return NextResponse.json({ error: habitsResult.error.message }, { status: 500 });
  }

  // Index habits by id
  const habitsMap = new Map<
    string,
    { id: string; name: string; emoji: string; color: string; target_per_period: number }
  >();
  for (const h of habitsResult.data || []) {
    habitsMap.set(h.id, h);
  }

  // Build habits filter list
  const habits: HistoryHabitOption[] = (habitsResult.data || []).map((h) => ({
    id: h.id,
    name: h.name,
    emoji: h.emoji || "\u2705",
    color: h.color || "#2EC4B6",
  }));

  // Build days map
  const days: Record<string, HistoryDaySummary> = {};
  const checkIns = monthCheckInsResult.data || [];

  if (habitId === "all") {
    // completed = count of distinct habits with ≥1 check-in that day
    // total = total active habits
    const totalHabits = habitsMap.size;
    const dayHabits = new Map<string, Set<string>>();
    for (const ci of checkIns) {
      if (!dayHabits.has(ci.date)) {
        dayHabits.set(ci.date, new Set());
      }
      dayHabits.get(ci.date)!.add(ci.habit_id);
    }
    for (const [date, habitSet] of dayHabits) {
      days[date] = { completed: habitSet.size, total: totalHabits };
    }
  } else {
    // Single habit mode: completed = check-in count, total = target_per_period
    const habit = habitsMap.get(habitId);
    const target = habit?.target_per_period || 1;
    const dayCounts = new Map<string, number>();
    for (const ci of checkIns) {
      dayCounts.set(ci.date, (dayCounts.get(ci.date) || 0) + 1);
    }
    for (const [date, count] of dayCounts) {
      days[date] = { completed: count, total: target };
    }
  }

  // Build recent activity
  const recentActivity: HistoryActivityItem[] = (recentResult.data || [])
    .filter((ci) => habitsMap.has(ci.habit_id))
    .map((ci) => {
      const habit = habitsMap.get(ci.habit_id)!;
      return {
        id: ci.id,
        habitName: habit.name,
        emoji: habit.emoji || "\u2705",
        color: habit.color || "#2EC4B6",
        date: ci.date,
        completedAt: ci.completed_at,
        note: ci.note ?? undefined,
      };
    });

  const vm: HistoryVM = { month, year, days, recentActivity, habits };
  return NextResponse.json(vm);
}
