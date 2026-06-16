import { z } from "zod";

const channelFields = {
  email: z.object({
    channel: z.literal("email"),
    recipient: z.string().email(),
    subject: z.string().min(1),
    body: z.string().min(1),
    deliverAt: z.string().datetime().nullable().optional(),
    webhookUrl: z.string().url().nullable().optional(),
  }),
  sms: z.object({
    channel: z.literal("sms"),
    recipient: z.string().min(1),
    body: z.string().min(1),
    deliverAt: z.string().datetime().nullable().optional(),
    webhookUrl: z.string().url().nullable().optional(),
  }),
  push: z.object({
    channel: z.literal("push"),
    recipient: z.string().min(1),
    title: z.string().min(1),
    body: z.string().min(1),
    deliverAt: z.string().datetime().nullable().optional(),
    webhookUrl: z.string().url().nullable().optional(),
  }),
};

export const createNotificationSchema = z.discriminatedUnion("channel", [
  channelFields.email,
  channelFields.sms,
  channelFields.push,
]);

export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;
