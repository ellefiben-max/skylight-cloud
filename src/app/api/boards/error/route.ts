import { type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { authenticateDevice } from "@/lib/device-auth";
import { ok, err } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const Schema = z.object({
  message: z.string().max(2048),
  source: z.string().max(64).optional(),
});

export async function POST(req: NextRequest) {
  const auth = await authenticateDevice(req);
  if (!auth.ok) return err(auth.error, auth.status);

  let body: unknown;
  try { body = await req.json(); } catch { return err("Invalid JSON"); }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) return err("Invalid error payload", 422);

  await prisma.boardLog.create({
    data: {
      boardId: auth.board.id,
      timestamp: new Date(),
      source: parsed.data.source ?? "device",
      level: "error",
      message: parsed.data.message,
    },
  });

  return ok({ stored: true });
}
