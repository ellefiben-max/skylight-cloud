import { type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { authenticateDevice } from "@/lib/device-auth";
import { ok, err } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const Schema = z.object({
  commandId: z.string().min(1),
  success: z.boolean(),
  reason: z.string().max(256).optional(),
});

export async function POST(req: NextRequest) {
  const auth = await authenticateDevice(req);
  if (!auth.ok) return err(auth.error, auth.status);

  let body: unknown;
  try { body = await req.json(); } catch { return err("Invalid JSON"); }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) return err("Invalid ack payload", 422);

  const { commandId, success, reason } = parsed.data;

  const command = await prisma.boardCommand.findFirst({
    where: { id: commandId, boardId: auth.board.id },
  });

  if (!command) return err("Command not found", 404);
  if (command.status === "acked" || command.status === "failed") {
    return ok({ message: "Already acknowledged" });
  }

  await prisma.boardCommand.update({
    where: { id: commandId },
    data: success
      ? { status: "acked", ackedAt: new Date() }
      : { status: "failed", failedAt: new Date(), failureReason: reason ?? "device error" },
  });

  return ok({ message: "Acknowledged" });
}
