import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updateHabitSchema } from "@/lib/validations/habit";

/**
 * PATCH /api/habits/:id
 * Update a habit (edit fields or archive).
 */
export async function PATCH(
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

    const { id } = await params;
    const body = await request.json();
    const parsed = updateHabitSchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json(
            { error: "Validation failed", details: parsed.error.flatten() },
            { status: 400 }
        );
    }

    // Build the update object, mapping camelCase → snake_case
    const updates: Record<string, unknown> = {};
    const { name, emoji, color, period, targetPerPeriod, reminderTime, isArchived } =
        parsed.data;

    if (name !== undefined) updates.name = name;
    if (emoji !== undefined) updates.emoji = emoji;
    if (color !== undefined) updates.color = color;
    if (period !== undefined) updates.period = period;
    if (targetPerPeriod !== undefined) updates.target_per_period = targetPerPeriod;
    if (reminderTime !== undefined) updates.reminder_time = reminderTime;
    if (isArchived !== undefined) updates.is_archived = isArchived;

    if (Object.keys(updates).length === 0) {
        return NextResponse.json(
            { error: "No fields to update" },
            { status: 400 }
        );
    }

    const { data, error } = await supabase
        .from("habits")
        .update(updates)
        .eq("id", id)
        .eq("user_id", user.id) // Extra safety on top of RLS
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
        return NextResponse.json(
            { error: "Habit not found" },
            { status: 404 }
        );
    }

    return NextResponse.json(data);
}
