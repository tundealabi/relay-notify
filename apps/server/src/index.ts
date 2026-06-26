import "dotenv/config";

import { randomUUID } from "node:crypto";

import cors from "@fastify/cors";
import { PROJECT_NAME } from "@relay/shared";
import fastify from "fastify";

import { registerSystemModule } from "./modules/system";
import {
  prismaPlugin,
  redisPlugin,
  replyDecoratorsPlugin,
  responsePlugin,
  swaggerPlugin,
} from "./plugins";
import { v1Routes } from "./routes";

async function start() {
  const app = fastify({
    logger: true,
    genReqId: (req) => {
      const headerValue = req.headers["x-request-id"];
      return typeof headerValue === "string" && headerValue.length > 0
        ? headerValue
        : randomUUID();
    },
  });

  await app.register(responsePlugin);
  await app.register(replyDecoratorsPlugin);
  await app.register(swaggerPlugin);

  await app.register(cors, {
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    maxAge: 600,
    optionsSuccessStatus: 204,
    origin: process.env.CORS_ORIGINS?.split(",").filter(Boolean) ?? true,
    preflightContinue: false,
  });

  await app.register(redisPlugin);
  await app.register(prismaPlugin);

  registerSystemModule(app, PROJECT_NAME);
  await app.register(v1Routes, { prefix: "/api/v1" });

  const port = Number(process.env.PORT ?? 3000);

  await app.listen({ port });
  app.log.info(`[relay] ${PROJECT_NAME} API listening on port ${port}`);
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
