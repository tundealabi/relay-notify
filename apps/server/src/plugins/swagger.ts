import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

import { registerOpenApiSchemas } from "@/libs/openapi-schemas";
import { registerApiKeysOpenApiSchemas } from "@/modules/api-keys/schemas";
import { registerSystemOpenApiSchemas } from "@/modules/system/schemas";

const swaggerPlugin: FastifyPluginAsync = async (fastify) => {
  registerOpenApiSchemas(fastify);
  registerSystemOpenApiSchemas(fastify);
  registerApiKeysOpenApiSchemas(fastify);

  const port = Number(process.env.PORT ?? 3000);

  await fastify.register(swagger, {
    openapi: {
      openapi: "3.1.0",
      info: {
        title: "Relay API",
        description: "Async multi-channel notification engine",
        version: "0.1.0",
      },
      servers: [
        {
          url: `http://localhost:${port}`,
          description: "Local development",
        },
      ],
      tags: [
        { name: "System", description: "Health and service metadata" },
        { name: "API Keys", description: "API key management" },
        { name: "Seed", description: "Demo data seeding (development only)" },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "API key",
            description: "Pass your API key as a Bearer token",
          },
        },
      },
    },
  });

  await fastify.register(swaggerUi, {
    routePrefix: "/docs",
    uiConfig: {
      docExpansion: "list",
      deepLinking: true,
    },
  });
};

export default fp(swaggerPlugin, { name: "swagger" });
