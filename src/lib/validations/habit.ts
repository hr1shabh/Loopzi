import { z } from "zod";

/**
 * Schema for creating a new habit.
 */
export const createHabitSchema = z.object({
    name: z
        .string()
        .min(1, "Habit name is required")
        .max(50, "Name must be 50 characters or fewer"),
    emoji: z.string().optional(),
    color: z.string().optional(),
    period: z.enum(["daily", "weekly"], {
        message: "Select a frequency",
    }),
    targetPerPeriod: z
        .number()
        .int()
        .min(1, "Target must be at least 1")
        .max(99, "Target must be 99 or fewer"),
    reminderTime: z.string().optional(), // e.g. "21:00"
});

/**
 * Schema for updating an existing habit (all fields optional).
 */
export const updateHabitSchema = createHabitSchema.partial().extend({
    isArchived: z.boolean().optional(),
});

export type CreateHabitInput = z.infer<typeof createHabitSchema>;
export type UpdateHabitInput = z.infer<typeof updateHabitSchema>;
