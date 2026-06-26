import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

import { registerApiKeysRoutes } from "./routes";

const apiKeysModule: FastifyPluginAsync = (fastify) => {
  registerApiKeysRoutes(fastify);
  return Promise.resolve();
};

export default fp(apiKeysModule, { name: "api-keys-module" });
