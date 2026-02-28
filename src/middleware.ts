import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Routes that require authentication */
const PROTECTED_ROUTES = ["/today", "/habits", "/history", "/insights", "/settings"];

/** Routes that should redirect authenticated users to /today */
const AUTH_ROUTES = ["/auth/login"];

/**
 * Middleware that:
 * 1. Refreshes the Supabase auth session on every request.
 * 2. Protects routes — unauthenticated users are redirected to /auth/login.
 * 3. Redirects authenticated users away from auth pages to /today.
 */
export async function middleware(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    );
                    supabaseResponse = NextResponse.next({
                        request,
                    });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    // Refresh the session — this is the core purpose of this middleware.
    const {
        data: { user },
    } = await supabase.auth.getUser();

    const pathname = request.nextUrl.pathname;
    const isAuthenticated = !!user;

    // Unauthenticated users trying to access protected routes → redirect to login
    const isProtectedRoute = PROTECTED_ROUTES.some(
        (route) => pathname === route || pathname.startsWith(`${route}/`)
    );
    if (!isAuthenticated && isProtectedRoute) {
        const loginUrl = request.nextUrl.clone();
        loginUrl.pathname = "/auth/login";
        return NextResponse.redirect(loginUrl);
    }

    // Authenticated users on "/" → redirect to /today
    if (isAuthenticated && pathname === "/") {
        const todayUrl = request.nextUrl.clone();
        todayUrl.pathname = "/today";
        return NextResponse.redirect(todayUrl);
    }

    // Authenticated users on auth pages → redirect to /today
    const isAuthRoute = AUTH_ROUTES.some(
        (route) => pathname === route || pathname.startsWith(`${route}/`)
    );
    if (isAuthenticated && isAuthRoute) {
        const todayUrl = request.nextUrl.clone();
        todayUrl.pathname = "/today";
        return NextResponse.redirect(todayUrl);
    }

    return supabaseResponse;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization)
         * - favicon.ico (browser icon)
         * - public assets (icons, sw.js, etc.)
         */
        "/((?!_next/static|_next/image|favicon.ico|icons/|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};
