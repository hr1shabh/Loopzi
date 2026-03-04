"use client";

import { cn } from "@/lib/utils";
import type { HistoryDaySummary } from "@/types";

interface CalendarHeatmapProps {
  year: number;
  month: number;
  days: Record<string, HistoryDaySummary>;
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getLocalDate(): string {
  return new Date().toLocaleDateString("en-CA");
}

export function CalendarHeatmap({ year, month, days }: CalendarHeatmapProps) {
  const today = getLocalDate();
  const daysInMonth = new Date(year, month, 0).getDate();

  // Get weekday of the 1st (0=Sun..6=Sat), convert to Monday-start (0=Mon..6=Sun)
  const firstDayRaw = new Date(year, month - 1, 1).getDay();
  const offset = firstDayRaw === 0 ? 6 : firstDayRaw - 1;

  // Build grid cells: null for padding, then day numbers
  const cells: (number | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  // Pad trailing to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div>
      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAY_LABELS.map((label) => (
          <div
            key={label}
            className="text-center text-xs font-medium text-muted-foreground"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) {
            return <div key={`empty-${i}`} className="aspect-square" />;
          }

          const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const summary = days[dateStr];
          const isToday = dateStr === today;

          let ratio = 0;
          if (summary && summary.total > 0) {
            ratio = summary.completed / summary.total;
          }

          return (
            <div
              key={dateStr}
              className={cn(
                "aspect-square rounded-lg flex items-center justify-center text-xs font-medium transition-colors",
                ratio === 0 && "bg-muted/50 text-muted-foreground",
                ratio > 0 && ratio < 1 && "bg-emerald-200 text-emerald-900 dark:bg-emerald-800/40 dark:text-emerald-200",
                ratio >= 1 && "bg-emerald-500 text-white",
                isToday && "ring-2 ring-coral"
              )}
            >
              {day}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded bg-muted/50" />
          <span>None</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded bg-emerald-200 dark:bg-emerald-800/40" />
          <span>Partial</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded bg-emerald-500" />
          <span>Complete</span>
        </div>
      </div>
    </div>
  );
}
