# Loopzi — Learning Changelog

> Every change documented for learning. Newest entries at the top.

---

## Step 6 — Streak Engine (Mar 1, 2026)

### What was done
Extracted streak logic from the inline check-in API route into a dedicated utility module (`src/lib/streaks.ts`), fixed stale streaks showing on dashboard load, corrected weekly streak semantics to use calendar weeks instead of a rolling 7-day window, and added optimistic streak updates on the Today page.

### Changes

| File | What & Why |
|---|---|
| `src/lib/streaks.ts` | **New file** — the streak engine utility. Three exports: `getMondayOfWeek(dateStr)` returns the Monday of any date's ISO week. `validateStreak(period, current, lastCompletedDate, today)` checks if a stored streak is still valid — returns 0 if it's decayed (user missed a day/week). `computeStreakUpdate(period, streakRow, checkInDate)` computes new `{ current, best, lastCompletedDate }` when a habit's target is met. All date math uses `Date.UTC()` to avoid local timezone pitfalls — dates are parsed as `YYYY-MM-DD` strings, diffs computed via integer division of UTC milliseconds. |
| `src/app/api/today/route.ts` | Added streak validation on read. After fetching raw streaks from the DB, each one is passed through `validateStreak()` before building the `HabitCardVM`. If a user hasn't checked in for 3 days, the dashboard now correctly shows streak 0 instead of the stale DB value. No DB write needed — validation is read-only. |
| `src/app/api/habits/[id]/check-ins/route.ts` | Replaced ~50 lines of inline streak computation (date diffing, daily/weekly branching, best tracking) with a single `computeStreakUpdate()` call. The route still handles the DB upsert, but the calculation is delegated to the utility. Also fixed weekly streaks: previously used `diffDays <= 7` (rolling window), now uses `getMondayOfWeek()` comparison (calendar weeks). |
| `src/app/(app)/today/page.tsx` | Enhanced the optimistic update: when a check-in completes the target (`newCompleted && !card.completedToday`), the streak is also bumped immediately — `current + 1` and `best = max(current + 1, best)`. The flame badge now appears instantly on check-in instead of waiting for the server response. |

### Key patterns used
- **Validate-on-read (no decay writes)**: Instead of running a cron job or writing decayed streaks back to the DB, we validate streaks at read time in the `/api/today` endpoint. The DB stores the "last known good state," and the API adjusts it before returning. This avoids unnecessary writes and keeps the source of truth simple.
- **UTC-only date math**: All date arithmetic uses `Date.UTC(y, m-1, d)` to construct timestamps, avoiding `new Date("2026-03-01")` which can interpret dates in local timezone on the server. Day diffs are computed as `(utcB - utcA) / 86_400_000` — integer division of milliseconds, no rounding surprises from DST.
- **Calendar week comparison for weekly streaks**: Instead of checking if the last completion was "within 7 days" (a sliding window that could span parts of 3 different weeks), we compare the Monday of each date's week. `weekDiff === 1` means consecutive ISO weeks, `weekDiff === 0` means same week.

### Concepts learned
- **Stale streak problem**: When the streak engine only updates on check-in (write path), streaks never decay on their own. A user who had a 30-day streak but missed 2 weeks would still see "30" on the dashboard. The fix is to validate on the read path — check if `lastCompletedDate` is recent enough for the streak to still be alive.
- **`Date.UTC()` vs `new Date()`**: `new Date("2026-03-01")` is interpreted as UTC in some environments but local time in others (the spec is ambiguous for date-only strings). `Date.UTC(2026, 2, 1)` is always UTC. For date-only arithmetic (no time component), this avoids off-by-one errors near midnight or DST transitions.
- **ISO week boundaries**: ISO weeks run Monday–Sunday. To find Monday: `dayOfWeek === 0 ? -6 : 1 - dayOfWeek` (Sunday is a special case because `getUTCDay()` returns 0). Two dates are in the same ISO week if they share the same Monday.
- **Optimistic streak updates**: The streak badge is a secondary piece of data (not the primary check-in count), but it still benefits from optimistic updates. The simple heuristic `current + 1` is correct most of the time — the server-confirmed value arrives ~200ms later and overwrites it if different.

---

## Step 5 — Today Dashboard + One-Tap Check-In (Mar 1, 2026)

### What was done
Built the core daily experience — the Today dashboard where users see their habits, tap to check in, watch progress update in real time, and see streak badges. Includes two new API endpoints and optimistic UI with animations.

### Changes

| File | What & Why |
|---|---|
| `src/lib/validations/check-in.ts` | Zod schema for check-in creation. Validates `date` (must be `YYYY-MM-DD` regex) and optional `note` (max 500 chars). The `habitId` comes from the URL path param, not the body — follows REST conventions. |
| `src/types/index.ts` | Added `CheckInResponse` interface — the shape returned by the check-in POST endpoint: `{ todayCount, completedToday, streak }`. Keeps the API contract typed end-to-end. |
| `src/app/globals.css` | Added `@keyframes check-in-pop` animation — a satisfying bounce effect (`scale(0) → 1.3 → 0.9 → 1`) with a custom `cubic-bezier(0.34, 1.56, 0.64, 1)` easing that overshoots then settles. Used on the green checkmark when a habit is completed. No extra dependency needed — pure CSS. |
| `src/app/api/today/route.ts` | `GET /api/today?date=YYYY-MM-DD` — the dashboard data endpoint. Runs 4 Supabase queries in parallel via `Promise.all`: active habits, today's check-ins, this week's check-ins (for weekly habits), and streaks. Merges results in JS using `Map` lookups, builds `HabitCardVM[]`, computes `completionRate`, and returns the full `TodayDashboardVM`. The client sends its local date so the server uses the correct timezone. |
| `src/app/api/habits/[id]/check-ins/route.ts` | `POST /api/habits/:id/check-ins` — creates a check-in. Validates body with Zod, verifies habit ownership + not archived, counts existing check-ins for the period (daily = today, weekly = Mon–Sun range), and returns **409** if target already reached. After inserting, does a basic streak update: compares `last_completed_date` to today — if yesterday, continues streak; if gap, resets to 1. Updates `best = max(current, best)`. |
| `src/components/habit-card.tsx` | Interactive habit card component. Shows emoji (with colored background), name, progress counter (`2/3`), and streak badge with flame icon. Action button varies: "Done" for single-target habits, "+1" for multi-target. Completed state: emerald-50 background tint, green checkmark with bounce animation, green text. Uses `cn()` for conditional class composition. |
| `src/app/(app)/today/page.tsx` | Complete rewrite from server-component placeholder to full `"use client"` dashboard. Features: time-based greeting, overall progress bar (coral → emerald at 100%), habit card list, skeleton loaders, empty state with CTA. **Optimistic UI**: tapping check-in instantly updates the count/progress, then server response confirms with streak data. Uses `Set<string>` for `checkingIds` so multiple habits can be checked in simultaneously. `visibilitychange` listener re-fetches if the date rolls past midnight. |

### Key patterns used
- **`Promise.all` for parallel queries**: The `/api/today` endpoint fires 4 independent Supabase queries simultaneously instead of sequentially — significantly faster than waterfall.
- **Optimistic updates**: UI updates immediately on tap, API call happens in background. On failure, reverts by re-fetching from server. This makes check-ins feel instant.
- **`Set<string>` for concurrent loading states**: Instead of a single `checkingHabitId: string | null`, a Set allows multiple habits to show loading spinners simultaneously. Each habit's check-in is independent.
- **Target cap enforcement (409)**: The server counts existing check-ins before inserting. If already at target, returns HTTP 409 Conflict. Prevents over-counting even with rapid taps.
- **`localDateRef` + `visibilitychange`**: The user's local date is stored in a ref and rechecked when the tab regains focus. If the date changed (user left tab open past midnight), the dashboard re-fetches with the new date.

### Concepts learned
- **Optimistic UI pattern**: Update state immediately before the API responds. `setDashboard(prev => ...)` modifies the local state, then the `fetch` call confirms or reverts. This is a standard React pattern for perceived performance — the UI feels instant even on slow networks.
- **HTTP 409 Conflict**: The correct status code for "this action conflicts with the current state." Used when a habit's target is already reached. More specific than 400 (bad request) — the request is valid, just not allowed *right now*.
- **`new Date().toLocaleDateString("en-CA")`**: The `en-CA` locale formats dates as `YYYY-MM-DD` (ISO format). A clever trick to get ISO date strings without string manipulation or `toISOString().split("T")[0]` (which uses UTC, not local time).
- **CSS `cubic-bezier` with values > 1**: The second control point `1.56` exceeds the 0–1 range, creating an "overshoot" effect where the animation goes *past* the target and bounces back. This is what makes the checkmark pop feel playful.
- **`useRef` for mutable values**: `localDateRef` stores the current date without triggering re-renders. Unlike `useState`, updating a ref doesn't cause the component to re-render — perfect for values that are read (not displayed) on demand.
- **Week range calculation**: To find Monday–Sunday for a given date: `dayOfWeek === 0 ? -6 : 1 - dayOfWeek` handles the Sunday edge case (JS `getDay()` returns 0 for Sunday). Monday is always offset from the current day of the week.

---

## Step 4 — Habit CRUD + Onboarding (Feb 28, 2026)

### What was done
Built the full habit management system — API routes for CRUD, a polished bottom sheet form with emoji/color pickers, onboarding for first-time users, and a bottom navigation bar for all app pages.

### Changes

| File | What & Why |
|---|---|
| `src/lib/validations/habit.ts` | Zod schemas for habit create/update. `createHabitSchema` validates name (1-50 chars), period (`daily`/`weekly`), targetPerPeriod (1-99). `updateHabitSchema` extends it with `.partial()` — all fields become optional for PATCH updates. Types are inferred from schemas via `z.infer<>`. |
| `src/app/api/habits/route.ts` | `GET` fetches all habits (filterable by `?archived=true`). `POST` validates with Zod, inserts into DB, and also creates an initial `streaks` row with zeroed counters. Auth is checked via `getUser()` and RLS provides defense-in-depth. |
| `src/app/api/habits/[id]/route.ts` | `PATCH` endpoint for editing or archiving. Maps camelCase inputs (`targetPerPeriod`) to snake_case DB columns (`target_per_period`). Uses both explicit `user_id` check AND RLS for double safety. |
| `src/components/habit-form-sheet.tsx` | Bottom sheet form using shadcn's `Sheet` component (`side="bottom"`). Includes emoji picker (20 curated emojis), color picker (6 preset colors), frequency radio (Daily/Weekly), target input, and reminder time. Uses `react-hook-form` with `zodResolver` for validation. Reusable for both create and edit via an optional `habit` prop. |
| `src/app/(app)/habits/page.tsx` | Habits management page. Shows onboarding with 4 suggested templates when user has zero habits. Lists active habits with edit/archive. Includes "Show archived" toggle with restore button. |
| `src/app/(app)/today/page.tsx` | Placeholder `/today` page with server-side greeting using the user's name from OAuth metadata. Will be fully built in Step 5. |
| `src/components/bottom-nav.tsx` | Fixed bottom navigation bar with 5 tabs (Today, Habits, History, Insights, Me). Uses `usePathname()` to highlight the active route. Coral accent color for active tab. |
| `src/app/(app)/layout.tsx` | Route group layout that wraps all authenticated pages with the bottom nav and bottom padding (`pb-20`). |
| `src/app/globals.css` | Added `.safe-bottom` utility for iPhone safe area insets. |
| `src/app/auth/callback/route.ts` | **Bug fix**: Rewrote to create a custom Supabase client that writes session cookies directly onto the `NextResponse.redirect()` object. The previous version used `cookies()` from `next/headers`, which doesn't transfer cookies to manually created redirect responses. |

### Bugs fixed
1. **Auth redirect loop**: After Google OAuth, users were redirected to `/today` but immediately sent back to `/auth/login`. Root cause: the callback route used the shared `createClient()` from `server.ts` which calls `cookies().set()`, but `NextResponse.redirect()` creates a *new* response object — so the session cookies were lost. Fix: create a Supabase client in the callback that writes directly to `response.cookies.set()`.

### Concepts learned
- **Zod `.partial()`**: Creates a new schema where all fields are optional. Perfect for PATCH endpoints where you only send changed fields. `z.infer<>` extracts the TypeScript type from the schema — single source of truth for validation AND types.
- **react-hook-form + zodResolver**: `useForm({ resolver: zodResolver(schema) })` connects Zod validation to the form. `register("fieldName")` returns `{ onChange, onBlur, ref, name }` props that wire up an input automatically. `{ valueAsNumber: true }` converts string inputs to numbers.
- **Route Groups `(app)`**: Folders wrapped in parentheses like `(app)` don't affect the URL. `src/app/(app)/today/page.tsx` still serves `/today`. Used to share a layout (bottom nav) across authenticated pages without adding a URL segment.
- **`response.cookies.set()` vs `cookies().set()`**: In Route Handlers, `cookies()` from `next/headers` writes to an internal response. But if you return `NextResponse.redirect()`, that's a *different* response object — the cookies don't transfer. You must write directly to the response you return.
- **CSS `env(safe-area-inset-bottom)`**: Environment variable provided by iPhone Safari for the area below the home indicator bar. `padding-bottom: env(safe-area-inset-bottom, 0px)` adds padding on iPhones and falls back to 0 on other devices.
- **`has-[:checked]` CSS selector**: Tailwind utility that styles a parent based on a child's state. Used for the frequency radio buttons: `has-[:checked]:border-coral` highlights the selected option without JavaScript.

---

## Step 3 — Authentication: OAuth + Magic Link (Feb 28, 2026)

### What was done
Built the full authentication flow — Google OAuth, email magic link sign-in, session-aware middleware with route protection, and a polished login page.

### Changes

| File | What & Why |
|---|---|
| `src/app/auth/actions.ts` | Server Actions for auth. `signInWithOAuth("google")` initiates the OAuth flow by calling `supabase.auth.signInWithOAuth()` and redirecting to Google's consent screen. `signInWithMagicLink(email)` sends a one-time login link via `supabase.auth.signInWithOtp()`. `signOut()` clears the session and redirects to login. Server Actions are `"use server"` functions — they run on the server but can be called directly from Client Components. |
| `src/app/auth/callback/route.ts` | Route Handler for OAuth redirects. After Google auth or magic link click, Supabase redirects here with a `code` query parameter. We call `exchangeCodeForSession(code)` to convert it into a session cookie, then redirect to `/today`. This is a Route Handler (not a page) — it processes the request and redirects, never renders UI. |
| `src/app/auth/login/page.tsx` | Login page UI. A `"use client"` component with three auth options: Google OAuth button, email magic link input, and a success state shown after sending the link. Uses `useTransition()` for non-blocking form submissions. The page has decorative background gradients, the Loopzi brand header, and a card-based layout. |
| `src/middleware.ts` | Updated to add route protection. Now captures the `user` from `getUser()` (previously just called it for token refresh). Defines `PROTECTED_ROUTES` (`/today`, `/habits`, etc.) and `AUTH_ROUTES` (`/auth/login`). Unauthenticated users on protected routes → redirect to login. Authenticated users on `/` or login page → redirect to `/today`. |
| `src/app/page.tsx` | Updated CTA button from `/today` → `/auth/login` so unauthenticated users land on the login page instead of a 404. |

### Auth Flow Diagram

```
User clicks "Continue with Google"
  → Server Action calls supabase.auth.signInWithOAuth()
  → Supabase returns Google's consent URL
  → Server Action redirects browser to Google
  → User signs in on Google
  → Google redirects to Supabase callback URL
  → Supabase redirects to /auth/callback?code=xxx
  → Route Handler exchanges code for session cookie
  → Redirect to /today (authenticated!)
```

### Concepts learned
- **Server Actions (`"use server"`)**: Functions that run on the server but are callable from client-side code. Next.js handles the network request automatically. Useful for auth because sensitive operations (session creation) stay server-side.
- **Route Handlers**: Files named `route.ts` in the `app/` directory that handle raw HTTP requests (like Express routes). They don't render UI — they return `NextResponse` (redirect, JSON, etc.). Used for the OAuth callback because it needs to process a request, not render a page.
- **OAuth flow**: A multi-step redirect dance: App → Provider (Google) → Supabase → App callback. The `code` parameter is a one-time token that gets exchanged for a real session. This "authorization code" flow is more secure than passing tokens directly through the browser URL.
- **`useTransition()`**: React 19 hook for non-urgent state updates. Wrapping async calls in `startTransition()` keeps the UI responsive — the button shows a loading spinner without blocking other interactions.
- **Middleware route protection**: Checking auth state in middleware (not in each page) is the recommended pattern because middleware runs before the page renders. Without it, protected pages would flash briefly before redirecting.
- **`request.nextUrl.clone()`**: Must clone the URL before modifying it for redirects. The original `nextUrl` is read-only.

---

## Step 2 — Supabase Setup & Database Schema (Feb 28, 2026)

### What was done
Prepared the full Supabase backend integration — packages, client helpers, auth middleware, and the complete SQL migration with 5 tables and RLS policies.

### Changes

| File | What & Why |
|---|---|
| `.env.local.example` | Template for Supabase credentials. `NEXT_PUBLIC_` prefix exposes values to the browser — safe because the anon key is meant to be public. RLS protects the data, not the key. |
| `src/lib/supabase/client.ts` | Browser-side client for Client Components. Uses `createBrowserClient` from `@supabase/ssr`. One function, returns a configured Supabase instance. |
| `src/lib/supabase/server.ts` | Server-side client for Server Components/Route Handlers. Integrates with Next.js `cookies()` so auth sessions are read from HTTP cookies (not localStorage). The `try/catch` in `setAll` handles the fact that Server Components can't set cookies (middleware does it instead). |
| `src/middleware.ts` | Runs on EVERY request. Its sole job: call `supabase.auth.getUser()` to refresh the JWT token before it expires (default: 1 hour). Without this, users get silently logged out. The `matcher` config excludes static assets. |
| `supabase/migrations/001_initial_schema.sql` | All 5 database tables + indexes + RLS policies + auto-update trigger. This SQL is pasted into the Supabase SQL Editor. |

### Database Schema

| Table | Purpose | Key Columns |
|---|---|---|
| `habits` | User's habits | `name`, `period` (daily/weekly), `target_per_period`, `is_archived` |
| `check_ins` | Each completion event | `habit_id`, `date` (local), `completed_at` (UTC) |
| `streaks` | Cached streak data | `current`, `best`, `last_completed_date` |
| `push_subscriptions` | Web Push endpoints | `endpoint`, `p256dh`, `auth` (keys for encryption) |
| `reminder_preferences` | Per-user settings | `timezone`, `push_enabled`, `email_enabled`, `default_reminder_time` |

### Concepts learned
- **RLS (Row-Level Security)**: Postgres feature where the database itself enforces "who can see what." The policy `auth.uid() = user_id` means every query automatically filters to only the logged-in user's rows. Even if someone bypasses the frontend, the DB rejects unauthorized reads.
- **Why two clients?** Browser client uses cookies managed by the browser itself. Server client must manually read/write cookies via Next.js `cookies()` API — they're in different execution contexts.
- **Middleware in Next.js**: A function that runs before every route match. Placed at `src/middleware.ts` (must be this exact path). The `matcher` config controls which routes trigger it.
- **`TIMESTAMPTZ` vs `DATE`**: `TIMESTAMPTZ` stores an absolute moment in time (UTC). `DATE` stores just a date without timezone — we use it for `check_ins.date` because "Feb 28" means "Feb 28 in the user's timezone," not UTC.
- **Foreign Keys + `ON DELETE CASCADE`**: When a user is deleted from `auth.users`, all their habits, check-ins, streaks, etc. are automatically deleted too. No orphaned data.
- **Trigger function**: `update_updated_at()` runs automatically before every UPDATE on the `habits` table, setting `updated_at = now()`. You never have to remember to set it manually.

---

## Step 1 · Part 3 — PWA Configuration (Feb 28, 2026)

### What was done
Made the app installable as a Progressive Web App on iPhone and desktop. Added offline support and push notification groundwork.

### Changes

| File | What & Why |
|---|---|
| `src/app/manifest.ts` | Next.js 16 native manifest — exports a function that returns `MetadataRoute.Manifest`. Next.js auto-generates the JSON and links it in `<head>`. `start_url: "/today"` means the PWA opens to the daily check-in, not the landing page. `display: "standalone"` removes the browser chrome (URL bar, etc.). |
| `public/sw.js` | Service worker — plain JavaScript (NOT TypeScript, because browsers load it directly). Handles 3 events: `install` (cache offline page), `fetch` (network-first with offline fallback), and `push` (show notifications). `skipWaiting()` + `clients.claim()` make new versions activate immediately. |
| `src/app/offline/page.tsx` | Offline fallback page. Uses `"use client"` because it has an `onClick` handler — Server Components can't have event handlers. |
| `src/hooks/use-service-worker.ts` | Custom React hook that registers `sw.js`. Uses `useEffect` with empty deps `[]` so it runs exactly once on mount. |
| `src/components/service-worker-registrar.tsx` | Thin wrapper component that calls the hook. Returns `null` (no visible UI). Placed in root layout so SW registration happens on every page load. |
| `src/app/layout.tsx` | Added `apple-touch-icon` for iOS home screen icon, `appleWebApp` metadata for iOS PWA behavior, and `viewport` export with `viewportFit: "cover"` for edge-to-edge display on notched iPhones. |
| `public/icons/icon-192x192.png` | App icon at 192×192 (used in manifest + notifications). |
| `public/icons/icon-512x512.png` | App icon at 512×512 (used in manifest for splash screen). |

### Bugs fixed during verification
1. **`/offline` returned 500**: Missing `"use client"` directive. In Next.js, any component that uses browser APIs (event handlers, `useState`, `useEffect`, etc.) must be a Client Component.
2. **Service Worker failed to register**: Original `sw.js` had TypeScript syntax (`as unknown as`, type annotations). Files in `public/` are served directly to the browser — they must be plain JS.

### Concepts learned
- **PWA = Manifest + Service Worker + HTTPS.** That's all you need. No special library required in Next.js 16.
- **`manifest.ts` vs `manifest.json`**: The `.ts` version is a function so you can dynamically generate values (e.g., different icons for dev/prod). Next.js serves it at `/manifest.webmanifest` automatically.
- **Service Worker lifecycle**: `install` → `activate` → `fetch`. New versions wait for all tabs to close unless you call `skipWaiting()`. `clients.claim()` lets the new SW control existing tabs immediately.
- **Network-first strategy**: Try the network first; if it fails (offline), fall back to cache. Good for dynamic content. (Cache-first is better for static assets.)
- **`viewportFit: "cover"`**: Tells the browser to extend content into safe areas (behind the notch/Dynamic Island on iPhone). Without this, there's a blank gap at the top.
- **Server vs Client Components**: Server Components (default in Next.js App Router) run on the server and can't have interactivity. Any component with `useState`, `useEffect`, event handlers, or browser APIs must use `"use client"`.

---

## Step 1 · Part 2 — shadcn/ui + Google Fonts + Design Tokens (Feb 28, 2026)

### What was done
Installed the shadcn/ui component library, loaded custom Google Fonts, and defined the Loopzi brand color system as CSS design tokens.

### Changes

| File | What & Why |
|---|---|
| `components.json` | Auto-generated by `npx shadcn init`. Tells shadcn CLI where to place components (`src/components/ui`), which alias to use (`@/`), and which base color theme (`stone`). |
| `src/app/globals.css` | Massively expanded by shadcn with CSS custom properties. We customized: `--background` to warm off-white (`oklch(0.975 0.005 80)`), added `--font-heading` / `--font-body` tokens, and brand colors (`--color-coral`, `--color-teal` + light/dark variants). Also added `font-body` to `<body>` and `font-heading` to all headings via `@layer base`. |
| `src/app/layout.tsx` | Imports `Space_Grotesk` and `DM_Sans` via `next/font/google` — Next.js self-hosts these fonts (no requests to Google's servers). Uses CSS variable injection: `variable: "--font-heading"` links the font to our Tailwind token. |
| `src/app/page.tsx` | Rebuilt using shadcn's `<Button>`, `<Card>`, `<Badge>` components instead of raw HTML. Uses semantic color classes (`bg-coral`, `bg-teal`, `text-muted-foreground`) instead of hardcoded hex values. |
| `src/components/ui/*.tsx` | 9 shadcn components added: `button`, `card`, `input`, `sheet`, `dialog`, `tabs`, `badge`, `progress`, `separator`. These are *owned* code — copied into our project, not imported from a package. |
| `src/lib/utils.ts` | Updated by shadcn CLI — now uses `clsx` + `tailwind-merge` for the `cn()` utility. |

### Concepts learned
- **shadcn/ui is not a library — it's a copy-paste system.** Components are copied into your `src/components/ui/` folder. You *own* the code and can modify it freely. This avoids version conflicts and gives full control.
- **OKLCH color format**: `oklch(0.68 0.19 25)` = Lightness (0–1), Chroma (saturation 0–0.4), Hue (angle 0–360). Used by shadcn instead of hex because it's *perceptually uniform* — `oklch(0.5 ...)` looks equally "mid-bright" across all hues.
- **`next/font/google`**: Self-hosts Google Fonts at build time. No external network requests, no FOUT (Flash of Unstyled Text). The `variable` option injects a CSS custom property so Tailwind can reference it.
- **CSS `@theme inline`**: Tailwind v4 feature — lets you define custom color and font tokens that become first-class Tailwind utilities (e.g., `bg-coral`, `font-heading`).
- **`@custom-variant dark`**: Tailwind v4's way to define dark mode. `&:is(.dark *)` means "inside any element with class `dark`" — enabling class-based dark mode toggling.
- **Semantic color names**: Instead of `bg-[#FF6B6B]` (meaningless), use `bg-coral` (describes intent). If the brand color changes, update one CSS variable instead of find-and-replace across the codebase.

---

## Step 1 · Part 1 — Project Scaffolding (Feb 28, 2026)

### What was done
Initialized the entire Next.js project from scratch and set up the foundational architecture.

### Changes

| File | What & Why |
|---|---|
| `package.json` | Created by `create-next-app`. Renamed from `loopzi-init` → `loopzi`. Added `--turbopack` flag to the dev script for faster HMR (Hot Module Replacement). |
| `src/app/layout.tsx` | Root layout — wraps every page. Sets `<html lang="en">` for accessibility and the `<body>` with `antialiased` class for smoother font rendering. Includes `<Metadata>` for SEO (title + description). |
| `src/app/page.tsx` | Landing page (`/`). Uses Tailwind utility classes directly: `bg-[#FAF7F2]` for the warm background, `text-[#FF6B6B]` for the coral CTA. `active:scale-95` adds a press-down effect on the button. |
| `src/app/globals.css` | Just `@import "tailwindcss"` — this is how Tailwind v4 works (no more `@tailwind base/components/utilities` directives). |
| `src/types/index.ts` | All TypeScript interfaces from the PRD. `ISODate` and `ISODateTime` are type aliases (just `string` underneath) that make the code self-documenting. `HabitCardVM` is a "View Model" — a shape of data optimized for rendering, not storage. |
| `src/lib/constants.ts` | Centralized constants so we don't scatter magic strings. `ROUTES` uses `as const` to make the object deeply readonly — TypeScript will autocomplete route values. |
| `src/lib/utils.ts` | `cn()` function — combines `clsx` (conditionally join class names) with `tailwind-merge` (intelligently merge conflicting Tailwind classes like `p-2 p-4` → `p-4`). Required by shadcn/ui. |
| `.prettierrc` | Code formatter config. `singleQuote: false` keeps double quotes (Next.js convention). `trailingComma: "es5"` adds trailing commas in objects/arrays (cleaner git diffs). |

### Concepts learned
- **App Router vs Pages Router**: App Router (used here) uses the `app/` directory with `layout.tsx` + `page.tsx` file conventions. Pages Router (older) uses `pages/` directory.
- **Turbopack**: Rust-based bundler by Vercel, ~10x faster than Webpack for dev builds. Enabled with `--turbopack` flag.
- **`src/` directory**: Optional Next.js convention to separate source code from config files at root.
- **View Models (VM)**: Data shapes designed for the UI rather than the database. `TodayDashboardVM` combines habit data + check-in status + streaks into one object the Today page can render directly.
- **`as const` assertion**: Makes TypeScript treat object values as literal types, not just `string`. Enables autocomplete and type-safe route references.

---
