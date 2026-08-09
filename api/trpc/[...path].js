// api/trpc/[...path].ts
import "dotenv/config";
import { serialize } from "cookie";
import { createHTTPHandler } from "@trpc/server/adapters/standalone";

// server/routers.ts
import { z as z2 } from "zod";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";

// server/routers.ts
import { TRPCError as TRPCError3 } from "@trpc/server";

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  const secure = isSecureRequest(req);
  return {
    httpOnly: true,
    path: "/",
    sameSite: secure ? "none" : "lax",
    secure
  };
}

// server/_core/notification.ts
import { TRPCError } from "@trpc/server";

// server/_core/env.ts
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();
var ENV = {
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  adminEmail: process.env.ADMIN_EMAIL ?? "",
  adminPassword: process.env.ADMIN_PASSWORD ?? ""
};

// server/_core/notification.ts
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl || !ENV.forgeApiKey) return false;
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/db.ts
import { and, asc, desc, eq, gte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

// drizzle/schema.ts
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
var users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  openId: text("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: text("email"),
  loginMethod: text("loginMethod"),
  role: text("role", { enum: ["user", "admin"] }).default("user").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).$defaultFn(() => /* @__PURE__ */ new Date()).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).$defaultFn(() => /* @__PURE__ */ new Date()).notNull(),
  lastSignedIn: integer("lastSignedIn", { mode: "timestamp_ms" }).$defaultFn(() => /* @__PURE__ */ new Date()).notNull()
});
var churchEvents = sqliteTable("church_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  eventStart: integer("eventStart", { mode: "timestamp_ms" }).notNull(),
  description: text("description").notNull(),
  isPublished: integer("isPublished", { mode: "boolean" }).default(true).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).$defaultFn(() => /* @__PURE__ */ new Date()).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).$defaultFn(() => /* @__PURE__ */ new Date()).notNull()
});
var announcements = sqliteTable("announcements", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  publishedAt: integer("publishedAt", { mode: "timestamp_ms" }).$defaultFn(() => /* @__PURE__ */ new Date()).notNull(),
  isPublished: integer("isPublished", { mode: "boolean" }).default(true).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).$defaultFn(() => /* @__PURE__ */ new Date()).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).$defaultFn(() => /* @__PURE__ */ new Date()).notNull()
});
var contactMessages = sqliteTable("contact_messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  notificationStatus: text("notificationStatus").default("pending").notNull(),
  notificationError: text("notificationError"),
  receivedAt: integer("receivedAt", { mode: "timestamp_ms" }).$defaultFn(() => /* @__PURE__ */ new Date()).notNull()
});

// server/db.ts
var _db = null;
async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const databaseUrl = process.env.DATABASE_URL.replace(/^file:/, "");
      const databasePath = databaseUrl === ":memory:" ? databaseUrl : path.resolve(databaseUrl);
      if (databasePath !== ":memory:") fs.mkdirSync(path.dirname(databasePath), { recursive: true });
      _db = drizzle(new Database(databasePath));
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}
function unavailableDatabaseError() {
  return new Error("The church content database is temporarily unavailable.");
}
async function listUpcomingEvents() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(churchEvents).where(and(eq(churchEvents.isPublished, true), gte(churchEvents.eventStart, /* @__PURE__ */ new Date()))).orderBy(asc(churchEvents.eventStart));
}
async function listEventsForAdmin() {
  const db = await getDb();
  if (!db) throw unavailableDatabaseError();
  return db.select().from(churchEvents).orderBy(asc(churchEvents.eventStart));
}
async function createChurchEvent(event) {
  const db = await getDb();
  if (!db) throw unavailableDatabaseError();
  const result = await db.insert(churchEvents).values(event);
  return { id: Number(result.lastInsertRowid) };
}
async function deleteChurchEvent(id) {
  const db = await getDb();
  if (!db) throw unavailableDatabaseError();
  await db.delete(churchEvents).where(eq(churchEvents.id, id));
}
async function listPublishedAnnouncements() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(announcements).where(eq(announcements.isPublished, true)).orderBy(desc(announcements.publishedAt));
}
async function listAnnouncementsForAdmin() {
  const db = await getDb();
  if (!db) throw unavailableDatabaseError();
  return db.select().from(announcements).orderBy(desc(announcements.publishedAt));
}
async function createAnnouncement(announcement) {
  const db = await getDb();
  if (!db) throw unavailableDatabaseError();
  const result = await db.insert(announcements).values(announcement);
  return { id: Number(result.lastInsertRowid) };
}
async function deleteAnnouncement(id) {
  const db = await getDb();
  if (!db) throw unavailableDatabaseError();
  await db.delete(announcements).where(eq(announcements.id, id));
}
async function createContactMessage(message) {
  const db = await getDb();
  if (!db) throw unavailableDatabaseError();
  const result = await db.insert(contactMessages).values(message);
  return { id: Number(result.lastInsertRowid) };
}
async function updateContactMessageNotification(id, status, error = null) {
  const db = await getDb();
  if (!db) throw unavailableDatabaseError();
  await db.update(contactMessages).set({ notificationStatus: status, notificationError: error }).where(eq(contactMessages.id, id));
}
async function listContactMessagesForAdmin() {
  const db = await getDb();
  if (!db) throw unavailableDatabaseError();
  return db.select().from(contactMessages).orderBy(desc(contactMessages.receivedAt));
}

// server/contactEmail.ts
function hasEmailConfiguration() {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL && process.env.CHURCH_ADMIN_EMAIL);
}
function isEmailDeliveryEnabled() {
  return hasEmailConfiguration() && process.env.EMAIL_NOTIFICATIONS_ENABLED === "true";
}
async function sendContactMessageEmail(payload) {
  if (!isEmailDeliveryEnabled()) {
    return { sent: false, error: "Email notification is not enabled." };
  }
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL,
        to: [process.env.CHURCH_ADMIN_EMAIL],
        reply_to: payload.email,
        subject: `New contact message: ${payload.subject}`,
        text: [
          "A new message was received through the Community Baptist Church website.",
          "",
          `Name: ${payload.name}`,
          `Email: ${payload.email}`,
          `Subject: ${payload.subject}`,
          "",
          "Message:",
          payload.message
        ].join("\n")
      })
    });
    if (response.ok) return { sent: true, error: null };
    const responseText = await response.text();
    return { sent: false, error: `Email service rejected the message (${response.status}): ${responseText.slice(0, 240)}` };
  } catch (error) {
    return { sent: false, error: error instanceof Error ? error.message : "The email service request failed." };
  }
}

// server/_core/localAuth.ts
import { parse as parseCookieHeader } from "cookie";
import { timingSafeEqual } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
var SESSION_DURATION = "8h";
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
function sameSecret(left, right) {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}
function authenticateAdmin(email, password) {
  const credentials = configuredCredentials();
  if (email.trim().toLowerCase() !== credentials.email || !sameSecret(password, credentials.password)) {
    return null;
  }
  return { email: credentials.email, name: "Church Administrator" };
}
async function createAdminSession(email) {
  return new SignJWT({ role: "admin", email, name: "Church Administrator" }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setSubject("local-admin").setIssuedAt().setExpirationTime(SESSION_DURATION).sign(sessionSecret());
}
async function getAdminUser(req) {
  const token = parseCookieHeader(req.headers.cookie ?? "")[COOKIE_NAME];
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, sessionSecret(), { algorithms: ["HS256"] });
    if (payload.sub !== "local-admin" || payload.role !== "admin" || typeof payload.email !== "string") return null;
    const now = /* @__PURE__ */ new Date();
    return {
      id: 0,
      openId: "local-admin",
      name: typeof payload.name === "string" ? payload.name : "Church Administrator",
      email: payload.email,
      loginMethod: "local",
      role: "admin",
      createdAt: now,
      updatedAt: now,
      lastSignedIn: now
    };
  } catch {
    return null;
  }
}

// server/routers.ts
var eventInput = z2.object({
  title: z2.string().trim().min(3).max(160),
  eventStart: z2.coerce.date(),
  description: z2.string().trim().min(12).max(2e3),
  isPublished: z2.boolean().default(true)
});
var announcementInput = z2.object({
  title: z2.string().trim().min(3).max(180),
  content: z2.string().trim().min(12).max(4e3),
  isPublished: z2.boolean().default(true)
});
var contactInput = z2.object({
  name: z2.string().trim().min(2).max(120),
  email: z2.string().trim().email().max(320),
  subject: z2.string().trim().min(3).max(180),
  message: z2.string().trim().min(10).max(5e3)
});
var appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    login: publicProcedure.input(z2.object({ email: z2.string().trim().email(), password: z2.string().min(1) })).mutation(async ({ input, ctx }) => {
      const admin = authenticateAdmin(input.email, input.password);
      if (!admin) throw new TRPCError3({ code: "UNAUTHORIZED", message: "Invalid email or password." });
      const token = await createAdminSession(admin.email);
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: 8 * 60 * 60 * 1e3 });
      return { success: true };
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true };
    })
  }),
  content: router({
    events: router({
      upcoming: publicProcedure.query(() => listUpcomingEvents()),
      adminList: adminProcedure.query(() => listEventsForAdmin()),
      create: adminProcedure.input(eventInput).mutation(({ input }) => createChurchEvent(input)),
      delete: adminProcedure.input(z2.object({ id: z2.number().int().positive() })).mutation(({ input }) => deleteChurchEvent(input.id))
    }),
    announcements: router({
      latest: publicProcedure.query(() => listPublishedAnnouncements()),
      adminList: adminProcedure.query(() => listAnnouncementsForAdmin()),
      create: adminProcedure.input(announcementInput).mutation(({ input }) => createAnnouncement(input)),
      delete: adminProcedure.input(z2.object({ id: z2.number().int().positive() })).mutation(({ input }) => deleteAnnouncement(input.id))
    })
  }),
  contact: router({
    submit: publicProcedure.input(contactInput).mutation(async ({ input }) => {
      const storedMessage = await createContactMessage(input);
      const emailResult = await sendContactMessageEmail(input);
      await updateContactMessageNotification(
        storedMessage.id,
        emailResult.sent ? "sent" : "pending",
        emailResult.error
      );
      try {
        await notifyOwner({
          title: "New Community Baptist Church contact message",
          content: `${input.name} (${input.email}) submitted \u201C${input.subject}\u201D.`
        });
      } catch (error) {
        console.warn("[Contact] Owner notification could not be delivered", error);
      }
      return { success: true, emailNotificationSent: emailResult.sent };
    }),
    adminList: adminProcedure.query(() => listContactMessagesForAdmin())
  })
});

// api/trpc/[...path].ts
function createVercelContext(req, res) {
  const protocol = req.headers["x-forwarded-proto"]?.toString().split(",")[0].trim() ?? "http";
  const expressRequest = Object.assign(req, { protocol });
  const expressResponse = res;
  expressResponse.cookie = (name, value, options) => {
    const serialized = serialize(name, String(value), options);
    const existing = res.getHeader("Set-Cookie");
    const cookies = Array.isArray(existing) ? existing.map(String) : existing ? [String(existing)] : [];
    res.setHeader("Set-Cookie", [...cookies, serialized]);
    return expressResponse;
  };
  expressResponse.clearCookie = (name, options) => {
    expressResponse.cookie(name, "", { ...options, maxAge: 0 });
    return expressResponse;
  };
  return {
    req: expressRequest,
    res: expressResponse,
    user: null
  };
}
var trpcHandler = createHTTPHandler({
  router: appRouter,
  basePath: "/api/trpc/",
  createContext: async ({ req, res }) => ({
    ...createVercelContext(req, res),
    user: await getAdminUser(req)
  })
});
function handler(req, res) {
  try {
    return trpcHandler(req, res);
  } catch (error) {
    console.error("[Vercel tRPC] Request failed", error);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: { message: "The server could not process this request." } }));
    }
  }
}
export {
  handler as default
};
