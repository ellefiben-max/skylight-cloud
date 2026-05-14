import { type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { randomOtp, sha256hex } from "@/lib/crypto";
import { sendOtpEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";
import { ok, err } from "@/lib/api-response";
import { getClientIp } from "@/lib/device-auth";
import { logAuditEvent } from "@/lib/audit";
export const dynamic = "force-dynamic";

const Schema = z.object({
  login: z.string().min(1).max(254),
  password: z.string().min(1).max(128),
});

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes

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
    // Constant-time delay to resist timing attacks
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

  // Invalidate any previous OTP challenges for this user
  await prisma.otpChallenge.deleteMany({
    where: { userId: user.id, usedAt: null },
  });

  const otp = randomOtp(6);
  const tokenHash = sha256hex(otp);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await prisma.otpChallenge.create({
    data: { userId: user.id, tokenHash, expiresAt },
  });

  await sendOtpEmail(user.email, otp).catch((e) => {
    console.error("[login] Failed to send OTP:", e);
  });

  await logAuditEvent({
    userId: user.id,
    eventType: "auth.otp_sent",
    ipAddress: ip,
    userAgent: req.headers.get("user-agent") ?? "",
  });

  // Return userId so the OTP step can reference it
  return ok({ userId: user.id, message: "OTP sent to your email." });
}
