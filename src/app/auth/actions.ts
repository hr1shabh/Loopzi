"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { ROUTES } from "@/lib/constants";

/**
 * Initiates OAuth sign-in (Google or Apple).
 * Redirects the browser to the provider's consent screen.
 */
export async function signInWithOAuth(provider: "google" | "apple") {
    const supabase = await createClient();
    const headersList = await headers();
    const origin = headersList.get("origin") || "http://localhost:3000";

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
            redirectTo: `${origin}${ROUTES.AUTH_CALLBACK}`,
        },
    });

    if (error) {
        return { error: error.message };
    }

    if (data.url) {
        redirect(data.url);
    }

    return { error: "Something went wrong. Please try again." };
}

/**
 * Sends a magic link (OTP) to the user's email.
 */
export async function signInWithMagicLink(email: string) {
    const supabase = await createClient();
    const headersList = await headers();
    const origin = headersList.get("origin") || "http://localhost:3000";

    const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
            emailRedirectTo: `${origin}${ROUTES.AUTH_CALLBACK}`,
        },
    });

    if (error) {
        return { error: error.message };
    }

    return { success: true };
}

/**
 * Signs out the current user and redirects to login.
 */
export async function signOut() {
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect(ROUTES.AUTH_LOGIN);
}
