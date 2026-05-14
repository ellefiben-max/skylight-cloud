import { type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { createSession, setSessionCookie } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { ok, err } from "@/lib/api-response";
import { getClientIp } from "@/lib/device-auth";
import { logAuditEvent } from "@/lib/audit";

export const dynamic = "force-dynamic";

const Schema = z.object({
  login: z.string().min(1).max(254),
  password: z.string().min(1).max(128),
});

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit(`login:${ip}`, 10, 60_000, 5 * 60_000);
  if (!rl.allowed) {
    return err("Too many login attempts. Wait a few minutes.", 429);
  }

  let body: unknown;
  try { body = await req.json(); } catch { return err("Invalid JSON"); }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) return err("Invalid credentials", 401);

  const { login, password } = parsed.data;

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: login.toLowerCase() }, { username: login }],
    },
  });

  const SLOW_RESPONSE_MS = 300;
  if (!user) {
    await new Promise((r) => setTimeout(r, SLOW_RESPONSE_MS));
    return err("Invalid credentials", 401);
  }

  const valid = await verifyPassword(user.passwordHash, password);
  if (!valid) {
    const userRl = rateLimit(`login:user:${user.id}`, 5, 10 * 60_000, 15 * 60_000);
    if (!userRl.allowed) {
      await logAuditEvent({
        userId: user.id,
        eventType: "auth.login_locked",
        ipAddress: ip,
        userAgent: req.headers.get("user-agent") ?? "",
      });
    }
    return err("Invalid credentials", 401);
  }

  if (!user.emailVerifiedAt) {
    return err("Please verify your email before logging in.", 403);
  }

  const sessionToken = await createSession(user.id, {
    ip,
    ua: req.headers.get("user-agent") ?? "",
  });
  await setSessionCookie(sessionToken);

  await logAuditEvent({
    userId: user.id,
    eventType: "auth.login_success",
    ipAddress: ip,
    userAgent: req.headers.get("user-agent") ?? "",
  });

  return ok({ message: "Logged in." });
}
