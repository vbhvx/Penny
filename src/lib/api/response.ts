import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function errorResponse(
  message: string,
  status = 400,
  code = "BAD_REQUEST",
  details?: unknown
) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        details,
      },
    },
    { status }
  );
}

export function handleApiError(err: unknown) {
  console.error("API Error:", err);

  if (err instanceof ZodError) {
    return errorResponse(
      "Validation failed",
      422,
      "VALIDATION_ERROR",
      err.errors.map((e) => ({
        path: e.path.join("."),
        message: e.message,
      }))
    );
  }

  if (err instanceof Error) {
    if (err.message === "UNAUTHORIZED") {
      return errorResponse("Authentication required", 401, "UNAUTHORIZED");
    }
    if (err.message === "FORBIDDEN") {
      return errorResponse("Access denied", 403, "FORBIDDEN");
    }
    return errorResponse(err.message, 400, "BAD_REQUEST");
  }

  return errorResponse("An unexpected server error occurred", 500, "INTERNAL_SERVER_ERROR");
}

