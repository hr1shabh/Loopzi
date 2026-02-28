# Loopzi — Learning Changelog

> Every change documented for learning. Newest entries at the top.

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
