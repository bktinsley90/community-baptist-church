import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { getSessionCookieOptions } from "./_core/cookies";
import { notifyOwner } from "./_core/notification";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, publicProcedure, router } from "./_core/trpc";
import {
  createAnnouncement,
  createChurchEvent,
  createContactMessage,
  deleteAnnouncement,
  deleteChurchEvent,
  listAnnouncementsForAdmin,
  listContactMessagesForAdmin,
  listEventsForAdmin,
  listPublishedAnnouncements,
  listUpcomingEvents,
  updateContactMessageNotification,
} from "./db";
import { sendContactMessageEmail } from "./contactEmail";
import { authenticateAdmin, createAdminSession } from "./_core/localAuth";

const eventInput = z.object({
  title: z.string().trim().min(3).max(160),
  eventStart: z.coerce.date(),
  description: z.string().trim().min(12).max(2_000),
  isPublished: z.boolean().default(true),
});

const announcementInput = z.object({
  title: z.string().trim().min(3).max(180),
  content: z.string().trim().min(12).max(4_000),
  isPublished: z.boolean().default(true),
});

const contactInput = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(320),
  subject: z.string().trim().min(3).max(180),
  message: z.string().trim().min(10).max(5_000),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    login: publicProcedure.input(z.object({ email: z.string().trim().email(), password: z.string().min(1) })).mutation(async ({ input, ctx }) => {
      const admin = authenticateAdmin(input.email, input.password);
      if (!admin) throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password." });
      const token = await createAdminSession(admin.email);
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: 8 * 60 * 60 * 1000 });
      return { success: true } as const;
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  content: router({
    events: router({
      upcoming: publicProcedure.query(() => listUpcomingEvents()),
      adminList: adminProcedure.query(() => listEventsForAdmin()),
      create: adminProcedure.input(eventInput).mutation(({ input }) => createChurchEvent(input)),
      delete: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ input }) => deleteChurchEvent(input.id)),
    }),
    announcements: router({
      latest: publicProcedure.query(() => listPublishedAnnouncements()),
      adminList: adminProcedure.query(() => listAnnouncementsForAdmin()),
      create: adminProcedure.input(announcementInput).mutation(({ input }) => createAnnouncement(input)),
      delete: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ input }) => deleteAnnouncement(input.id)),
    }),
  }),
  contact: router({
    submit: publicProcedure.input(contactInput).mutation(async ({ input }) => {
      const storedMessage = await createContactMessage(input);
      const emailResult = await sendContactMessageEmail(input);

      await updateContactMessageNotification(
        storedMessage.id,
        emailResult.sent ? "sent" : "pending",
        emailResult.error,
      );

      try {
        await notifyOwner({
          title: "New Community Baptist Church contact message",
          content: `${input.name} (${input.email}) submitted “${input.subject}”.`,
        });
      } catch (error) {
        console.warn("[Contact] Owner notification could not be delivered", error);
      }

      return { success: true, emailNotificationSent: emailResult.sent };
    }),
    adminList: adminProcedure.query(() => listContactMessagesForAdmin()),
  }),
});

export type AppRouter = typeof appRouter;
