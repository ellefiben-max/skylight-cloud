import { type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth, requireSubscription } from "@/lib/require-auth";
import { ok, err } from "@/lib/api-response";
import { ALLOWED_COMMAND_TYPES, BLOCKED_COMMAND_TYPES } from "@/lib/command-types";
import { logAuditEvent } from "@/lib/audit";
import { getClientIp } from "@/lib/device-auth";
import { publishMqttCommand } from "@/lib/mqtt";

export const dynamic = "force-dynamic";

const Schema = z.object({
  type: z.string().min(1).max(64),
  payload: z.record(z.unknown()).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const subErr = await requireSubscription(auth.user.orgId!);
  if (subErr) return subErr;

  const { boardId } = await params;

  const board = await prisma.board.findFirst({
    where: { id: boardId, organizationId: auth.user.orgId! },
  });
  if (!board) return err("Board not found", 404);

  let body: unknown;
  try { body = await req.json(); } catch { return err("Invalid JSON"); }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) return err("Invalid command", 422);

  const { type, payload } = parsed.data;

  if (BLOCKED_COMMAND_TYPES.has(type)) {
    return err("Command not permitted remotely.", 403);
  }

  if (!ALLOWED_COMMAND_TYPES.has(type)) {
    return err(`Unknown command type: ${type}`, 422);
  }

  const command = await prisma.boardCommand.create({
    data: {
      boardId: board.id,
      type,
      payloadJson: JSON.stringify(payload ?? {}),
      status: "queued",
      createdByUserId: auth.user.id,
    },
  });

  const mqttSent = await publishMqttCommand(board.boardId, {
    id: command.id,
    type,
    payload: payload ?? {},
  });

  if (mqttSent) {
    await prisma.boardCommand.update({
      where: { id: command.id },
      data: { status: "delivered", deliveredAt: new Date() },
    });
  }

  await logAuditEvent({
    organizationId: auth.user.orgId!,
    userId: auth.user.id,
    boardId: board.id,
    eventType: "board.command_queued",
    details: { commandId: command.id, type },
    ipAddress: getClientIp(req),
  });

  return ok({ commandId: command.id, status: mqttSent ? "sent" : "queued", mqttSent }, 201);
}
