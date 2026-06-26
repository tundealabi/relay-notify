import fastifyRedis from "@fastify/redis";
import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

const redisPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(fastifyRedis, {
    url: process.env.REDIS_URL,
  });

  const { redis } = fastify;

  redis.on("error", (err) => {
    fastify.log.error({ err }, "Redis: connection error");
  });

  redis.on("end", () => {
    fastify.log.info("Redis: connection ended");
  });

  try {
    await redis.ping();
    fastify.log.info("Redis: connected successfully");
  } catch (err) {
    fastify.log.error({ err }, "Redis: connection failed");
    throw err;
  }

  fastify.addHook("onClose", async (instance) => {
    instance.log.info("Redis: disconnecting");
    try {
      await instance.redis.quit();
      instance.log.info("Redis: disconnected");
    } catch (err) {
      instance.log.error({ err }, "Redis: disconnect error");
    }
  });
};

export default fp(redisPlugin, { name: "fastify-redis" });
