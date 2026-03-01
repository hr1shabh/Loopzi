import type { HabitPeriod } from "@/types";

// ─── Helpers ────────────────────────────────────────────────

/** Parse "YYYY-MM-DD" into UTC-based day components and return a UTC ms timestamp. */
function toUTCMs(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

/** Number of calendar days between two "YYYY-MM-DD" strings (b − a). */
function daysBetween(a: string, b: string): number {
  return Math.round((toUTCMs(b) - toUTCMs(a)) / 86_400_000);
}

/** Return the Monday "YYYY-MM-DD" of the ISO week containing `dateStr`. */
export function getMondayOfWeek(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dow = dt.getUTCDay(); // 0=Sun
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  dt.setUTCDate(dt.getUTCDate() + mondayOffset);
  return dt.toISOString().split("T")[0];
}

// ─── Validate (decay stale streaks on read) ─────────────────

/**
 * Check whether a stored streak is still valid.
 * Returns the validated `current` value — either unchanged or 0 (broken).
 *
 * Call this when *reading* streaks (e.g. dashboard load) so users see
 * 0 for habits they've fallen behind on, without needing a DB write.
 */
export function validateStreak(
  period: HabitPeriod,
  currentStreak: number,
  lastCompletedDate: string | undefined | null,
  today: string
): number {
  if (!lastCompletedDate || currentStreak === 0) return 0;

  if (period === "daily") {
    const diff = daysBetween(lastCompletedDate, today);
    // Valid if completed today or yesterday
    return diff <= 1 && diff >= 0 ? currentStreak : 0;
  }

  // Weekly: valid if same week or the immediately previous week
  const lastMonday = getMondayOfWeek(lastCompletedDate);
  const todayMonday = getMondayOfWeek(today);
  const weekDiff = daysBetween(lastMonday, todayMonday) / 7;
  return weekDiff <= 1 && weekDiff >= 0 ? currentStreak : 0;
}

// ─── Compute (update streak after a check-in) ──────────────

interface StreakRow {
  current: number;
  best: number;
  last_completed_date: string | null;
}

interface StreakUpdateResult {
  current: number;
  best: number;
  lastCompletedDate: string;
}

/**
 * Compute new streak values after a habit's period target is met.
 * Only call this when `completionsThisPeriod >= target`.
 */
export function computeStreakUpdate(
  period: HabitPeriod,
  streakRow: StreakRow | null,
  checkInDate: string
): StreakUpdateResult {
  const prev = streakRow?.last_completed_date;
  let newCurrent = 1;

  if (prev) {
    if (period === "daily") {
      const diff = daysBetween(prev, checkInDate);
      if (diff === 1) {
        newCurrent = (streakRow?.current || 0) + 1;
      } else if (diff === 0) {
        newCurrent = streakRow?.current || 1;
      }
      // diff > 1 → gap → stays 1
    } else {
      // Weekly: compare ISO weeks
      const prevMonday = getMondayOfWeek(prev);
      const checkMonday = getMondayOfWeek(checkInDate);
      const weekDiff = daysBetween(prevMonday, checkMonday) / 7;

      if (weekDiff === 1) {
        newCurrent = (streakRow?.current || 0) + 1;
      } else if (weekDiff === 0) {
        newCurrent = streakRow?.current || 1;
      }
      // weekDiff > 1 → gap → stays 1
    }
  }

  const newBest = Math.max(newCurrent, streakRow?.best || 0);

  return { current: newCurrent, best: newBest, lastCompletedDate: checkInDate };
}
