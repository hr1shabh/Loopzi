# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Dev server with Turbopack at localhost:3000
npm run build    # Production build
npm run lint     # ESLint (eslint)
npm start        # Run production server
```

No test framework is configured yet.

## Architecture

**Loopzi** is a habit-tracking PWA built with Next.js 16 (App Router), Supabase (Postgres + Auth + RLS), and shadcn/ui.

### Tech Stack
- Next.js 16, React 19, TypeScript 5
- Tailwind CSS 4 with OKLch color tokens (coral `#FF6B6B`, teal `#2EC4B6`)
- Fonts: Space Grotesk (headings), DM Sans (body) via `next/font/google`
- Supabase for database, auth (Google OAuth + Magic Link), and row-level security
- react-hook-form + Zod for form validation
- shadcn/ui (New York style, stone base color, lucide icons)

### Path Alias
`@/*` maps to `./src/*` (configured in tsconfig.json)

### Routing & Auth
- **Route group `(app)`** wraps authenticated pages (`/today`, `/habits`) with a shared `BottomNav` layout
- **Middleware** (`src/middleware.ts`) runs on every request: refreshes Supabase JWT, protects routes, redirects authenticated users from `/` and auth pages to `/today`
- **Auth flow**: Server Actions in `src/app/auth/actions.ts` → Supabase OAuth/magic link → callback at `/auth/callback` exchanges code for session cookie

### API Layer
- REST routes under `src/app/api/`
- All API routes authenticate via `supabase.auth.getUser()` and return 401 if missing
- `GET /api/today?date=YYYY-MM-DD` — dashboard data (parallel queries via `Promise.all`)
- `GET/POST /api/habits` — list/create habits (POST also creates initial streak row)
- `PATCH /api/habits/[id]` — update/archive habit
- `POST /api/habits/[id]/check-ins` — create check-in (enforces target cap with 409, updates streak)

### Database
Schema in `supabase/migrations/001_initial_schema.sql`. Key tables: `habits`, `check_ins`, `streaks`, `push_subscriptions`, `reminder_preferences`. All have RLS policies scoped to `auth.uid() = user_id`. Foreign keys cascade on delete.

Important: `check_ins.date` is a `DATE` (user's local date), while `check_ins.completed_at` is `TIMESTAMPTZ` (UTC).

### Key Patterns
- **Optimistic UI**: Check-ins update state immediately, revert via full refetch on error
- **Concurrent loading**: `Set<string>` of in-progress habit IDs allows simultaneous check-in spinners
- **Streak logic**: Compares `last_completed_date` to today — continues if diff is 1 day (daily) or ≤7 days (weekly), resets on gap
- **Zod schemas** in `src/lib/validations/` are the single source of truth for API input validation and inferred TypeScript types
- **View models** (`HabitCardVM`, `TodayDashboardVM` in `src/types/index.ts`) shape API responses for the frontend

### Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL       # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY  # Public anon key (RLS-protected)
```

### Formatting
Prettier config: semicolons, double quotes, 2-space indent, trailing commas (es5), 100 char print width.
