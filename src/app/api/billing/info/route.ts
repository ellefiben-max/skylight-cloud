import { type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { ok, err } from "@/lib/api-response";

export async function GET(_req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return err("Unauthorized", 401);
  if (!user.orgId) return ok(null);

  const sub = await prisma.subscription.findUnique({
    where: { organizationId: user.orgId },
    select: {
      status: true,
      boardCount: true,
      unitPriceCents: true,
      currentPeriodEnd: true,
      stripeSubscriptionId: true,
    },
  });

  return ok(sub);
}
