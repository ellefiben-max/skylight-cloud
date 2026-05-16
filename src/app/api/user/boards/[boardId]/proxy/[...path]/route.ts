import { type NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { hasActiveSubscription } from "@/lib/subscription";
import { ALLOWED_COMMAND_TYPES, BLOCKED_COMMAND_TYPES } from "@/lib/command-types";
import { logAuditEvent } from "@/lib/audit";
import { getClientIp } from "@/lib/device-auth";

export const dynamic = "force-dynamic";

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

async function getBoard(boardId: string, orgId: string) {
  return prisma.board.findFirst({ where: { id: boardId, organizationId: orgId } });
}

async function queueCommand(
  boardDbId: string,
  type: string,
  payload: Record<string, unknown>,
  userId: string,
  orgId: string,
  ip: string
) {
  if (BLOCKED_COMMAND_TYPES.has(type)) return json({ ok: false, message: "Blocked remotely." }, 403);
  if (!ALLOWED_COMMAND_TYPES.has(type)) return json({ ok: false, message: `Unknown command: ${type}` }, 422);

  await prisma.boardCommand.create({
    data: {
      boardId: boardDbId,
      type,
      payloadJson: JSON.stringify(payload),
      status: "queued",
      createdByUserId: userId,
    },
  });

  await logAuditEvent({
    organizationId: orgId,
    userId,
    boardId: boardDbId,
    eventType: "board.command_queued",
    details: { type },
    ipAddress: ip,
  });

  return json({ ok: true, message: "Command queued." });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ boardId: string; path: string[] }> }
) {
  const user = await getSessionUser();
  if (!user?.orgId) return json({ error: "Unauthorized" }, 401);

  const { boardId, path } = await params;
  const apiPath = "/" + path.join("/");

  const board = await getBoard(boardId, user.orgId);
  if (!board) return json({ error: "Board not found" }, 404);

  if (apiPath === "/api/status") {
    const now = Date.now();
    const lastMs = board.lastSeenAt ? now - board.lastSeenAt.getTime() : null;
    const online = lastMs !== null && lastMs < 30_000;
    let status = JSON.parse(board.statusJson || "{}");
    let remoteSession: { id: string; lastSyncedAt: string | null } | null = null;
    const remoteSessionId = req.headers.get("x-skylight-remote-session");

    if (remoteSessionId) {
      const session = await prisma.boardRemoteUiSession.findFirst({
        where: {
          id: remoteSessionId,
          boardId: board.id,
          organizationId: user.orgId,
          expiresAt: { gt: new Date() },
        },
        select: { id: true, statusJson: true, lastSyncedAt: true },
      });

      if (session) {
        status = JSON.parse(session.statusJson || "{}");
        remoteSession = {
          id: session.id,
          lastSyncedAt: session.lastSyncedAt?.toISOString() ?? null,
        };
      }
    }

    return json({
      ok: true,
      deviceName: board.deviceName,
      firmware: board.firmwareVersion,
      model: board.model,
      ip: board.staIp,
      freeHeap: board.freeHeap,
      online,
      lastSeen: board.lastSeenAt?.toISOString() ?? null,
      ...status,
      cloud: {
        claimed: !!board.claimedAt,
        cloudEnabled: true,
        remoteSession,
      },
    });
  }

  if (apiPath === "/api/log" || apiPath.startsWith("/api/log?")) {
    const logs = await prisma.boardLog.findMany({
      where: { boardId: board.id },
      orderBy: { timestamp: "desc" },
      take: 200,
    });
    return json({
      ok: true,
      log: logs.map((l) => ({
        ts: l.timestamp.toISOString(),
        src: l.source,
        lvl: l.level,
        msg: l.message,
      })),
    });
  }

  if (apiPath === "/api/settings") {
    const status = JSON.parse(board.statusJson || "{}");
    return json({ ok: true, settings: status.settings ?? {} });
  }

  if (apiPath === "/api/cities") {
    return json({ ok: true, cities: [] });
  }

  return json({ ok: false, message: "Not supported remotely." }, 404);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ boardId: string; path: string[] }> }
) {
  const user = await getSessionUser();
  if (!user?.orgId) return json({ error: "Unauthorized" }, 401);

  const active = await hasActiveSubscription(user.orgId);
  if (!active) return json({ error: "Active subscription required." }, 402);

  const { boardId, path } = await params;
  const apiPath = "/" + path.join("/");
  const ip = getClientIp(req);

  const board = await getBoard(boardId, user.orgId);
  if (!board) return json({ error: "Board not found" }, 404);

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* empty body ok */ }

  if (apiPath === "/api/reset") {
    return json({ ok: false, message: "Factory reset is not available remotely." }, 403);
  }

  const PATH_TO_COMMAND: Record<string, string> = {
    "/api/relay": "relay.setMode",
    "/api/schedule/lights": "schedule.lights",
    "/api/schedule/fans": "schedule.fans",
    "/api/settings": "settings.update",
    "/api/cloud": "cloud.update",
    "/api/reboot": "system.reboot",
    "/api/rtc/ack": "rtc.ack",
    "/api/log/clear": "log.clear",
    "/api/time": "time.set",
  };

  const commandType = PATH_TO_COMMAND[apiPath];
  if (commandType) {
    return queueCommand(board.id, commandType, body, user.id, user.orgId, ip);
  }

  return json({ ok: false, message: "Not supported remotely." }, 404);
}
