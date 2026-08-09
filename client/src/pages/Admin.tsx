import { FormEvent, useState } from "react";
import { ArrowLeft, CalendarDays, LogIn, ShieldCheck, Trash2 } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

const blankEvent = { title: "", eventStart: "", description: "", isPublished: true };
const blankAnnouncement = { title: "", content: "", isPublished: true };

function displayDate(value: Date | string) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function Admin() {
  const { user, loading, isAuthenticated } = useAuth();
  const [eventForm, setEventForm] = useState(blankEvent);
  const [announcementForm, setAnnouncementForm] = useState(blankAnnouncement);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const isAdmin = isAuthenticated && user?.role === "admin";
  const utils = trpc.useUtils();
  const loginMutation = trpc.auth.login.useMutation({ onSuccess: () => utils.auth.me.invalidate() });
  const eventsQuery = trpc.content.events.adminList.useQuery(undefined, { enabled: isAdmin });
  const announcementsQuery = trpc.content.announcements.adminList.useQuery(undefined, { enabled: isAdmin });
  const messagesQuery = trpc.contact.adminList.useQuery(undefined, { enabled: isAdmin });

  const createEvent = trpc.content.events.create.useMutation({
    onSuccess: async () => {
      setEventForm(blankEvent);
      await Promise.all([utils.content.events.adminList.invalidate(), utils.content.events.upcoming.invalidate()]);
    },
  });
  const deleteEvent = trpc.content.events.delete.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.content.events.adminList.invalidate(), utils.content.events.upcoming.invalidate()]);
    },
  });
  const createAnnouncement = trpc.content.announcements.create.useMutation({
    onSuccess: async () => {
      setAnnouncementForm(blankAnnouncement);
      await Promise.all([utils.content.announcements.adminList.invalidate(), utils.content.announcements.latest.invalidate()]);
    },
  });
  const deleteAnnouncement = trpc.content.announcements.delete.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.content.announcements.adminList.invalidate(), utils.content.announcements.latest.invalidate()]);
    },
  });

  const saveEvent = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createEvent.mutate({ ...eventForm, eventStart: new Date(eventForm.eventStart) });
  };
  const saveAnnouncement = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createAnnouncement.mutate(announcementForm);
  };

  const submitLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    loginMutation.mutate(loginForm);
  };

  if (loading) return <div className="admin-loading">Loading church content manager…</div>;

  if (!isAuthenticated) {
    return (
      <main className="admin-gate">
        <div>
          <ShieldCheck size={38} aria-hidden="true" />
          <p className="eyebrow eyebrow-purple">Staff access</p>
          <h1>Church content manager</h1>
          <p>Sign in with the church administrator account to manage events, announcements, and contact messages.</p>
          <form className="manager-form" onSubmit={submitLogin}>
            <label><span>Email</span><input required type="email" autoComplete="username" value={loginForm.email} onChange={event => setLoginForm(form => ({ ...form, email: event.target.value }))} /></label>
            <label><span>Password</span><input required type="password" autoComplete="current-password" value={loginForm.password} onChange={event => setLoginForm(form => ({ ...form, password: event.target.value }))} /></label>
            {loginMutation.isError && <p className="form-error" role="alert">Invalid email or password.</p>}
            <button className="button button-purple" disabled={loginMutation.isPending} type="submit"><LogIn size={18} /> {loginMutation.isPending ? "Signing in…" : "Sign in"}</button>
          </form>
          <a className="text-link" href="/"><ArrowLeft size={16} /> Return to website</a>
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="admin-gate">
        <div>
          <ShieldCheck size={38} aria-hidden="true" />
          <p className="eyebrow eyebrow-purple">Staff access</p>
          <h1>Access restricted</h1>
          <p>Your account is signed in but has not been assigned the church administrator role.</p>
          <a className="button button-purple" href="/"><ArrowLeft size={18} /> Return to website</a>
        </div>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <header className="admin-header"><div className="site-shell"><a href="/"><ArrowLeft size={17} /> View public website</a><span>Signed in as {user?.name ?? "Church Administrator"}</span></div></header>
      <div className="site-shell admin-content">
        <div className="admin-intro"><p className="eyebrow eyebrow-purple">Content manager</p><h1>Keep your congregation informed.</h1><p>Changes publish to the public website immediately when the item is marked published.</p></div>
        <div className="admin-grid">
          <section className="admin-panel">
            <div className="admin-panel-title"><CalendarDays size={20} /><h2>Add upcoming event</h2></div>
            <form onSubmit={saveEvent} className="manager-form">
              <label><span>Event title</span><input required value={eventForm.title} onChange={event => setEventForm(form => ({ ...form, title: event.target.value }))} /></label>
              <label><span>Date and time</span><input required type="datetime-local" value={eventForm.eventStart} onChange={event => setEventForm(form => ({ ...form, eventStart: event.target.value }))} /></label>
              <label><span>Description</span><textarea required rows={4} value={eventForm.description} onChange={event => setEventForm(form => ({ ...form, description: event.target.value }))} /></label>
              <label className="check-label"><input type="checkbox" checked={eventForm.isPublished} onChange={event => setEventForm(form => ({ ...form, isPublished: event.target.checked }))} /> Publish immediately</label>
              <button className="button button-purple" disabled={createEvent.isPending} type="submit">{createEvent.isPending ? "Saving…" : "Save event"}</button>
            </form>
            <div className="manager-list">
              {eventsQuery.data?.map(event => <article key={event.id}><div><strong>{event.title}</strong><small>{displayDate(event.eventStart)} · {event.isPublished ? "Published" : "Draft"}</small></div><button type="button" aria-label={`Delete ${event.title}`} onClick={() => deleteEvent.mutate({ id: event.id })}><Trash2 size={16} /></button></article>)}
              {eventsQuery.data?.length === 0 && <p>No events have been added yet.</p>}
            </div>
          </section>
          <section className="admin-panel">
            <div className="admin-panel-title"><ShieldCheck size={20} /><h2>Add announcement</h2></div>
            <form onSubmit={saveAnnouncement} className="manager-form">
              <label><span>Headline</span><input required value={announcementForm.title} onChange={event => setAnnouncementForm(form => ({ ...form, title: event.target.value }))} /></label>
              <label><span>Announcement</span><textarea required rows={5} value={announcementForm.content} onChange={event => setAnnouncementForm(form => ({ ...form, content: event.target.value }))} /></label>
              <label className="check-label"><input type="checkbox" checked={announcementForm.isPublished} onChange={event => setAnnouncementForm(form => ({ ...form, isPublished: event.target.checked }))} /> Publish immediately</label>
              <button className="button button-purple" disabled={createAnnouncement.isPending} type="submit">{createAnnouncement.isPending ? "Saving…" : "Save announcement"}</button>
            </form>
            <div className="manager-list">
              {announcementsQuery.data?.map(announcement => <article key={announcement.id}><div><strong>{announcement.title}</strong><small>{announcement.isPublished ? "Published" : "Draft"}</small></div><button type="button" aria-label={`Delete ${announcement.title}`} onClick={() => deleteAnnouncement.mutate({ id: announcement.id })}><Trash2 size={16} /></button></article>)}
              {announcementsQuery.data?.length === 0 && <p>No announcements have been added yet.</p>}
            </div>
          </section>
        </div>
        <section className="admin-panel message-panel">
          <div className="admin-panel-title"><ShieldCheck size={20} /><h2>Contact messages</h2></div>
          <div className="message-list">
            {messagesQuery.data?.map(message => <article key={message.id}><div><strong>{message.subject}</strong><small>{message.name} · {message.email} · {displayDate(message.receivedAt)}</small></div><p>{message.message}</p><span className="notification-state">Email notification: {message.notificationStatus}</span></article>)}
            {messagesQuery.data?.length === 0 && <p>No contact messages have been received yet.</p>}
          </div>
        </section>
      </div>
    </main>
  );
}
