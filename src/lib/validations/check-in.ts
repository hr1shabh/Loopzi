import { z } from "zod";

/**
 * Schema for creating a new check-in.
 * The habit_id comes from the URL path, not the body.
 */
export const createCheckInSchema = z.object({
    date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD format"),
    note: z.string().max(500).optional(),
});

export type CreateCheckInInput = z.infer<typeof createCheckInSchema>;
