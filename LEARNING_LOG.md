# Loopzi — Learning Changelog

> Every change documented for learning. Newest entries at the top.

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
