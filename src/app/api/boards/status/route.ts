import { type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { authenticateDevice } from "@/lib/device-auth";
import { ok, err } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const Schema = z.object({
  statusJson: z.record(z.unknown()),
});

export async function POST(req: NextRequest) {
  const auth = await authenticateDevice(req);
  if (!auth.ok) return err(auth.error, auth.status);

  let body: unknown;
  try { body = await req.json(); } catch { return err("Invalid JSON"); }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) return err("Invalid status payload", 422);

  await prisma.board.update({
    where: { id: auth.board.id },
    data: {
      statusJson: JSON.stringify(parsed.data.statusJson),
      lastSeenAt: new Date(),
    },
  });

  return ok({ synced: true });
}
