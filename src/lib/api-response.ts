import { NextResponse } from "next/server";

export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ ok: true, data }, { status });
}

export function err(message: string, status = 400): NextResponse {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export function validationError(errors: Record<string, string[]>): NextResponse {
  return NextResponse.json({ ok: false, error: "Validation failed", errors }, { status: 422 });
}
