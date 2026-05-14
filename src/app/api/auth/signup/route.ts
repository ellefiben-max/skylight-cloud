import { type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword, validatePasswordStrength } from "@/lib/password";
import { randomToken, sha256hex } from "@/lib/crypto";
import { sendVerificationEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";
import { ok, err, validationError } from "@/lib/api-response";
import { getClientIp } from "@/lib/device-auth";
import { logAuditEvent } from "@/lib/audit";

const SignupSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(32)
    .regex(/^[a-zA-Z0-9_-]+$/, "Username may only contain letters, numbers, - and _"),
  email: z.string().email().max(254),
  password: z.string().min(12).max(128),
});

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit(`signup:${ip}`, 5, 60_000, 10 * 60_000);
  if (!rl.allowed) {
    return err("Too many signup attempts. Try again later.", 429);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return err("Invalid JSON", 400);
  }

  const parsed = SignupSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }

  const { username, email, password } = parsed.data;

  const pwError = validatePasswordStrength(password);
  if (pwError) return err(pwError, 422);

  const [existingUser, existingEmail] = await Promise.all([
    prisma.user.findUnique({ where: { username } }),
    prisma.user.findUnique({ where: { email } }),
  ]);

  if (existingUser) return err("Username already taken", 409);
  if (existingEmail) return err("Email already registered", 409);

  const passwordHash = await hashPassword(password);
  const verifyToken = randomToken(48);
  const tokenHash = sha256hex(verifyToken);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const user = await prisma.$transaction(async (tx) => {
    const u = await tx.user.create({
      data: { username, email, passwordHash },
    });
    const org = await tx.organization.create({
      data: { name: `${username}'s Organization`, ownerUserId: u.id },
    });
    await tx.organizationMember.create({
      data: { organizationId: org.id, userId: u.id, role: "owner" },
    });
    await tx.emailVerificationToken.create({
      data: { userId: u.id, tokenHash, expiresAt },
    });
    return u;
  });

  const verifyUrl = `${process.env.APP_URL}/verify-email?token=${verifyToken}`;
  await sendVerificationEmail(email, verifyUrl).catch((e) => {
    console.error("[signup] Failed to send verification email:", e);
  });

  await logAuditEvent({
    userId: user.id,
    eventType: "user.signup",
    ipAddress: ip,
    userAgent: req.headers.get("user-agent") ?? "",
  });

  return ok({ message: "Account created. Check your email to verify." }, 201);
}
