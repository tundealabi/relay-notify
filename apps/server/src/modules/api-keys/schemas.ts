import type { FastifyInstance } from "fastify";

import { successResponseSchema } from "@/libs/openapi-schemas";

const apiKeySchema = {
  $id: "ApiKey",
  type: "object",
  required: [
    "id",
    "keyPrefix",
    "label",
    "tier",
    "emailLimitPerMinute",
    "smsLimitPerMinute",
    "pushLimitPerMinute",
    "isActive",
    "createdAt",
    "updatedAt",
  ],
  properties: {
    id: { type: "string", format: "uuid" },
    keyHash: { type: "string" },
    keyPrefix: { type: "string" },
    plaintextKey: { type: ["string", "null"] },
    label: { type: "string" },
    tier: { type: "string", enum: ["free", "pro"] },
    emailLimitPerMinute: { type: "integer" },
    smsLimitPerMinute: { type: "integer" },
    pushLimitPerMinute: { type: "integer" },
    isActive: { type: "boolean" },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
} as const;

const apiKeyListResponseSchema = successResponseSchema("ApiKeyListResponse", {
  type: "array",
  items: { $ref: "ApiKey#" },
});

const moduleSchemas = [apiKeySchema, apiKeyListResponseSchema] as const;

export const apiKeysOpenApiResponses = {
  list: { $ref: "ApiKeyListResponse#" },
  error: { $ref: "ApiErrorResponse#" },
} as const;

export const listApiKeysRouteSchema = {
  tags: ["API Keys"],
  summary: "List API keys",
  description:
    "Returns all API keys. Authentication will be required in production.",
  security: [{ bearerAuth: [] }],
  response: {
    200: apiKeysOpenApiResponses.list,
    401: apiKeysOpenApiResponses.error,
    500: apiKeysOpenApiResponses.error,
  },
} as const;

export const seedApiKeysRouteSchema = {
  tags: ["Seed"],
  summary: "Seed API keys",
  description:
    "Replaces all API keys with demo seed data. Only available when DEMO_MODE=true.",
  response: {
    200: apiKeysOpenApiResponses.list,
    403: apiKeysOpenApiResponses.error,
    500: apiKeysOpenApiResponses.error,
  },
} as const;

export function registerApiKeysOpenApiSchemas(app: FastifyInstance) {
  for (const schema of moduleSchemas) {
    app.addSchema(schema);
  }
}
