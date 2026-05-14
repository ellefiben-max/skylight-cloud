import { getSessionUser } from "./session";
import { hasActiveSubscription } from "./subscription";
import { err } from "./api-response";
import type { NextResponse } from "next/server";

interface AuthedUser {
  id: string;
  username: string;
  email: string;
  emailVerifiedAt: Date | null;
  orgId: string | null;
}

type AuthResult =
  | { ok: true; user: AuthedUser }
  | { ok: false; response: NextResponse };

export async function requireAuth(): Promise<AuthResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, response: err("Unauthorized", 401) };
  if (!user.emailVerifiedAt) return { ok: false, response: err("Email not verified", 403) };
  if (!user.orgId) return { ok: false, response: err("No organization", 400) };
  return { ok: true, user };
}

export async function requireSubscription(orgId: string): Promise<NextResponse | null> {
  const active = await hasActiveSubscription(orgId);
  if (!active) return err("Active subscription required", 402);
  return null;
}
