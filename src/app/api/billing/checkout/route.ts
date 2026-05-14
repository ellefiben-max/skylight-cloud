import { type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getStripe, getOrCreateStripeCustomer } from "@/lib/stripe";
import { stripePriceIdForBoardCount, monthlyTotalCents, unitPriceForBoardCount } from "@/lib/pricing";
import { getBoardCount } from "@/lib/subscription";
import { ok, err } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return err("Unauthorized", 401);
  if (!user.emailVerifiedAt) return err("Email not verified", 403);
  if (!user.orgId) return err("No organization found", 400);

  const boardCount = Math.max(1, await getBoardCount(user.orgId));
  const priceId = stripePriceIdForBoardCount(boardCount);

  const org = await prisma.organization.findUnique({ where: { id: user.orgId } });
  if (!org) return err("Organization not found", 404);

  const stripeCustomerId = await getOrCreateStripeCustomer(user.orgId, user.email, org.name);

  // Upsert subscription record with customer ID
  await prisma.subscription.upsert({
    where: { organizationId: user.orgId },
    create: {
      organizationId: user.orgId,
      stripeCustomerId,
      status: "inactive",
      boardCount,
      unitPriceCents: unitPriceForBoardCount(boardCount),
    },
    update: { stripeCustomerId, boardCount, unitPriceCents: unitPriceForBoardCount(boardCount) },
  });

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";

  const session = await getStripe().checkout.sessions.create({
    mode: "subscription",
    customer: stripeCustomerId,
    line_items: [{ price: priceId, quantity: boardCount }],
    success_url: `${appUrl}/billing?success=1`,
    cancel_url: `${appUrl}/billing?canceled=1`,
    metadata: { organizationId: user.orgId },
    subscription_data: {
      metadata: { organizationId: user.orgId },
    },
  });

  return ok({ url: session.url });
}
