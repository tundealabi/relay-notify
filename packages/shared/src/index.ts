export const PROJECT_NAME = "Relay";

export const NOTIFICATION_CHANNELS = ["email", "sms", "push"] as const;

export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const NOTIFICATION_STATUSES = [
  "accepted",
  "queued",
  "processing",
  "delivered",
  "failed",
  "in_dlq",
  "discarded",
] as const;

export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number];

export {
  API_RESPONSE_STATES,
  type ApiFieldError,
  type ApiResponse,
  type ApiResponseMetadata,
  type ApiResponseState,
  type ApiValidationErrors,
  emptyApiResponseMetadata,
} from "./schemas/api-response.js";
export {
  type CreateNotificationInput,
  createNotificationSchema,
} from "./schemas/notification.js";
