"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { signOut } from "@/app/auth/actions";
import { usePush } from "@/hooks/use-push";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Bell,
  Mail,
  Clock,
  Globe,
  Smartphone,
  LogOut,
  ChevronDown,
  Loader2,
} from "lucide-react";
import type { SettingsVM, ReminderPreferences } from "@/types";

const COMMON_TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Kolkata",
  "Asia/Dubai",
  "Australia/Sydney",
  "Pacific/Auckland",
];

const REMINDER_TIMES = [
  "06:00",
  "07:00",
  "08:00",
  "09:00",
  "10:00",
  "12:00",
  "14:00",
  "16:00",
  "18:00",
  "19:00",
  "20:00",
  "21:00",
  "22:00",
];

function formatTime(time: string): string {
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${m} ${ampm}`;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsVM | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { permission, isSubscribed, isLoading: pushLoading, error: pushError, subscribe, unsubscribe } = usePush();

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data: SettingsVM = await res.json();
        setSettings(data);
      }
    } catch (err) {
      console.error("Failed to fetch settings:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Auto-detect timezone on first load
  useEffect(() => {
    if (settings && settings.preferences.timezone === "UTC") {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (detected && detected !== "UTC") {
        savePreference({ timezone: detected });
      }
    }
  }, [settings?.preferences.timezone]); // eslint-disable-line react-hooks/exhaustive-deps

  const savePreference = async (updates: Partial<ReminderPreferences>) => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (res.ok) {
        const prefs: ReminderPreferences = await res.json();
        setSettings((prev) => (prev ? { ...prev, preferences: prefs } : prev));
      }
    } catch (err) {
      console.error("Failed to save preference:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePushToggle = async (enabled: boolean) => {
    if (enabled) {
      const success = await subscribe();
      if (success) {
        await savePreference({ pushEnabled: true });
      }
    } else {
      const success = await unsubscribe();
      if (success) {
        await savePreference({ pushEnabled: false });
      }
    }
  };

  const handleEmailToggle = async (enabled: boolean) => {
    await savePreference({ emailEnabled: enabled });
  };

  const handleReminderTimeChange = async (time: string) => {
    await savePreference({ defaultReminderTime: time });
  };

  const handleTimezoneChange = async (tz: string) => {
    await savePreference({ timezone: tz });
  };

  if (isLoading) {
    return (
      <main className="mx-auto max-w-lg px-4 pt-6 pb-4">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <div className="mt-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      </main>
    );
  }

  const prefs = settings?.preferences;
  const pushDenied = permission === "denied";

  return (
    <main className="mx-auto max-w-lg px-4 pt-6 pb-4">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>

      {/* ── Profile ──────────────────────────────────── */}
      <section className="mt-6 rounded-2xl bg-card p-4 shadow-sm">
        <div className="flex items-center gap-3">
          {settings?.avatarUrl ? (
            <Image
              src={settings.avatarUrl}
              alt={settings.name}
              width={48}
              height={48}
              className="rounded-full"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-coral/10 text-sm font-semibold text-coral">
              {getInitials(settings?.name || "U")}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{settings?.name}</p>
            <p className="truncate text-sm text-muted-foreground">{settings?.email}</p>
          </div>
        </div>
      </section>

      {/* ── Notifications ────────────────────────────── */}
      <section className="mt-4 rounded-2xl bg-card p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Notifications
        </h2>

        <div className="space-y-4">
          {/* Push toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="push-toggle" className="cursor-pointer">
                Push notifications
              </Label>
            </div>
            <div className="flex items-center gap-2">
              {pushLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              <Switch
                id="push-toggle"
                checked={isSubscribed && prefs?.pushEnabled}
                onCheckedChange={handlePushToggle}
                disabled={pushLoading || permission === "unsupported"}
              />
            </div>
          </div>
          {pushDenied && (
            <p className="ml-6 text-xs text-destructive">
              Notifications are blocked. Enable them in your browser settings.
            </p>
          )}
          {permission === "unsupported" && (
            <p className="ml-6 text-xs text-muted-foreground">
              Push notifications are not supported in this browser.
            </p>
          )}
          {pushError && (
            <p className="ml-6 text-xs text-destructive">{pushError}</p>
          )}

          {/* Email toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="email-toggle" className="cursor-pointer">
                Email reminders
              </Label>
            </div>
            <Switch
              id="email-toggle"
              checked={prefs?.emailEnabled ?? false}
              onCheckedChange={handleEmailToggle}
            />
          </div>

          {/* Reminder time */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Label>Default reminder time</Label>
            </div>
            <Select
              value={prefs?.defaultReminderTime ?? "09:00"}
              onValueChange={handleReminderTimeChange}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REMINDER_TIMES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {formatTime(t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {/* ── Timezone ─────────────────────────────────── */}
      <section className="mt-4 rounded-2xl bg-card p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Timezone
        </h2>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <Label>Your timezone</Label>
          </div>
          <Select
            value={prefs?.timezone ?? "UTC"}
            onValueChange={handleTimezoneChange}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COMMON_TIMEZONES.map((tz) => (
                <SelectItem key={tz} value={tz}>
                  {tz.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </section>

      {/* ── PWA Install Guide ────────────────────────── */}
      <section className="mt-4 rounded-2xl bg-card p-4 shadow-sm">
        <Collapsible>
          <CollapsibleTrigger className="flex w-full items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Install Loopzi as an app</span>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform data-[state=open]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 space-y-3 text-sm text-muted-foreground">
            <div>
              <p className="font-medium text-foreground">iOS (Safari)</p>
              <ol className="mt-1 list-inside list-decimal space-y-0.5">
                <li>Tap the Share button</li>
                <li>Scroll down and tap &quot;Add to Home Screen&quot;</li>
                <li>Tap &quot;Add&quot;</li>
              </ol>
            </div>
            <div>
              <p className="font-medium text-foreground">Android (Chrome)</p>
              <ol className="mt-1 list-inside list-decimal space-y-0.5">
                <li>Tap the three-dot menu</li>
                <li>Tap &quot;Add to Home screen&quot;</li>
                <li>Tap &quot;Add&quot;</li>
              </ol>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </section>

      {/* ── Sign Out ─────────────────────────────────── */}
      <section className="mt-4">
        <form action={signOut}>
          <Button
            type="submit"
            variant="outline"
            className="w-full gap-2 rounded-2xl text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </form>
      </section>

      {/* Saving indicator */}
      {isSaving && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 rounded-full bg-foreground/90 px-4 py-2 text-xs text-background shadow-lg">
          Saving...
        </div>
      )}
    </main>
  );
}
