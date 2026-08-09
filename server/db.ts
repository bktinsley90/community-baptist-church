import { and, asc, desc, eq, gte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import {
  announcements,
  churchEvents,
  contactMessages,
  InsertAnnouncement,
  InsertChurchEvent,
  InsertContactMessage,
  InsertUser,
  users,
} from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the Drizzle instance so local tooling can run without a database.
export async function getDb() {
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

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;

  textFields.forEach(field => {
    if (user[field] !== undefined) {
      const value = user[field] ?? null;
      values[field] = value;
      updateSet[field] = value;
    }
  });

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onConflictDoUpdate({
    target: users.openId,
    set: updateSet,
  });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function listUpcomingEvents() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(churchEvents)
    .where(and(eq(churchEvents.isPublished, true), gte(churchEvents.eventStart, new Date())))
    .orderBy(asc(churchEvents.eventStart));
}

export async function listEventsForAdmin() {
  const db = await getDb();
  if (!db) throw unavailableDatabaseError();
  return db.select().from(churchEvents).orderBy(asc(churchEvents.eventStart));
}

export async function createChurchEvent(event: Pick<InsertChurchEvent, "title" | "eventStart" | "description" | "isPublished">) {
  const db = await getDb();
  if (!db) throw unavailableDatabaseError();
  const result = await db.insert(churchEvents).values(event);
  return { id: Number(result.lastInsertRowid) };
}

export async function deleteChurchEvent(id: number) {
  const db = await getDb();
  if (!db) throw unavailableDatabaseError();
  await db.delete(churchEvents).where(eq(churchEvents.id, id));
}

export async function listPublishedAnnouncements() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(announcements)
    .where(eq(announcements.isPublished, true))
    .orderBy(desc(announcements.publishedAt));
}

export async function listAnnouncementsForAdmin() {
  const db = await getDb();
  if (!db) throw unavailableDatabaseError();
  return db.select().from(announcements).orderBy(desc(announcements.publishedAt));
}

export async function createAnnouncement(announcement: Pick<InsertAnnouncement, "title" | "content" | "isPublished">) {
  const db = await getDb();
  if (!db) throw unavailableDatabaseError();
  const result = await db.insert(announcements).values(announcement);
  return { id: Number(result.lastInsertRowid) };
}

export async function deleteAnnouncement(id: number) {
  const db = await getDb();
  if (!db) throw unavailableDatabaseError();
  await db.delete(announcements).where(eq(announcements.id, id));
}

export async function createContactMessage(message: Pick<InsertContactMessage, "name" | "email" | "subject" | "message">) {
  const db = await getDb();
  if (!db) throw unavailableDatabaseError();
  const result = await db.insert(contactMessages).values(message);
  return { id: Number(result.lastInsertRowid) };
}

export async function updateContactMessageNotification(id: number, status: string, error: string | null = null) {
  const db = await getDb();
  if (!db) throw unavailableDatabaseError();
  await db
    .update(contactMessages)
    .set({ notificationStatus: status, notificationError: error })
    .where(eq(contactMessages.id, id));
}

export async function listContactMessagesForAdmin() {
  const db = await getDb();
  if (!db) throw unavailableDatabaseError();
  return db.select().from(contactMessages).orderBy(desc(contactMessages.receivedAt));
}
