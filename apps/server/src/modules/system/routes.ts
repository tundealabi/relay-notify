import type { FastifyInstance } from "fastify";

import { apiReply } from "@/libs/reply";

import {
  healthRouteSchema,
  readyRouteSchema,
  rootRouteSchema,
} from "./schemas";

export function registerSystemRoutes(
  app: FastifyInstance,
  projectName: string
) {
  app.get("/health", { schema: healthRouteSchema }, (_req, reply) => {
    apiReply.success({ reply, data: { status: "ok" } });
  });

  app.get("/ready", { schema: readyRouteSchema }, (_req, reply) => {
    apiReply.success({
      reply,
      data: {
        status: "ok",
        postgres: false,
        redis: false,
        note: "Infrastructure checks will be wired in Week 1",
      },
    });
  });

  app.get("/", { schema: rootRouteSchema }, (_req, reply) => {
    apiReply.success({
      reply,
      data: {
        name: projectName,
        message: "Relay API — scaffold running",
        docs: "/docs",
      },
    });
  });
}
