import { NextResponse } from "next/server";
import { AuthError } from "@/lib/auth";

export function ok(data, message, meta) {
  return NextResponse.json({ success: true, data, message, ...meta });
}

export function fail(message, status = 400) {
  return NextResponse.json({ success: false, message }, { status });
}

export function handleError(error) {
  if (error instanceof AuthError) {
    return fail(error.message, error.status);
  }
  if (error && error.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0] || "field";
    return fail(`Duplicate value for ${field}. Please use a unique value.`, 409);
  }
  if (error && error.name === "ValidationError") {
    const msg = Object.values(error.errors || {})[0]?.message || "Validation failed.";
    return fail(msg, 422);
  }
  if (error && error.name === "ZodError") {
    const msg = error.issues?.[0]?.message || "Validation failed.";
    return fail(msg, 422);
  }
  return fail("Server error. Please try again later.", 500);
}

/**
 * Runs a protected handler with standard error handling.
 */
export function withHandler(handler) {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (error) {
      return handleError(error);
    }
  };
}
