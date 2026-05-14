import { type NextRequest, NextResponse } from "next/server";
import { verifyStripeWebhook } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { unitPriceForBoardCount } from "@/lib/pricing";
import type Stripe from "stripe";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    const payload = await req.text();
    event = verifyStripeWebhook(payload, sig);
  } catch (e) {
    console.error("[stripe webhook] Signature verification failed:", e);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription") break;
        const orgId = session.metadata?.organizationId;
        if (!orgId) break;
        await prisma.subscription.update({
          where: { organizationId: orgId },
          data: {
            stripeSubscriptionId: session.subscription as string,
            status: "active",
          },
        });
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const orgId = sub.metadata?.organizationId;
        if (!orgId) break;
        const quantity = sub.items.data[0]?.quantity ?? 1;
        await prisma.subscription.updateMany({
          where: { organizationId: orgId },
          data: {
            stripeSubscriptionId: sub.id,
            status: sub.status,
            boardCount: quantity,
            unitPriceCents: unitPriceForBoardCount(quantity),
            currentPeriodEnd: new Date((sub as Stripe.Subscription & { current_period_end: number }).current_period_end * 1000),
          },
        });
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const orgId = sub.metadata?.organizationId;
        if (!orgId) break;
        await prisma.subscription.updateMany({
          where: { organizationId: orgId },
          data: { status: "canceled", stripeSubscriptionId: null },
        });
        break;
      }

      case "invoice.payment_succeeded": {
        const inv = event.data.object as Stripe.Invoice & { subscription?: string };
        if (!inv.subscription) break;
        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: inv.subscription },
          data: { status: "active" },
        });
        break;
      }

      case "invoice.payment_failed": {
        const inv = event.data.object as Stripe.Invoice & { subscription?: string };
        if (!inv.subscription) break;
        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: inv.subscription },
          data: { status: "past_due" },
        });
        break;
      }

      default:
        break;
    }
  } catch (e) {
    console.error("[stripe webhook] Handler error:", e);
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

// Disable body parsing — Stripe needs raw bytes for signature verification
export const config = { api: { bodyParser: false } };
