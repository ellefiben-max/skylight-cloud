import { type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/require-auth";
import { ok, err } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const PatchSchema = z.object({
  deviceName: z.string().max(128).optional(),
  groupId: z.string().optional().nullable(),
});

async function getOwnedBoard(boardId: string, orgId: string) {
  return prisma.board.findFirst({
    where: { id: boardId, organizationId: orgId },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { boardId } = await params;

  const board = await getOwnedBoard(boardId, auth.user.orgId!);
  if (!board) return err("Board not found", 404);

  let body: unknown;
  try { body = await req.json(); } catch { return err("Invalid JSON"); }

  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return err("Invalid request", 422);

  const updates: Record<string, unknown> = {};
  if (parsed.data.deviceName !== undefined) updates.deviceName = parsed.data.deviceName;

  if (Object.keys(updates).length > 0) {
    await prisma.board.update({ where: { id: board.id }, data: updates });
  }

  if (parsed.data.groupId !== undefined) {
    await prisma.boardGroupMembership.deleteMany({ where: { boardId: board.id } });
    if (parsed.data.groupId) {
      const group = await prisma.boardGroup.findFirst({
        where: { id: parsed.data.groupId, organizationId: auth.user.orgId! },
      });
      if (group) {
        await prisma.boardGroupMembership.create({
          data: { boardId: board.id, boardGroupId: group.id },
        });
      }
    }
  }

  return ok({ updated: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { boardId } = await params;

  const board = await getOwnedBoard(boardId, auth.user.orgId!);
  if (!board) return err("Board not found", 404);

  await prisma.board.update({
    where: { id: board.id },
    data: { organizationId: null, claimedAt: null },
  });

  return ok({ removed: true });
}
