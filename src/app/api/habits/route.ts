import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createHabitSchema } from "@/lib/validations/habit";

/**
 * GET /api/habits
 * Fetch all habits for the authenticated user.
 * Query params: ?archived=true to include archived habits.
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
    const includeArchived = searchParams.get("archived") === "true";

    let query = supabase
        .from("habits")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

    if (!includeArchived) {
        query = query.eq("is_archived", false);
    }

    const { data, error } = await query;

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
}

/**
 * POST /api/habits
 * Create a new habit for the authenticated user.
 * Also creates an initial streak row.
 */
export async function POST(request: Request) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createHabitSchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json(
            { error: "Validation failed", details: parsed.error.flatten() },
            { status: 400 }
        );
    }

    const { name, emoji, color, period, targetPerPeriod, reminderTime } =
        parsed.data;

    // Insert the habit
    const { data: habit, error: habitError } = await supabase
        .from("habits")
        .insert({
            user_id: user.id,
            name,
            emoji: emoji || null,
            color: color || null,
            period,
            target_per_period: targetPerPeriod,
            reminder_time: reminderTime || null,
        })
        .select()
        .single();

    if (habitError) {
        return NextResponse.json(
            { error: habitError.message },
            { status: 500 }
        );
    }

    // Create an initial streak row for this habit
    await supabase.from("streaks").insert({
        habit_id: habit.id,
        user_id: user.id,
        current: 0,
        best: 0,
        freezes_left: 0,
    });

    return NextResponse.json(habit, { status: 201 });
}
