import { parse as parseCookieHeader } from "cookie";
import { timingSafeEqual } from "node:crypto";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "../../drizzle/schema";
import { COOKIE_NAME } from "@shared/const";
import { ENV } from "./env";

const SESSION_DURATION = "8h";

function sessionSecret() {
  if (!ENV.cookieSecret || ENV.cookieSecret.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters for local authentication.");
  }
  return new TextEncoder().encode(ENV.cookieSecret);
}

function configuredCredentials() {
  if (!ENV.adminEmail || !ENV.adminPassword) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be configured for local authentication.");
  }
  return { email: ENV.adminEmail.toLowerCase(), password: ENV.adminPassword };
}

function sameSecret(left: string, right: string) {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}

export function authenticateAdmin(email: string, password: string) {
  const credentials = configuredCredentials();
  if (email.trim().toLowerCase() !== credentials.email || !sameSecret(password, credentials.password)) {
    return null;
  }
  return { email: credentials.email, name: "Church Administrator" };
}

export async function createAdminSession(email: string) {
  return new SignJWT({ role: "admin", email, name: "Church Administrator" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject("local-admin")
    .setIssuedAt()
    .setExpirationTime(SESSION_DURATION)
    .sign(sessionSecret());
}

export async function getAdminUser(req: Request): Promise<User | null> {
  const token = parseCookieHeader(req.headers.cookie ?? "")[COOKIE_NAME];
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, sessionSecret(), { algorithms: ["HS256"] });
    if (payload.sub !== "local-admin" || payload.role !== "admin" || typeof payload.email !== "string") return null;

    const now = new Date();
    return {
      id: 0,
      openId: "local-admin",
      name: typeof payload.name === "string" ? payload.name : "Church Administrator",
      email: payload.email,
      loginMethod: "local",
      role: "admin",
      createdAt: now,
      updatedAt: now,
      lastSignedIn: now,
    };
  } catch {
    return null;
  }
}