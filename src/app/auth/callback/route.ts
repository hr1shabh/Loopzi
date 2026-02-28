import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { ROUTES } from "@/lib/constants";

/**
 * OAuth callback handler.
 *
 * After the user authenticates with Google or clicks a magic link,
 * Supabase redirects them here with a `code` query parameter.
 * We exchange the code for a session and redirect to /today.
 *
 * IMPORTANT: We create a custom Supabase client here (instead of using
 * the shared server.ts helper) because we need to write session cookies
 * directly onto the redirect response. The shared helper uses `cookies()`
 * from next/headers, which doesn't carry over to NextResponse.redirect().
 */
export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");
    const next = searchParams.get("next") ?? ROUTES.TODAY;

    if (code) {
        const redirectUrl = `${origin}${next}`;
        const response = NextResponse.redirect(redirectUrl);

        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return request.headers
                            .get("cookie")
                            ?.split("; ")
                            .map((c) => {
                                const [name, ...rest] = c.split("=");
                                return { name, value: rest.join("=") };
                            }) ?? [];
                    },
                    setAll(cookiesToSet) {
                        cookiesToSet.forEach(({ name, value, options }) => {
                            response.cookies.set(name, value, options);
                        });
                    },
                },
            }
        );

        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error) {
            return response;
        }
    }

    // If something went wrong, redirect back to login
    return NextResponse.redirect(
        `${origin}${ROUTES.AUTH_LOGIN}?error=auth_failed`
    );
}

