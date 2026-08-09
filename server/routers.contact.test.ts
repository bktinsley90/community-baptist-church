import { describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  createContactMessage: vi.fn().mockResolvedValue({ id: 42 }),
  updateContactMessageNotification: vi.fn().mockResolvedValue(undefined),
  listUpcomingEvents: vi.fn().mockResolvedValue([]),
  listEventsForAdmin: vi.fn(),
  createChurchEvent: vi.fn(),
  deleteChurchEvent: vi.fn(),
  listPublishedAnnouncements: vi.fn().mockResolvedValue([]),
  listAnnouncementsForAdmin: vi.fn(),
  createAnnouncement: vi.fn(),
  deleteAnnouncement: vi.fn(),
  listContactMessagesForAdmin: vi.fn(),
}));

vi.mock("./db", () => dbMocks);
vi.mock("./contactEmail", () => ({ sendContactMessageEmail: vi.fn().mockResolvedValue({ sent: true, error: null }) }));
vi.mock("./_core/notification", () => ({ notifyOwner: vi.fn().mockResolvedValue(true) }));

import { appRouter } from "./routers";

describe("public church content procedures", () => {
  const caller = appRouter.createCaller({ user: null } as never);

  it("returns database-backed upcoming events", async () => {
    dbMocks.listUpcomingEvents.mockResolvedValueOnce([{ id: 1, title: "Prayer Gathering" }]);
    await expect(caller.content.events.upcoming()).resolves.toEqual([{ id: 1, title: "Prayer Gathering" }]);
  });

  it("rejects invalid contact input before storage", async () => {
    await expect(caller.contact.submit({ name: "A", email: "not-an-email", subject: "Hi", message: "Short" })).rejects.toThrow();
    expect(dbMocks.createContactMessage).not.toHaveBeenCalled();
  });

  it("stores a valid contact message and tracks notification delivery", async () => {
    await expect(caller.contact.submit({ name: "Jordan Smith", email: "jordan@example.org", subject: "Prayer request", message: "Please keep my family in prayer." })).resolves.toEqual({ success: true, emailNotificationSent: true });
    expect(dbMocks.createContactMessage).toHaveBeenCalledWith({ name: "Jordan Smith", email: "jordan@example.org", subject: "Prayer request", message: "Please keep my family in prayer." });
    expect(dbMocks.updateContactMessageNotification).toHaveBeenCalledWith(42, "sent", null);
  });
});
