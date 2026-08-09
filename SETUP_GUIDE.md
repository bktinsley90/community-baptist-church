# Community Baptist Church Website Guide

## Overview

This project is a **single-page React application** backed by an Express and tRPC server. The public site is available at `/`; the protected staff content manager is available at `/admin`. The current implementation uses local email/password authentication with a signed, HTTP-only session cookie and can be deployed with standard environment variables.

The visual system uses only the five supplied brand variables: `--royal-purple`, `--dark-purple`, `--gold`, `--dark-gold`, and `--light-purple`. The supplied church logo is served from managed storage and reused in the header, hero, and footer.

| Area | Location | Purpose |
|---|---|---|
| Public website | `/` | Header, hero, About, events, announcements, and contact form. |
| Content manager | `/admin` | Staff-only interface for events, announcements, and received messages. |
| Events | `church_events` | Publishes future gatherings to the public events section. |
| Announcements | `announcements` | Publishes church news and updates to the public page. |
| Contact messages | `contact_messages` | Stores every valid contact form submission and its notification status. |

## Managing Website Content

Open `/admin` and sign in with `ADMIN_EMAIL` and `ADMIN_PASSWORD`. Staff can add an event title, date and time, description, and publication status. Published future events appear automatically in the public **Upcoming Events** section. Staff can also publish announcements, save drafts, remove unneeded items, and read received contact messages.

Set `JWT_SECRET` to a random value of at least 32 characters. Configure `ADMIN_EMAIL` and
`ADMIN_PASSWORD` in `.env.local` for local development or as deployment secrets in production.

> Contact form submissions are validated before they are stored. A submission requires a name, valid email address, subject, and message.

## Enabling Administrator Email Notifications Later

The contact-message server flow is prepared to send a notification to the configured administrator. It is currently deferred until a valid Resend key is added. Once a working key is available, add the following values in the project **Settings → Secrets** panel.

| Secret | Required value |
|---|---|
| `RESEND_API_KEY` | A current Resend API key authorized to send messages. |
| `RESEND_FROM_EMAIL` | A sender address accepted by the connected Resend account. |
| `CHURCH_ADMIN_EMAIL` | The church office inbox that should receive new-contact notifications. |
| `EMAIL_NOTIFICATIONS_ENABLED` | Set to `true` only after the three values above have been verified. |

Each successful submission persists the message first. When `EMAIL_NOTIFICATIONS_ENABLED` is set to `true` with a verified Resend configuration, the server then sends an email including the sender’s name, email, subject, and message. Until that setting is enabled, no outbound email is attempted and the contact record remains stored with a pending notification status for staff review. Resend’s API uses server-side API-key authentication; use its official documentation when replacing the key or sender configuration.[1]

## Local Development and Validation

Run the following commands from the project root when working locally.

The server loads `.env.local` automatically. Manus OAuth variables are no longer required.

```bash
pnpm dev
pnpm vitest run server/auth.logout.test.ts server/contactEmail.test.ts server/routers.contact.test.ts
pnpm exec tsc --noEmit
pnpm build
```

The current implementation has passed the focused feature test suite, TypeScript validation, a production build, and visual checks at desktop and mobile widths. The Resend credential check remains intentionally deferred until a valid API key is supplied.

## Future Database Changes

When you add more database fields or tables, update `drizzle/schema.ts`, run `pnpm drizzle-kit generate`, inspect the newly generated SQL migration, and apply the reviewed migration. The public pages read content through server procedures rather than hardcoded event or announcement data.


## References

[1] [Resend API Reference — Introduction](https://resend.com/docs/api-reference/introduction)
