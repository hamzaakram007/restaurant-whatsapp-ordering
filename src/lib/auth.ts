import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import type { MemberRole, SessionUser } from "@/lib/types";

const SESSION_COOKIE = "rwo_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

function authSecret() {
  return process.env.AUTH_SECRET ?? process.env.TENANT_SECRETS_KEY ?? "dev-only-auth-secret";
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64).toString("hex");
  try {
    return timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(candidate, "hex"));
  } catch {
    return false;
  }
}

function signPayload(payload: string) {
  return createHmac("sha256", authSecret()).update(payload).digest("base64url");
}

export function createSessionToken(user: SessionUser) {
  const expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000;
  const body = Buffer.from(
    JSON.stringify({ ...user, expiresAt }),
    "utf8",
  ).toString("base64url");
  return `${body}.${signPayload(body)}`;
}

export function parseSessionToken(token: string | undefined): SessionUser | null {
  if (!token) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature || signPayload(body) !== signature) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionUser & {
      expiresAt: number;
    };
    if (!parsed.expiresAt || parsed.expiresAt < Date.now()) return null;
    return {
      userId: parsed.userId,
      email: parsed.email,
      name: parsed.name,
      restaurantId: parsed.restaurantId,
      role: parsed.role,
    };
  } catch {
    return null;
  }
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  return parseSessionToken(cookieStore.get(SESSION_COOKIE)?.value);
}

export async function setSessionCookie(user: SessionUser) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, createSessionToken(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export function roleCanAccessRoute(role: MemberRole, pathname: string) {
  if (role === "owner") return true;
  if (role === "counter") {
    return (
      pathname.startsWith("/dashboard") ||
      pathname.startsWith("/admin/menu") ||
      pathname.startsWith("/admin/settings") ||
      pathname.startsWith("/admin/twilio")
    );
  }
  if (role === "kitchen") {
    return pathname.startsWith("/kitchen");
  }
  return false;
}
