import "dotenv/config";

import cors from "@fastify/cors";
import { PROJECT_NAME } from "@relay/shared";
import fastify from "fastify";

import { prismaPlugin, redisPlugin } from "./plugins";

const app = fastify({ logger: true });

app.register(cors, {
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  maxAge: 600,
  optionsSuccessStatus: 204,
  origin: process.env.CORS_ORIGINS?.split(",") ?? [],
  preflightContinue: false,
});

app.register(redisPlugin);
app.register(prismaPlugin);

const port = Number(process.env.PORT ?? 3000);

app.get("/health", (_req) => {
  return { status: "ok" };
});

app.get("/ready", (_req) => {
  return {
    status: "ok",
    postgres: false,
    redis: false,
    note: "Infrastructure checks will be wired in Week 1",
  };
});

app.get("/", (_req) => {
  return {
    name: PROJECT_NAME,
    message: "Relay API — scaffold running",
    docs: "/docs (coming soon)",
  };
});

app.listen({ port }, (err, address) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  app.log.info(`[relay] ${PROJECT_NAME} API listening on ${address}`);
});
