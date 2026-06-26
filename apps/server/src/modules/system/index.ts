import type { FastifyInstance } from "fastify";

import { registerSystemRoutes } from "./routes";

export function registerSystemModule(
  app: FastifyInstance,
  projectName: string
) {
  registerSystemRoutes(app, projectName);
}
