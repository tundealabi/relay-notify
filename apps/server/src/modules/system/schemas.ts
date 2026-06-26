import type { FastifyInstance } from "fastify";

import { successResponseSchema } from "@/libs/openapi-schemas";

const healthStatusSchema = {
  $id: "HealthStatus",
  type: "object",
  required: ["status"],
  properties: {
    status: { type: "string", enum: ["ok"] },
  },
} as const;

const readyStatusSchema = {
  $id: "ReadyStatus",
  type: "object",
  required: ["status", "postgres", "redis", "note"],
  properties: {
    status: { type: "string", enum: ["ok"] },
    postgres: { type: "boolean" },
    redis: { type: "boolean" },
    note: { type: "string" },
  },
} as const;

const rootInfoSchema = {
  $id: "RootInfo",
  type: "object",
  required: ["name", "message", "docs"],
  properties: {
    name: { type: "string" },
    message: { type: "string" },
    docs: { type: "string" },
  },
} as const;

const healthResponseSchema = successResponseSchema("HealthResponse", {
  $ref: "HealthStatus#",
});

const readyResponseSchema = successResponseSchema("ReadyResponse", {
  $ref: "ReadyStatus#",
});

const rootInfoResponseSchema = successResponseSchema("RootInfoResponse", {
  $ref: "RootInfo#",
});

const moduleSchemas = [
  healthStatusSchema,
  readyStatusSchema,
  rootInfoSchema,
  healthResponseSchema,
  readyResponseSchema,
  rootInfoResponseSchema,
] as const;

export const systemOpenApiResponses = {
  health: { $ref: "HealthResponse#" },
  ready: { $ref: "ReadyResponse#" },
  rootInfo: { $ref: "RootInfoResponse#" },
} as const;

export const healthRouteSchema = {
  tags: ["System"],
  summary: "Liveness check",
  description: "Returns OK when the API process is running.",
  response: {
    200: systemOpenApiResponses.health,
  },
} as const;

export const readyRouteSchema = {
  tags: ["System"],
  summary: "Readiness check",
  description:
    "Returns OK when dependencies are available. Infrastructure checks are wired incrementally.",
  response: {
    200: systemOpenApiResponses.ready,
  },
} as const;

export const rootRouteSchema = {
  tags: ["System"],
  summary: "Service info",
  description: "Basic service metadata and documentation link.",
  response: {
    200: systemOpenApiResponses.rootInfo,
  },
} as const;

export function registerSystemOpenApiSchemas(app: FastifyInstance) {
  for (const schema of moduleSchemas) {
    app.addSchema(schema);
  }
}
