import { type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { randomToken, sha256hex } from "@/lib/crypto";
import { sendVerificationEmail } from "@/lib/email";
import { ok, err } from "@/lib/api-response";
import { hashPassword, validatePasswordStrength, verifyPassword } from "@/lib/password";
import { rateLimit } from "@/lib/rate-limit";
import { logAuditEvent } from "@/lib/audit";

export const dynamic = "force-dynamic";

const Schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("email"),
    otp: z.string().length(6).regex(/^\d{6}$/),
    email: z.string().email().max(254),
  }),
  z.object({
    action: z.literal("phone"),
    otp: z.string().length(6).regex(/^\d{6}$/),
    phone: z.string().trim().max(32),
  }),
  z.object({
    action: z.literal("password"),
    otp: z.string().length(6).regex(/^\d{6}$/),
    currentPassword: z.string().min(1).max(128),
    newPassword: z.string().min(12).max(128),
  }),
]);

async function consumeOtp(userId: string, otp: string) {
  const tokenHash = sha256hex(otp);
  const challenge = await prisma.otpChallenge.findFirst({
    where: { userId, tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!challenge) return false;

  await prisma.otpChallenge.update({
    where: { id: challenge.id },
    data: { usedAt: new Date() },
  });
  return true;
}

export async function PATCH(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return err("Unauthorized", 401);

  const rl = rateLimit(`account-change:${sessionUser.id}`, 8, 15 * 60_000, 15 * 60_000);
  if (!rl.allowed) return err("Too many account changes. Try again later.", 429);

  let body: unknown;
  try { body = await req.json(); } catch { return err("Invalid JSON"); }
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return err("Invalid account update payload", 422);

  const otpOk = await consumeOtp(sessionUser.id, parsed.data.otp);
  if (!otpOk) return err("Invalid or expired security code.", 403);

  const ipAddress = req.headers.get("x-forwarded-for") ?? "";
  const userAgent = req.headers.get("user-agent") ?? "";

  if (parsed.data.action === "email") {
    const email = parsed.data.email.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing && existing.id !== sessionUser.id) return err("That email is already in use.", 409);

    const verifyToken = randomToken(32);
    const tokenHash = sha256hex(verifyToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: sessionUser.id },
        data: { email, emailVerifiedAt: null },
      }),
      prisma.emailVerificationToken.create({
        data: { userId: sessionUser.id, tokenHash, expiresAt },
      }),
    ]);

    const appUrl = process.env.APP_URL ?? "http://localhost:3000";
    await sendVerificationEmail(email, `${appUrl}/verify-email?token=${verifyToken}`).catch((e) => {
      console.error("[account] Failed to send new email verification:", e);
    });

    await logAuditEvent({
      organizationId: sessionUser.orgId ?? undefined,
      userId: sessionUser.id,
      eventType: "account.email_changed",
      details: { email },
      ipAddress,
      userAgent,
    });

    return ok({ message: "Email updated. Verify the new address before your next login." });
  }

  if (parsed.data.action === "phone") {
    const phone = parsed.data.phone.replace(/\s+/g, " ").trim();
    if (phone && !/^\+?[0-9(). -]{7,32}$/.test(phone)) {
      return err("Enter a valid phone number.", 422);
    }

    await prisma.user.update({ where: { id: sessionUser.id }, data: { phone } });
    await logAuditEvent({
      organizationId: sessionUser.orgId ?? undefined,
      userId: sessionUser.id,
      eventType: "account.phone_changed",
      details: { phoneSet: phone.length > 0 },
      ipAddress,
      userAgent,
    });

    return ok({ message: "Phone number updated." });
  }

  const fullUser = await prisma.user.findUnique({ where: { id: sessionUser.id } });
  if (!fullUser) return err("User not found", 404);

  const currentOk = await verifyPassword(fullUser.passwordHash, parsed.data.currentPassword);
  if (!currentOk) return err("Current password is incorrect.", 403);

  const passwordError = validatePasswordStrength(parsed.data.newPassword);
  if (passwordError) return err(passwordError, 422);

  await prisma.user.update({
    where: { id: sessionUser.id },
    data: { passwordHash: await hashPassword(parsed.data.newPassword) },
  });

  await logAuditEvent({
    organizationId: sessionUser.orgId ?? undefined,
    userId: sessionUser.id,
    eventType: "account.password_changed",
    ipAddress,
    userAgent,
  });

  return ok({ message: "Password updated." });
}
