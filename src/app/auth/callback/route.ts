import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ROUTES } from "@/lib/constants";

/**
 * OAuth callback handler.
 *
 * After the user authenticates with Google/Apple or clicks a magic link,
 * Supabase redirects them here with a `code` query parameter.
 * We exchange the code for a session and redirect to /today.
 */
export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");
    const next = searchParams.get("next") ?? ROUTES.TODAY;

    if (code) {
        const supabase = await createClient();
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error) {
            return NextResponse.redirect(`${origin}${next}`);
        }
    }

    // If something went wrong, redirect back to login
    return NextResponse.redirect(`${origin}${ROUTES.AUTH_LOGIN}?error=auth_failed`);
}
