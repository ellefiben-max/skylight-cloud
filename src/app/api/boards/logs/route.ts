import { type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { authenticateDevice } from "@/lib/device-auth";
import { ok, err } from "@/lib/api-response";

const LOG_MAX_RETAIN = 5000;

const LogEntrySchema = z.object({
  timestamp: z.string().datetime().optional(),
  source: z.string().max(64).default("device"),
  level: z.enum(["debug", "info", "warn", "error"]).default("info"),
  message: z.string().max(2048),
});

const Schema = z.object({
  logs: z.array(LogEntrySchema).max(200),
});

export async function POST(req: NextRequest) {
  const auth = await authenticateDevice(req);
  if (!auth.ok) return err(auth.error, auth.status);

  let body: unknown;
  try { body = await req.json(); } catch { return err("Invalid JSON"); }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) return err("Invalid log payload", 422);

  const now = new Date();
  const entries = parsed.data.logs.map((l) => ({
    boardId: auth.board.id,
    timestamp: l.timestamp ? new Date(l.timestamp) : now,
    source: l.source,
    level: l.level,
    message: l.message,
  }));

  await prisma.boardLog.createMany({ data: entries });

  // Cap retention
  const count = await prisma.boardLog.count({ where: { boardId: auth.board.id } });
  if (count > LOG_MAX_RETAIN) {
    const oldest = await prisma.boardLog.findMany({
      where: { boardId: auth.board.id },
      orderBy: { timestamp: "asc" },
      take: count - LOG_MAX_RETAIN,
      select: { id: true },
    });
    const ids = oldest.map((r) => r.id);
    await prisma.boardLog.deleteMany({ where: { id: { in: ids } } });
  }

  return ok({ stored: entries.length });
}
