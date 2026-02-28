import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="w-full max-w-md text-center">
        {/* Logo / Brand */}
        <h1 className="text-5xl font-bold tracking-tight">🔁 Loopzi</h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Build consistency, daily.
        </p>

        {/* Feature highlights */}
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          <Badge variant="secondary" className="text-sm">
            ⚡ 30-sec check-ins
          </Badge>
          <Badge variant="secondary" className="text-sm">
            🔥 Streak tracking
          </Badge>
          <Badge variant="secondary" className="text-sm">
            🔔 Smart reminders
          </Badge>
        </div>

        {/* CTA */}
        <div className="mt-10">
          <Button
            asChild
            size="lg"
            className="rounded-xl bg-coral px-8 py-6 text-base font-semibold text-white shadow-lg transition-all hover:bg-coral-dark hover:shadow-xl active:scale-95"
          >
            <a href="/auth/login">Get Started →</a>
          </Button>
        </div>

        {/* Preview card */}
        <Card className="mt-12 text-left shadow-md">
          <CardContent className="space-y-3 p-5">
            <p className="text-sm font-medium text-muted-foreground">
              Today&apos;s preview
            </p>
            <div className="flex items-center justify-between rounded-lg bg-teal/10 p-3">
              <span className="text-base">🏃 Run 20 min</span>
              <Badge className="bg-teal text-white">✓ Done</Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-muted p-3">
              <span className="text-base">📖 Read 30 min</span>
              <span className="text-sm text-muted-foreground">0 / 1</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-coral/10 p-3">
              <span className="text-base">💧 Drink Water</span>
              <span className="text-sm text-muted-foreground">2 / 3</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <p className="mt-12 pb-6 text-xs text-muted-foreground">
        Free forever · No ads · Open source
      </p>
    </main>
  );
}
