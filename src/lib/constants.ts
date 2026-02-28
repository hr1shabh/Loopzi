// ─── App Constants ─────────────────────────────────────────

export const APP_NAME = "Loopzi";
export const APP_DESCRIPTION =
    "Build consistency, daily. A free habit tracker that makes check-ins fast and streaks motivating.";

// ─── Routes ────────────────────────────────────────────────

export const ROUTES = {
    HOME: "/",
    TODAY: "/today",
    HABITS: "/habits",
    HISTORY: "/history",
    INSIGHTS: "/insights",
    SETTINGS: "/settings",
    AUTH_LOGIN: "/auth/login",
    AUTH_CALLBACK: "/auth/callback",
} as const;

// ─── Design Tokens (used in JS when CSS vars aren't available) ─

export const COLORS = {
    coral: "#FF6B6B",
    coralLight: "#FF8E8E",
    teal: "#2EC4B6",
    tealLight: "#4DD9CB",
    warmBg: "#FAF7F2",
    warmBgDark: "#1A1A1A",
    textPrimary: "#1A1A1A",
    textSecondary: "#6B7280",
    cardBg: "#FFFFFF",
} as const;
