"use client";

import type { HistoryActivityItem } from "@/types";

interface ActivityListProps {
  activities: HistoryActivityItem[];
}

function getLocalDate(): string {
  return new Date().toLocaleDateString("en-CA");
}

function formatDateLabel(dateStr: string): string {
  const today = getLocalDate();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toLocaleDateString("en-CA");

  if (dateStr === today) return "Today";
  if (dateStr === yesterdayStr) return "Yesterday";

  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatTime(isoDateTime: string): string {
  const date = new Date(isoDateTime);
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function ActivityList({ activities }: ActivityListProps) {
  if (activities.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No recent activity
      </p>
    );
  }

  // Group by date
  const groups: { date: string; items: HistoryActivityItem[] }[] = [];
  for (const item of activities) {
    const last = groups[groups.length - 1];
    if (last && last.date === item.date) {
      last.items.push(item);
    } else {
      groups.push({ date: item.date, items: [item] });
    }
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div key={group.date}>
          <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {formatDateLabel(group.date)}
          </p>
          <div className="space-y-2">
            {group.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-xl bg-card p-3 shadow-sm"
              >
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base"
                  style={{ backgroundColor: item.color + "20" }}
                >
                  {item.emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{item.habitName}</p>
                  {item.note && (
                    <p className="text-xs text-muted-foreground truncate">{item.note}</p>
                  )}
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatTime(item.completedAt)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
