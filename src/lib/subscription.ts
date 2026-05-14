import { prisma } from "./db";

const ACTIVE_STATUSES = new Set(["active", "trialing"]);
const GRACE_STATUSES = new Set(["past_due"]);

export async function hasActiveSubscription(organizationId: string): Promise<boolean> {
  const sub = await prisma.subscription.findUnique({ where: { organizationId } });
  if (!sub) return false;
  if (ACTIVE_STATUSES.has(sub.status)) return true;
  // Grace period: past_due but period hasn't ended
  if (GRACE_STATUSES.has(sub.status) && sub.currentPeriodEnd && sub.currentPeriodEnd > new Date()) {
    return true;
  }
  return false;
}

export async function getBoardCount(organizationId: string): Promise<number> {
  return prisma.board.count({ where: { organizationId, claimedAt: { not: null } } });
}
