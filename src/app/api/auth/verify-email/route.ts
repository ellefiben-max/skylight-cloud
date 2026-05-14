import { type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { sha256hex } from "@/lib/crypto";
import { ok, err } from "@/lib/api-response";
import { logAuditEvent } from "@/lib/audit";
import { getClientIp } from "@/lib/device-auth";

export const dynamic = "force-dynamic";

const Schema = z.object({ token: z.string().min(32) });

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch { return err("Invalid JSON"); }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) return err("Invalid token");

  const { token } = parsed.data;
  const tokenHash = sha256hex(token);

  const record = await prisma.emailVerificationToken.findUnique({ where: { tokenHash } });
  if (!record) return err("Invalid or expired verification link.", 400);
  if (record.usedAt) return err("Link already used.", 400);
  if (record.expiresAt < new Date()) return err("Link expired. Request a new verification email.", 400);

  await prisma.$transaction([
    prisma.emailVerificationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: record.userId },
      data: { emailVerifiedAt: new Date() },
    }),
  ]);

  await logAuditEvent({
    userId: record.userId,
    eventType: "user.email_verified",
    ipAddress: getClientIp(req),
  });

  return ok({ message: "Email verified. You can now log in." });
}
