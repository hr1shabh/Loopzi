import { z } from "zod";

/**
 * Schema for updating reminder preferences (PATCH /api/settings).
 * All fields optional — only provided fields are updated.
 */
export const updateSettingsSchema = z.object({
  timezone: z.string().min(1).max(100).optional(),
  pushEnabled: z.boolean().optional(),
  emailEnabled: z.boolean().optional(),
  defaultReminderTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Must be HH:MM format")
    .optional(),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
