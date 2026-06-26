import { FastifyInstance } from "fastify";

import apiKeysModule from "@/modules/api-keys";

export const v1Routes = (fastify: FastifyInstance) => {
  fastify.register(apiKeysModule);
};
