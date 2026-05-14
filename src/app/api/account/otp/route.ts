import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { randomOtp, sha256hex } from "@/lib/crypto";
import { sendOtpEmail } from "@/lib/email";
import { ok, err } from "@/lib/api-response";
import { rateLimit } from "@/lib/rate-limit";
import { logAuditEvent } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return err("Unauthorized", 401);

  const rl = rateLimit(`account-otp:${user.id}`, 3, 10 * 60_000, 15 * 60_000);
  if (!rl.allowed) return err("Too many code requests. Try again later.", 429);

  await prisma.otpChallenge.deleteMany({ where: { userId: user.id, usedAt: null } });

  const otp = randomOtp(6);
  await prisma.otpChallenge.create({
    data: {
      userId: user.id,
      tokenHash: sha256hex(otp),
      expiresAt: new Date(Date.now() + 10 * 60_000),
    },
  });

  await sendOtpEmail(user.email, otp).catch((e) => {
    console.error("[account] Failed to send account OTP:", e);
    throw e;
  });

  await logAuditEvent({
    organizationId: user.orgId ?? undefined,
    userId: user.id,
    eventType: "account.otp_sent",
    ipAddress: req.headers.get("x-forwarded-for") ?? "",
    userAgent: req.headers.get("user-agent") ?? "",
  });

  return ok({ message: "Security code sent to your current email." });
}
