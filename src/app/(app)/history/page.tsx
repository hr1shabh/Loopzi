"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CalendarHeatmap } from "@/components/calendar-heatmap";
import { ActivityList } from "@/components/activity-list";
import { cn } from "@/lib/utils";
import type { HistoryVM } from "@/types";

export default function HistoryPage() {
  const now = new Date();
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth() + 1);
  const [selectedHabitId, setSelectedHabitId] = useState("all");
  const [history, setHistory] = useState<HistoryVM | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isCurrentMonth =
    currentYear === now.getFullYear() && currentMonth === now.getMonth() + 1;

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        year: String(currentYear),
        month: String(currentMonth),
        habitId: selectedHabitId,
      });
      const res = await fetch(`/api/history?${params}`);
      if (res.ok) {
        const data: HistoryVM = await res.json();
        setHistory(data);
      }
    } catch (err) {
      console.error("Failed to fetch history:", err);
    } finally {
      setIsLoading(false);
    }
  }, [currentYear, currentMonth, selectedHabitId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  function goToPrevMonth() {
    if (currentMonth === 1) {
      setCurrentYear((y) => y - 1);
      setCurrentMonth(12);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  }

  function goToNextMonth() {
    if (isCurrentMonth) return;
    if (currentMonth === 12) {
      setCurrentYear((y) => y + 1);
      setCurrentMonth(1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  }

  const monthLabel = new Date(currentYear, currentMonth - 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <main className="mx-auto max-w-lg px-4 pt-6 pb-4">
      {/* ── Header ──────────────────────────────── */}
      <h1 className="text-2xl font-bold tracking-tight">History</h1>

      {/* ── Habit Filter ────────────────────────── */}
      <div className="mt-4 -mx-4 px-4 overflow-x-auto scrollbar-hide">
        <div className="flex gap-2 pb-1">
          <button
            onClick={() => setSelectedHabitId("all")}
            className={cn(
              "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
              selectedHabitId === "all"
                ? "bg-coral text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            All
          </button>
          {history?.habits.map((habit) => (
            <button
              key={habit.id}
              onClick={() => setSelectedHabitId(habit.id)}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors flex items-center gap-1.5",
                selectedHabitId === habit.id
                  ? "bg-coral text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              <span>{habit.emoji}</span>
              <span>{habit.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Month Navigator ─────────────────────── */}
      <div className="mt-5 flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={goToPrevMonth}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <span className="text-sm font-semibold">{monthLabel}</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={goToNextMonth}
          disabled={isCurrentMonth}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* ── Calendar Heatmap ────────────────────── */}
      <div className="mt-4">
        {isLoading ? (
          <div className="space-y-1">
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 35 }).map((_, i) => (
                <div key={i} className="aspect-square animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          </div>
        ) : (
          <CalendarHeatmap
            year={currentYear}
            month={currentMonth}
            days={history?.days || {}}
          />
        )}
      </div>

      {/* ── Separator ───────────────────────────── */}
      <Separator className="my-6" />

      {/* ── Recent Activity ─────────────────────── */}
      <h2 className="text-lg font-semibold">Recent Activity</h2>
      <div className="mt-3 pb-20">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-[60px] animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : (
          <ActivityList activities={history?.recentActivity || []} />
        )}
      </div>
    </main>
  );
}
