export const API_RESPONSE_STATES = ["success", "error"] as const;

export type ApiResponseState = (typeof API_RESPONSE_STATES)[number];

export interface ApiResponseMetadata {
  count: number;
  cursor: string | null;
  message: string | null;
  code: string | null;
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiFieldError {
  message: string;
}

export type ApiValidationErrors = Record<string, ApiFieldError[]>;

export interface ApiResponse<T = unknown> {
  data: T | null;
  metadata: ApiResponseMetadata;
  errors: ApiValidationErrors | null;
  state: ApiResponseState;
  requestId: string;
  timestamp: string;
}

export const emptyApiResponseMetadata = (): ApiResponseMetadata => ({
  count: 0,
  cursor: null,
  message: null,
  code: null,
  totalCount: 0,
  page: 0,
  limit: 0,
  totalPages: 0,
});
