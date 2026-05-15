import { type NextRequest } from "next/server";
import { prisma } from "./db";
import { sha256hex } from "./crypto";
import { rateLimit } from "./rate-limit";

export interface DeviceAuthResult {
  ok: true;
  board: {
    id: string;
    boardId: string;
    organizationId: string | null;
    deviceName: string;
    model: string;
    firmwareVersion: string;
  };
}

export interface DeviceAuthError {
  ok: false;
  status: number;
  error: string;
}

export async function authenticateDevice(
  req: NextRequest
): Promise<DeviceAuthResult | DeviceAuthError> {
  const boardId = req.headers.get("x-skylight-board-id");
  const boardSecret = req.headers.get("x-skylight-board-secret");

  if (!boardId || !boardSecret) {
    return { ok: false, status: 401, error: "Missing board credentials" };
  }

  const rlKey = `device:${boardId}`;
  // Temporary high ceiling for board-device traffic; user-facing routes keep
  // their stricter rate limits. The device API key still authenticates boards.
  const rl = rateLimit(rlKey, 5000, 60_000);
  if (!rl.allowed) {
    return { ok: false, status: 429, error: "Too many requests" };
  }

  const board = await prisma.board.findUnique({ where: { boardId } });
  if (!board) {
    return { ok: false, status: 401, error: "Unknown board" };
  }

  if (board.boardSecretHash) {
    const hash = sha256hex(boardSecret);
    if (hash !== board.boardSecretHash) {
      return { ok: false, status: 401, error: "Invalid board secret" };
    }
  }

  return {
    ok: true,
    board: {
      id: board.id,
      boardId: board.boardId,
      organizationId: board.organizationId,
      deviceName: board.deviceName,
      model: board.model,
      firmwareVersion: board.firmwareVersion,
    },
  };
}

export function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}
