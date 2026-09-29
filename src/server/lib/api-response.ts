import { NextResponse } from 'next/server';

export interface ApiResponseSuccess<T = unknown> {
  success: true;
  data: T;
  error: null;
  meta?: Record<string, unknown>;
}

export interface ApiResponseError {
  success: false;
  data: null;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T = unknown> = ApiResponseSuccess<T> | ApiResponseError;

export function apiSuccess<T>(data: T, meta?: Record<string, unknown>, status = 200) {
  return NextResponse.json<ApiResponseSuccess<T>>(
    {
      success: true,
      data,
      error: null,
      meta,
    },
    { status }
  );
}

export function apiError(code: string, message: string, status = 400, details?: unknown) {
  return NextResponse.json<ApiResponseError>(
    {
      success: false,
      data: null,
      error: {
        code,
        message,
        details,
      },
    },
    { status }
  );
}
