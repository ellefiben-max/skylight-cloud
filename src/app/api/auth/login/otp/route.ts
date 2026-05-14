import { type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { sha256hex } from "@/lib/crypto";
import { createSession, setSessionCookie } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { ok, err } from "@/lib/api-response";
import { getClientIp } from "@/lib/device-auth";
import { logAuditEvent } from "@/lib/audit";

const Schema = z.object({
  userId: z.string().cuid(),
  otp: z.string().length(6).regex(/^\d{6}$/),
});

const MAX_OTP_ATTEMPTS = 5;

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit(`otp:${ip}`, 20, 60_000, 10 * 60_000);
  if (!rl.allowed) {
    return err("Too many OTP attempts. Wait a few minutes.", 429);
  }

  let body: unknown;
  try { body = await req.json(); } catch { return err("Invalid JSON"); }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) return err("Invalid request", 422);

  const { userId, otp } = parsed.data;

  const userRl = rateLimit(`otp:user:${userId}`, MAX_OTP_ATTEMPTS, 15 * 60_000, 15 * 60_000);
  if (!userRl.allowed) {
    return err("Too many failed OTP attempts. Wait 15 minutes.", 429);
  }

  const tokenHash = sha256hex(otp);
  const challenge = await prisma.otpChallenge.findFirst({
    where: { userId, usedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (!challenge) return err("No pending OTP challenge.", 401);
  if (challenge.expiresAt < new Date()) return err("OTP expired. Log in again.", 401);
  if (challenge.tokenHash !== tokenHash) {
    await prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: { attempts: { increment: 1 } },
    });
    return err("Invalid OTP.", 401);
  }

  await prisma.otpChallenge.update({
    where: { id: challenge.id },
    data: { usedAt: new Date() },
  });

  const sessionToken = await createSession(userId, {
    ip,
    ua: req.headers.get("user-agent") ?? "",
  });

  await setSessionCookie(sessionToken);

  await logAuditEvent({
    userId,
    eventType: "auth.login_success",
    ipAddress: ip,
    userAgent: req.headers.get("user-agent") ?? "",
  });

  return ok({ message: "Logged in." });
}
