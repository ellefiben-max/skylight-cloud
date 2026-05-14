import { type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { deleteSession, clearSessionCookie, SESSION_COOKIE } from "@/lib/session";
import { ok } from "@/lib/api-response";

export async function POST(_req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await deleteSession(token);
  }
  await clearSessionCookie();
  return ok({ message: "Logged out." });
}
