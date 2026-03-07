import { NextResponse } from "next/server";
import webpush from "web-push";
import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabase/admin";

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY);

// ─── Types for the joined query rows ─────────────────────────

interface ReminderRow {
  user_id: string;
  timezone: string;
  push_enabled: boolean;
  email_enabled: boolean;
  default_reminder_time: string;
}

interface HabitRow {
  id: string;
  user_id: string;
  name: string;
  reminder_time: string | null;
}

interface SubscriptionRow {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

// ─── Helpers ─────────────────────────────────────────────────

function getCurrentHHMM(timezone: string): string {
  try {
    const fmt = new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    return fmt.format(new Date());
  } catch {
    return "—"; // invalid timezone → will never match any reminder_time
  }
}

// ─── Route Handler ───────────────────────────────────────────

export async function GET(request: Request) {
  // Vercel Cron sends the secret in the Authorization header
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 1. Fetch all users with reminders enabled
  const { data: prefs, error: prefsError } = await supabaseAdmin
    .from("reminder_preferences")
    .select("user_id, timezone, push_enabled, email_enabled, default_reminder_time")
    .or("push_enabled.eq.true,email_enabled.eq.true");

  if (prefsError) {
    return NextResponse.json({ error: prefsError.message }, { status: 500 });
  }
  if (!prefs || prefs.length === 0) {
    return NextResponse.json({ sent: 0, errors: 0, detail: "No users with reminders enabled" });
  }

  const prefsByUser = new Map<string, ReminderRow>();
  for (const p of prefs as ReminderRow[]) {
    prefsByUser.set(p.user_id, p);
  }
  const userIds = Array.from(prefsByUser.keys());

  // 2. Fetch non-archived habits for those users
  const { data: habits, error: habitsError } = await supabaseAdmin
    .from("habits")
    .select("id, user_id, name, reminder_time")
    .in("user_id", userIds)
    .eq("is_archived", false);

  if (habitsError) {
    return NextResponse.json({ error: habitsError.message }, { status: 500 });
  }

  // 3. Fetch push subscriptions for those users
  const { data: subs, error: subsError } = await supabaseAdmin
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth")
    .in("user_id", userIds);

  if (subsError) {
    return NextResponse.json({ error: subsError.message }, { status: 500 });
  }

  // Group habits and subscriptions by user
  const habitsByUser = new Map<string, HabitRow[]>();
  for (const h of (habits ?? []) as HabitRow[]) {
    const list = habitsByUser.get(h.user_id) ?? [];
    list.push(h);
    habitsByUser.set(h.user_id, list);
  }

  const subsByUser = new Map<string, SubscriptionRow[]>();
  for (const s of (subs ?? []) as SubscriptionRow[]) {
    const list = subsByUser.get(s.user_id) ?? [];
    list.push(s);
    subsByUser.set(s.user_id, list);
  }

  // 4. For each user, check which habits match the current local time
  let sent = 0;
  let errors = 0;
  const staleSubIds: string[] = [];

  for (const [userId, pref] of prefsByUser) {
    const currentHHMM = getCurrentHHMM(pref.timezone);
    const userHabits = habitsByUser.get(userId) ?? [];

    const matched = userHabits.filter((h) => {
      const time = h.reminder_time ?? pref.default_reminder_time;
      return time === currentHHMM;
    });

    if (matched.length === 0) continue;

    const habitNames = matched.map((h) => h.name).join(", ");
    const body = `Time to: ${habitNames}`;

    // 5a. Send push notifications
    if (pref.push_enabled) {
      const userSubs = subsByUser.get(userId) ?? [];
      for (const sub of userSubs) {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            JSON.stringify({
              title: "Loopzi Reminder",
              body,
              tag: "habit-reminder",
              url: "/today",
            })
          );
          sent++;
        } catch (err: unknown) {
          const status = (err as { statusCode?: number }).statusCode;
          if (status === 410 || status === 404) {
            staleSubIds.push(sub.id);
          } else {
            errors++;
          }
        }
      }
    }

    // 5b. Send email reminder
    if (pref.email_enabled) {
      try {
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
        const email = authUser?.user?.email;
        if (email) {
          await resend.emails.send({
            from: "Loopzi <reminders@loopzi.app>",
            to: email,
            subject: "Loopzi Reminder",
            html: `<p>Hey! ${body} 💪</p><p><a href="https://loopzi.app/today">Open Loopzi</a></p>`,
          });
          sent++;
        }
      } catch {
        errors++;
      }
    }
  }

  // 6. Clean up stale push subscriptions
  if (staleSubIds.length > 0) {
    await supabaseAdmin.from("push_subscriptions").delete().in("id", staleSubIds);
  }

  return NextResponse.json({
    sent,
    errors,
    staleSubscriptionsRemoved: staleSubIds.length,
  });
}
