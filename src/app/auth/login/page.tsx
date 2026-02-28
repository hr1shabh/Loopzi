"use client";

import { useState, useTransition } from "react";
import { signInWithOAuth, signInWithMagicLink } from "../actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Mail, CheckCircle2, Loader2 } from "lucide-react";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [magicLinkSent, setMagicLinkSent] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();
    const [oauthLoading, setOauthLoading] = useState<string | null>(null);

    function handleOAuth(provider: "google") {
        setError(null);
        setOauthLoading(provider);
        startTransition(async () => {
            const result = await signInWithOAuth(provider);
            if (result?.error) {
                setError(result.error);
                setOauthLoading(null);
            }
        });
    }

    function handleMagicLink(e: React.FormEvent) {
        e.preventDefault();
        if (!email.trim()) return;

        setError(null);
        startTransition(async () => {
            const result = await signInWithMagicLink(email.trim());
            if (result?.error) {
                setError(result.error);
            } else if (result?.success) {
                setMagicLinkSent(true);
            }
        });
    }

    return (
        <main className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
            {/* Decorative background gradient */}
            <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
                <div className="absolute -top-[40%] left-1/2 h-[80vh] w-[80vh] -translate-x-1/2 rounded-full bg-coral/10 blur-[120px]" />
                <div className="absolute -bottom-[20%] right-[10%] h-[50vh] w-[50vh] rounded-full bg-teal/8 blur-[100px]" />
            </div>

            <div className="w-full max-w-sm">
                {/* Brand */}
                <div className="mb-8 text-center">
                    <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-coral to-coral-dark text-3xl shadow-lg shadow-coral/25">
                        🔁
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        Loopzi
                    </h1>
                    <p className="mt-1.5 text-base text-muted-foreground">
                        Build consistency, daily.
                    </p>
                </div>

                {/* Auth Card */}
                <Card className="border-0 shadow-xl shadow-black/5 backdrop-blur-sm">
                    <CardContent className="space-y-5 p-6">
                        {magicLinkSent ? (
                            /* ── Magic link success state ────────── */
                            <div className="flex flex-col items-center gap-3 py-6 text-center">
                                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-teal/10">
                                    <CheckCircle2 className="h-7 w-7 text-teal" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold">
                                        Check your email
                                    </h2>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        We sent a magic link to{" "}
                                        <span className="font-medium text-foreground">
                                            {email}
                                        </span>
                                    </p>
                                </div>
                                <Button
                                    variant="ghost"
                                    className="mt-2 text-sm text-muted-foreground"
                                    onClick={() => {
                                        setMagicLinkSent(false);
                                        setEmail("");
                                    }}
                                >
                                    Use a different email
                                </Button>
                            </div>
                        ) : (
                            /* ── Sign in options ─────────────────── */
                            <>
                                {/* OAuth buttons */}
                                <div className="space-y-3">
                                    <Button
                                        id="google-sign-in"
                                        variant="outline"
                                        className="h-12 w-full gap-3 rounded-xl border-border/60 text-sm font-medium transition-all hover:bg-muted/50 hover:shadow-sm active:scale-[0.98]"
                                        onClick={() => handleOAuth("google")}
                                        disabled={isPending}
                                    >
                                        {oauthLoading === "google" ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <svg
                                                className="h-5 w-5"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                                                    fill="#4285F4"
                                                />
                                                <path
                                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                                    fill="#34A853"
                                                />
                                                <path
                                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                                    fill="#FBBC05"
                                                />
                                                <path
                                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                                    fill="#EA4335"
                                                />
                                            </svg>
                                        )}
                                        Continue with Google
                                    </Button>

                                </div>

                                {/* Divider */}
                                <div className="relative flex items-center gap-4">
                                    <div className="h-px flex-1 bg-border" />
                                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                        or
                                    </span>
                                    <div className="h-px flex-1 bg-border" />
                                </div>

                                {/* Magic link form */}
                                <form
                                    onSubmit={handleMagicLink}
                                    className="space-y-3"
                                >
                                    <div className="relative">
                                        <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                        <Input
                                            id="magic-link-email"
                                            type="email"
                                            placeholder="Enter your email"
                                            value={email}
                                            onChange={(e) =>
                                                setEmail(e.target.value)
                                            }
                                            className="h-12 rounded-xl pl-10 text-sm"
                                            required
                                            disabled={isPending}
                                        />
                                    </div>
                                    <Button
                                        id="send-magic-link"
                                        type="submit"
                                        className="h-12 w-full rounded-xl bg-coral text-sm font-semibold text-white shadow-md shadow-coral/20 transition-all hover:bg-coral-dark hover:shadow-lg hover:shadow-coral/30 active:scale-[0.98]"
                                        disabled={isPending || !email.trim()}
                                    >
                                        {isPending &&
                                            oauthLoading === null ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : null}
                                        Send Magic Link
                                    </Button>
                                </form>

                                {/* Error message */}
                                {error && (
                                    <div className="rounded-lg bg-destructive/10 p-3 text-center text-sm text-destructive">
                                        {error}
                                    </div>
                                )}
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Footer */}
                <p className="mt-6 text-center text-xs leading-relaxed text-muted-foreground">
                    By continuing, you agree to our{" "}
                    <span className="underline underline-offset-2">
                        Terms of Service
                    </span>{" "}
                    and{" "}
                    <span className="underline underline-offset-2">
                        Privacy Policy
                    </span>
                    .
                </p>
            </div>
        </main>
    );
}
