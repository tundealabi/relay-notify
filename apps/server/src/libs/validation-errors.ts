import type { ApiValidationErrors } from "@relay/shared";
import type { FastifySchemaValidationError } from "fastify/types/schema";

export function mapFastifyValidationErrors(
  validation: FastifySchemaValidationError[]
): ApiValidationErrors {
  const errors: ApiValidationErrors = {};

  for (const error of validation) {
    const field = toFieldName(error);

    if (!errors[field]) {
      errors[field] = [];
    }

    errors[field].push({
      message: error.message ?? "Invalid value",
    });
  }

  return errors;
}

function toFieldName(error: FastifySchemaValidationError): string {
  if (error.instancePath) {
    return error.instancePath.replace(/^\//, "").replace(/\//g, ".");
  }

  const missingProperty = error.params?.missingProperty;
  if (typeof missingProperty === "string") {
    return missingProperty;
  }

  return "body";
}
