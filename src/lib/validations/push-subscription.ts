import { z } from "zod";

/**
 * Schema for registering a push subscription (POST).
 */
export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  p256dh: z.string().min(1),
  auth: z.string().min(1),
});

/**
 * Schema for deleting a push subscription (DELETE).
 */
export const deletePushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
});

export type PushSubscriptionInput = z.infer<typeof pushSubscriptionSchema>;
export type DeletePushSubscriptionInput = z.infer<typeof deletePushSubscriptionSchema>;
