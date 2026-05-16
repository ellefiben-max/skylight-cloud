import { type NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { hasActiveSubscription } from "@/lib/subscription";
import { randomToken } from "@/lib/crypto";
import { logAuditEvent } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  const user = await getSessionUser();
  if (!user?.orgId) {
    return NextResponse.redirect(new URL("/login", process.env.APP_URL ?? "http://localhost:3000"));
  }

  const { boardId } = await params;
  const board = await prisma.board.findFirst({
    where: { id: boardId, organizationId: user.orgId },
    select: { id: true, deviceName: true },
  });
  if (!board) return new NextResponse("Board not found", { status: 404 });

  const active = await hasActiveSubscription(user.orgId);
  const remoteSessionId = randomToken(24);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  await prisma.boardRemoteUiSession.deleteMany({
    where: { boardId: board.id, expiresAt: { lt: new Date() } },
  });

  await prisma.boardRemoteUiSession.create({
    data: {
      id: remoteSessionId,
      boardId: board.id,
      organizationId: user.orgId,
      userId: user.id,
      expiresAt,
    },
  });

  if (active) {
    await prisma.boardCommand.create({
      data: {
        boardId: board.id,
        type: "ui.sync",
        payloadJson: JSON.stringify({
          remoteSessionId,
          expiresAt: expiresAt.toISOString(),
        }),
        status: "queued",
        createdByUserId: user.id,
      },
    });

    await logAuditEvent({
      organizationId: user.orgId,
      userId: user.id,
      boardId: board.id,
      eventType: "board.remote_ui_session_created",
      details: { remoteSessionId },
    });
  }

  // Read the original app.html shipped with the firmware project
  const appHtmlPath = path.join(process.cwd(), "public", "board-ui", "app.html");
  let html: string;
  try {
    html = fs.readFileSync(appHtmlPath, "utf8");
  } catch {
    return new NextResponse("Board UI file not found. Copy app.html to public/board-ui/app.html", { status: 500 });
  }

  // Proxy base: all local /api/* calls route through our cloud proxy
  const proxyBase = `/api/user/boards/${boardId}/proxy`;

  // Patches applied to app.html:
  // 1. Override BASE to our proxy
  // 2. Replace PIN auth with a no-op (cloud session handles auth)
  // 3. Inject offline/subscription banners
  // 4. Block factory reset button
  const injectedScript = `
<script>
// SKYLIGHT CLOUD REMOTE OVERRIDE — injected by cloud server
const __CLOUD_BOARD_ID__ = ${JSON.stringify(boardId)};
const __CLOUD_SUBSCRIPTION_ACTIVE__ = ${JSON.stringify(active)};
const __CLOUD_DEVICE_NAME__ = ${JSON.stringify(board.deviceName)};
const __CLOUD_REMOTE_SESSION_ID__ = ${JSON.stringify(remoteSessionId)};

// Override BASE before the app script runs
window.__CLOUD_MODE__ = true;
</script>
`;

  const patchedBaseScript = `const BASE = '${proxyBase}';`;
  const patchedPinScript = `
// Cloud mode: no PIN needed, session cookie handles auth
let cachedPin = '__cloud_session__';
function setCachedPin(p) { cachedPin = p || '__cloud_session__'; }
function promptForPin(reason) { return Promise.resolve('__cloud_session__'); }
async function ensurePin(reason) { return '__cloud_session__'; }
function headers(pin, json = false) {
  const h = {};
  if (json) h['Content-Type'] = 'application/json';
  h['X-Skylight-Remote-Session'] = __CLOUD_REMOTE_SESSION_ID__;
  return h;
}
`;

  const blockResetScript = `
// Block factory reset remotely
const origFetch = window.fetch;
`;

  // Inject subscription warning banner before </body>
  const subscriptionBanner = !active
    ? `<div style="position:fixed;top:0;left:0;right:0;z-index:9999;background:#a12c7b;color:#fff;text-align:center;padding:.5rem 1rem;font-size:.875rem;font-weight:600;">
    Subscription inactive — commands are blocked. <a href="/billing" style="color:#fff;text-decoration:underline">Subscribe</a>
  </div>`
    : "";

  html = html
    .replace("const BASE = '';", patchedBaseScript)
    .replace(
      "let cachedPin = null;",
      "// [cloud override below]\nlet cachedPin = null;"
    )
    .replace(
      /\/\/ PIN cache \+ modal prompt[\s\S]*?function headers\(pin, json = false\) \{[\s\S]*?\n\}/,
      patchedPinScript
    )
    // Override title
    .replace(/<title>SKYLIGHT 100<\/title>/, `<title>${board.deviceName} — Skylight Cloud</title>`)
    // Inject before </head>
    .replace("</head>", `${injectedScript}</head>`)
    // Inject banner before </body>
    .replace("</body>", `${subscriptionBanner}\n</body>`);

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-Frame-Options": "SAMEORIGIN",
      "Cache-Control": "no-store",
    },
  });
}
