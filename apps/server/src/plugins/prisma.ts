import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

import { prisma } from "@/libs/prisma";

const prismaPlugin: FastifyPluginAsync = async (fastify) => {
  if (!fastify.hasDecorator("prisma")) {
    fastify.decorate("prisma", prisma);
  }

  try {
    await fastify.prisma.$connect();
    fastify.log.info("DB: connected successfully");
  } catch (err) {
    fastify.log.error({ err }, "DB: connection failed");
    throw err;
  }

  fastify.addHook("onClose", async (instance) => {
    instance.log.info("DB: disconnecting");
    try {
      await instance.prisma.$disconnect();
      instance.log.info("DB: disconnected");
    } catch (err) {
      instance.log.error({ err }, "DB: disconnect error");
    }
  });
};

export default fp(prismaPlugin, { name: "fastify-prisma" });
