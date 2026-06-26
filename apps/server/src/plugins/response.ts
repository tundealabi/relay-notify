import type { FastifyError, FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

import { AppError } from "@/libs/app-error";
import { apiReply } from "@/libs/reply";
import { mapFastifyValidationErrors } from "@/libs/validation-errors";

const responsePlugin: FastifyPluginAsync = (fastify) => {
  fastify.setNotFoundHandler((_request, reply) => {
    apiReply.fail({
      reply,
      message: "Route not found",
      code: "NOT_FOUND",
      statusCode: 404,
    });
  });

  fastify.setErrorHandler((error: FastifyError, request, reply) => {
    if (reply.sent) {
      return;
    }

    request.log.error({ err: error }, "Request failed");

    if (error.validation) {
      apiReply.validationFail({
        reply,
        errors: mapFastifyValidationErrors(error.validation),
        metadata: { code: "VALIDATION_ERROR" },
      });
      return;
    }

    if (error instanceof AppError) {
      apiReply.fail({
        reply,
        message: error.message,
        code: error.code,
        statusCode: error.statusCode,
      });
      return;
    }

    const statusCode = error.statusCode ?? 500;
    const message =
      statusCode >= 500
        ? "Internal server error"
        : (error.message ?? "Request failed");

    apiReply.fail({
      reply,
      message,
      code: error.code ?? "INTERNAL_ERROR",
      statusCode,
    });
  });

  return Promise.resolve();
};

export default fp(responsePlugin, { name: "response-envelope" });
