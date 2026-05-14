import { type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { ok, err } from "@/lib/api-response";

export async function POST(_req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return err("Unauthorized", 401);
  if (!user.orgId) return err("No organization found", 400);

  const sub = await prisma.subscription.findUnique({ where: { organizationId: user.orgId } });
  if (!sub?.stripeCustomerId) return err("No billing account found. Subscribe first.", 400);

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";

  const portal = await stripe.billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: `${appUrl}/billing`,
  });

  return ok({ url: portal.url });
}
