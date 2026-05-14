import { cookies } from "next/headers";
import { prisma } from "./db";
import { randomToken, sha256hex } from "./crypto";

const SESSION_COOKIE = "skylight_session";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

export async function createSession(
  userId: string,
  req: { ip?: string; ua?: string }
): Promise<string> {
  const token = randomToken(48);
  const tokenHash = sha256hex(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
      ipAddress: req.ip ?? "",
      userAgent: req.ua ?? "",
    },
  });

  return token;
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function getSessionUser(): Promise<{
  id: string;
  username: string;
  email: string;
  emailVerifiedAt: Date | null;
  orgId: string | null;
} | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const tokenHash = sha256hex(token);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: {
      user: {
        include: {
          orgMemberships: { take: 1 },
        },
      },
    },
  });

  if (!session || session.expiresAt < new Date()) {
    if (session) {
      await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    }
    return null;
  }

  await prisma.session.update({
    where: { id: session.id },
    data: { lastUsedAt: new Date() },
  });

  const orgId = session.user.orgMemberships[0]?.organizationId ?? null;

  return {
    id: session.user.id,
    username: session.user.username,
    email: session.user.email,
    emailVerifiedAt: session.user.emailVerifiedAt,
    orgId,
  };
}

export async function deleteSession(token: string): Promise<void> {
  const tokenHash = sha256hex(token);
  await prisma.session.deleteMany({ where: { tokenHash } });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export { SESSION_COOKIE };
