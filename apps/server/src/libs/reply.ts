import type { ApiResponseMetadata, ApiValidationErrors } from "@relay/shared";
import type { FastifyReply } from "fastify";

import {
  buildErrorResponse,
  buildSuccessResponse,
  buildValidationErrorResponse,
} from "@/libs/api-response";

export interface ApiReplySuccessOptions<T> {
  reply: FastifyReply;
  data: T;
  metadata?: Partial<ApiResponseMetadata>;
  statusCode?: number;
}

export interface ApiReplyFailOptions {
  reply: FastifyReply;
  message: string;
  code?: string;
  statusCode?: number;
  metadata?: Partial<ApiResponseMetadata>;
}

export interface ApiReplyValidationFailOptions {
  reply: FastifyReply;
  errors: ApiValidationErrors;
  metadata?: Partial<ApiResponseMetadata>;
  statusCode?: number;
}

export const apiReply = {
  success<T>({
    reply,
    data,
    metadata,
    statusCode = 200,
  }: ApiReplySuccessOptions<T>) {
    reply
      .status(statusCode)
      .send(buildSuccessResponse(data, reply.request.id, metadata));
  },

  fail({
    reply,
    message,
    code,
    statusCode = 400,
    metadata,
  }: ApiReplyFailOptions) {
    reply.status(statusCode).send(
      buildErrorResponse(reply.request.id, {
        ...metadata,
        message,
        code: code ?? metadata?.code ?? "REQUEST_FAILED",
      })
    );
  },

  validationFail({
    reply,
    errors,
    metadata,
    statusCode = 400,
  }: ApiReplyValidationFailOptions) {
    reply
      .status(statusCode)
      .send(buildValidationErrorResponse(reply.request.id, errors, metadata));
  },
};
