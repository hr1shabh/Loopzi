"use client";

export default function OfflinePage() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
            <h1 className="text-4xl font-bold">📴 You&apos;re offline</h1>
            <p className="mt-4 text-lg text-muted-foreground">
                It looks like you&apos;ve lost your internet connection.
                <br />
                Your habits are waiting for you when you&apos;re back!
            </p>
            <button
                onClick={() => window.location.reload()}
                className="mt-8 rounded-xl bg-coral px-6 py-3 font-semibold text-white shadow-lg transition-all hover:bg-coral-dark active:scale-95"
            >
                Try Again
            </button>
        </main>
    );
}
