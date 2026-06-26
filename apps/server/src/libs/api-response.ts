import type {
  ApiResponse,
  ApiResponseMetadata,
  ApiValidationErrors,
} from "@relay/shared";
import { emptyApiResponseMetadata } from "@relay/shared";

interface BuildApiResponseOptions<T> {
  data: T | null;
  requestId: string;
  state: ApiResponse["state"];
  metadata?: Partial<ApiResponseMetadata>;
  errors?: ApiValidationErrors | null;
}

export function buildApiResponse<T>({
  data,
  requestId,
  state,
  metadata,
  errors = null,
}: BuildApiResponseOptions<T>): ApiResponse<T> {
  return {
    data,
    metadata: {
      ...emptyApiResponseMetadata(),
      ...metadata,
    },
    errors,
    state,
    requestId,
    timestamp: new Date().toISOString(),
  };
}

export function buildSuccessResponse<T>(
  data: T,
  requestId: string,
  metadata?: Partial<ApiResponseMetadata>
): ApiResponse<T> {
  return buildApiResponse({
    data,
    requestId,
    state: "success",
    metadata,
    errors: null,
  });
}

export function buildErrorResponse(
  requestId: string,
  metadata: Partial<ApiResponseMetadata> & { message: string }
): ApiResponse<null> {
  return buildApiResponse({
    data: null,
    requestId,
    state: "error",
    metadata,
    errors: null,
  });
}

export function buildValidationErrorResponse(
  requestId: string,
  errors: ApiValidationErrors,
  metadata?: Partial<ApiResponseMetadata>
): ApiResponse<null> {
  return buildApiResponse({
    data: null,
    requestId,
    state: "error",
    metadata: {
      message: "Validation errors in your request",
      code: "VALIDATION_ERROR",
      ...metadata,
    },
    errors,
  });
}
