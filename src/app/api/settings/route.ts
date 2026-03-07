import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updateSettingsSchema } from "@/lib/validations/settings";
import type { ReminderPreferences, SettingsVM } from "@/types";

const DEFAULT_PREFERENCES: ReminderPreferences = {
  timezone: "UTC",
  pushEnabled: false,
  emailEnabled: false,
  defaultReminderTime: "09:00",
};

/**
 * GET /api/settings
 * Returns the user's profile + reminder preferences.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: row } = await supabase
    .from("reminder_preferences")
    .select("*")
    .eq("user_id", user.id)
    .single();

  const preferences: ReminderPreferences = row
    ? {
        timezone: row.timezone ?? DEFAULT_PREFERENCES.timezone,
        pushEnabled: row.push_enabled ?? DEFAULT_PREFERENCES.pushEnabled,
        emailEnabled: row.email_enabled ?? DEFAULT_PREFERENCES.emailEnabled,
        defaultReminderTime:
          row.default_reminder_time ?? DEFAULT_PREFERENCES.defaultReminderTime,
      }
    : { ...DEFAULT_PREFERENCES };

  const meta = user.user_metadata ?? {};
  const vm: SettingsVM = {
    name: meta.full_name ?? meta.name ?? user.email?.split("@")[0] ?? "User",
    email: user.email ?? "",
    avatarUrl: meta.avatar_url ?? meta.picture,
    preferences,
  };

  return NextResponse.json(vm);
}

/**
 * PATCH /api/settings
 * Update reminder preferences (upsert).
 */
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = updateSettingsSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Build the row to upsert (only provided fields)
  const updates: Record<string, unknown> = { user_id: user.id };
  if (parsed.data.timezone !== undefined) updates.timezone = parsed.data.timezone;
  if (parsed.data.pushEnabled !== undefined) updates.push_enabled = parsed.data.pushEnabled;
  if (parsed.data.emailEnabled !== undefined) updates.email_enabled = parsed.data.emailEnabled;
  if (parsed.data.defaultReminderTime !== undefined)
    updates.default_reminder_time = parsed.data.defaultReminderTime;

  const { data, error } = await supabase
    .from("reminder_preferences")
    .upsert(updates, { onConflict: "user_id" })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const preferences: ReminderPreferences = {
    timezone: data.timezone ?? DEFAULT_PREFERENCES.timezone,
    pushEnabled: data.push_enabled ?? DEFAULT_PREFERENCES.pushEnabled,
    emailEnabled: data.email_enabled ?? DEFAULT_PREFERENCES.emailEnabled,
    defaultReminderTime:
      data.default_reminder_time ?? DEFAULT_PREFERENCES.defaultReminderTime,
  };

  return NextResponse.json(preferences);
}
