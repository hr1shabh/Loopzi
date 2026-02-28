// ─── Primitives ────────────────────────────────────────────
/** Date in ISO format: "2026-02-28" */
export type ISODate = string;

/** DateTime in ISO format: "2026-02-28T10:15:00.000Z" */
export type ISODateTime = string;

/** Habit recurrence period */
export type HabitPeriod = "daily" | "weekly";

// ─── Core Entities ─────────────────────────────────────────

export interface Habit {
  id: string;
  name: string;
  emoji?: string;
  color?: string;
  period: HabitPeriod;
  targetPerPeriod: number;
  reminderTime?: string; // "21:00" local
  isArchived: boolean;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface HabitCheckIn {
  id: string;
  habitId: string;
  date: ISODate; // local date key
  completedAt: ISODateTime;
  note?: string;
}

export interface HabitStreak {
  habitId: string;
  current: number;
  best: number;
  lastCompletedDate?: ISODate;
  freezesLeft: number;
}

// ─── View Models ───────────────────────────────────────────

export interface HabitCardVM {
  habit: Habit;
  completedToday: boolean;
  todayCount: number;
  targetToday: number;
  streak: HabitStreak;
}

export interface TodayDashboardVM {
  date: ISODate;
  habits: HabitCardVM[];
  completionRate: number; // 0..1
}
