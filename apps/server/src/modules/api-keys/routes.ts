import { FastifyInstance } from "fastify";

import { AppError } from "@/libs/app-error";
import { apiReply } from "@/libs/reply";

import { listApiKeysRouteSchema, seedApiKeysRouteSchema } from "./schemas";
import { listApiKeys, seedApiKeys } from "./service";

export function registerApiKeysRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/api-keys",
    { schema: listApiKeysRouteSchema },
    async (_request, reply) => {
      const apiKeys = await listApiKeys(fastify.prisma);

      apiReply.success({
        reply,
        data: apiKeys,
        metadata: {
          count: apiKeys.length,
          message: "API keys retrieved successfully",
        },
      });
    }
  );

  fastify.post(
    "/seed/api-keys",
    { schema: seedApiKeysRouteSchema },
    async (_request, reply) => {
      if (process.env.DEMO_MODE !== "true") {
        throw new AppError(
          "Seed endpoint is only available in demo mode",
          "FORBIDDEN",
          403
        );
      }

      const apiKeys = await seedApiKeys(fastify.prisma);

      apiReply.success({
        reply,
        data: apiKeys,
        metadata: {
          count: apiKeys.length,
          message: "API keys seeded successfully",
        },
      });
    }
  );
}
