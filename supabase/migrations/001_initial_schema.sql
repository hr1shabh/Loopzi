-- ╔══════════════════════════════════════════════════════════════╗
-- ║  Loopzi — Database Schema (MVP)                             ║
-- ║  Run this in Supabase Dashboard → SQL Editor → New Query    ║
-- ╚══════════════════════════════════════════════════════════════╝

-- ─── 1. Habits ─────────────────────────────────────────────────
-- Stores each habit created by a user.
-- `period` is either 'daily' or 'weekly'.
-- `target_per_period` = how many times per day/week to complete.

CREATE TABLE IF NOT EXISTS habits (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL CHECK (char_length(name) >= 1),
  emoji         TEXT,
  color         TEXT,
  period        TEXT NOT NULL DEFAULT 'daily' CHECK (period IN ('daily', 'weekly')),
  target_per_period INTEGER NOT NULL DEFAULT 1 CHECK (target_per_period >= 1),
  reminder_time TEXT,                    -- e.g., "21:00" (local time)
  is_archived   BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index: quickly find a user's active habits
CREATE INDEX idx_habits_user_active ON habits (user_id, is_archived);


-- ─── 2. Check-Ins ──────────────────────────────────────────────
-- One row per completion event.
-- `date` is the LOCAL date (user's timezone), e.g., '2026-02-28'.
-- A user can have multiple check-ins per habit per day (if target > 1).

CREATE TABLE IF NOT EXISTS check_ins (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  habit_id      UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date          DATE NOT NULL,           -- local date key
  completed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  note          TEXT
);

-- Index: look up today's check-ins for a user, or a habit's history
CREATE INDEX idx_checkins_user_date ON check_ins (user_id, date);
CREATE INDEX idx_checkins_habit_date ON check_ins (habit_id, date);

-- Unique constraint: prevent duplicate check-in rows
-- (Each check-in is a unique event tracked by its UUID, so no extra
--  unique constraint needed — the target cap is enforced in app logic.)


-- ─── 3. Streaks ────────────────────────────────────────────────
-- Materialized streak data, updated on each check-in.
-- One row per habit.

CREATE TABLE IF NOT EXISTS streaks (
  habit_id             UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current              INTEGER NOT NULL DEFAULT 0,
  best                 INTEGER NOT NULL DEFAULT 0,
  last_completed_date  DATE,
  freezes_left         INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (habit_id)
);

CREATE INDEX idx_streaks_user ON streaks (user_id);


-- ─── 4. Push Subscriptions ─────────────────────────────────────
-- Web Push subscription data for sending push notifications.
-- One user can have multiple subscriptions (multiple devices).

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint   TEXT NOT NULL,
  p256dh     TEXT NOT NULL,              -- public key
  auth       TEXT NOT NULL,              -- auth secret
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_push_subs_user ON push_subscriptions (user_id);


-- ─── 5. Reminder Preferences ──────────────────────────────────
-- Per-user reminder settings.
-- One row per user.

CREATE TABLE IF NOT EXISTS reminder_preferences (
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  timezone             TEXT NOT NULL DEFAULT 'UTC',
  push_enabled         BOOLEAN NOT NULL DEFAULT false,
  email_enabled        BOOLEAN NOT NULL DEFAULT false,
  default_reminder_time TEXT DEFAULT '21:00'
);


-- ═══════════════════════════════════════════════════════════════
-- Row-Level Security (RLS)
-- Users can ONLY read/write their own data.
-- ═══════════════════════════════════════════════════════════════

-- ─── Enable RLS on all tables ──────────────────────────────────
ALTER TABLE habits              ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_ins           ENABLE ROW LEVEL SECURITY;
ALTER TABLE streaks             ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_preferences ENABLE ROW LEVEL SECURITY;

-- ─── Habits ────────────────────────────────────────────────────
CREATE POLICY "Users can view own habits"
  ON habits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own habits"
  ON habits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own habits"
  ON habits FOR UPDATE
  USING (auth.uid() = user_id);

-- ─── Check-Ins ─────────────────────────────────────────────────
CREATE POLICY "Users can view own check-ins"
  ON check_ins FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own check-ins"
  ON check_ins FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ─── Streaks ───────────────────────────────────────────────────
CREATE POLICY "Users can view own streaks"
  ON streaks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own streaks"
  ON streaks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own streaks"
  ON streaks FOR UPDATE
  USING (auth.uid() = user_id);

-- ─── Push Subscriptions ────────────────────────────────────────
CREATE POLICY "Users can view own push subs"
  ON push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own push subs"
  ON push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own push subs"
  ON push_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

-- ─── Reminder Preferences ─────────────────────────────────────
CREATE POLICY "Users can view own reminder prefs"
  ON reminder_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own reminder prefs"
  ON reminder_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reminder prefs"
  ON reminder_preferences FOR UPDATE
  USING (auth.uid() = user_id);


-- ═══════════════════════════════════════════════════════════════
-- Auto-update `updated_at` on habits table
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_habits_updated_at
  BEFORE UPDATE ON habits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
