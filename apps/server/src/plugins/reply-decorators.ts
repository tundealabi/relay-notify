import type { ApiValidationErrors } from "@relay/shared";
import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

import {
  apiReply,
  type ApiReplyFailOptions,
  type ApiReplySuccessOptions,
  type ApiReplyValidationFailOptions,
} from "@/libs/reply";

declare module "fastify" {
  interface FastifyReply {
    success: <T>(options: Omit<ApiReplySuccessOptions<T>, "reply">) => void;
    fail: (options: Omit<ApiReplyFailOptions, "reply">) => void;
    validationFail: (
      options: Omit<ApiReplyValidationFailOptions, "reply">
    ) => void;
  }
}

const replyDecoratorsPlugin: FastifyPluginAsync = (fastify) => {
  fastify.decorateReply("success", function success(options) {
    apiReply.success({ reply: this, ...options });
  });

  fastify.decorateReply("fail", function fail(options) {
    apiReply.fail({ reply: this, ...options });
  });

  fastify.decorateReply(
    "validationFail",
    function validationFail(options: {
      errors: ApiValidationErrors;
      metadata?: ApiReplyValidationFailOptions["metadata"];
      statusCode?: number;
    }) {
      apiReply.validationFail({ reply: this, ...options });
    }
  );

  return Promise.resolve();
};

export default fp(replyDecoratorsPlugin, { name: "reply-decorators" });
