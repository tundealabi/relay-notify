import type { FastifyInstance } from "fastify";

const apiResponseMetadataSchema = {
  $id: "ApiResponseMetadata",
  type: "object",
  required: [
    "count",
    "cursor",
    "message",
    "code",
    "totalCount",
    "page",
    "limit",
    "totalPages",
  ],
  properties: {
    count: { type: "integer" },
    cursor: { type: ["string", "null"] },
    message: { type: ["string", "null"] },
    code: { type: ["string", "null"] },
    totalCount: { type: "integer" },
    page: { type: "integer" },
    limit: { type: "integer" },
    totalPages: { type: "integer" },
  },
} as const;

const apiFieldErrorSchema = {
  $id: "ApiFieldError",
  type: "object",
  required: ["message"],
  properties: {
    message: { type: "string" },
  },
} as const;

const apiValidationErrorsSchema = {
  $id: "ApiValidationErrors",
  type: "object",
  additionalProperties: {
    type: "array",
    items: { $ref: "ApiFieldError#" },
  },
} as const;

export function successResponseSchema(
  id: string,
  data: Record<string, unknown>
): Record<string, unknown> {
  return {
    $id: id,
    type: "object",
    required: ["data", "metadata", "errors", "state", "requestId", "timestamp"],
    properties: {
      data,
      metadata: { $ref: "ApiResponseMetadata#" },
      errors: { type: "null" },
      state: { type: "string", enum: ["success"] },
      requestId: { type: "string" },
      timestamp: { type: "string", format: "date-time" },
    },
  };
}

const apiErrorResponseSchema = {
  $id: "ApiErrorResponse",
  type: "object",
  required: ["data", "metadata", "errors", "state", "requestId", "timestamp"],
  properties: {
    data: { type: "null" },
    metadata: { $ref: "ApiResponseMetadata#" },
    errors: {
      oneOf: [{ $ref: "ApiValidationErrors#" }, { type: "null" }],
    },
    state: { type: "string", enum: ["error"] },
    requestId: { type: "string" },
    timestamp: { type: "string", format: "date-time" },
  },
} as const;

const sharedSchemas = [
  apiResponseMetadataSchema,
  apiFieldErrorSchema,
  apiValidationErrorsSchema,
  apiErrorResponseSchema,
] as const;

export const openApiResponses = {
  error: { $ref: "ApiErrorResponse#" },
} as const;

export function registerOpenApiSchemas(app: FastifyInstance) {
  for (const schema of sharedSchemas) {
    app.addSchema(schema);
  }
}
