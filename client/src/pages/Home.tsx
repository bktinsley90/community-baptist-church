import { FormEvent, useEffect, useState } from "react";
import { ArrowRight, BookOpen, CalendarDays, ChevronDown, Mail, Menu, Sparkles, X } from "lucide-react";
import { trpc } from "@/lib/trpc";

const logoUrl = "/community-baptist-church-logo.png";

const navLinks = [
  ["About", "#about"],
  ["Events", "#events"],
  ["Announcements", "#announcements"],
] as const;

const initialContactForm = { name: "", email: "", subject: "", message: "" };

function formatDateTime(value: Date | string) {
  const date = new Date(value);
  return {
    day: new Intl.DateTimeFormat("en-US", { day: "2-digit" }).format(date),
    month: new Intl.DateTimeFormat("en-US", { month: "short" }).format(date),
    detail: new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date),
  };
}

function useRevealEffects() {
  useEffect(() => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>(".reveal"));
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.14 },
    );
    elements.forEach(element => observer.observe(element));
    return () => observer.disconnect();
  }, []);
}

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [contactForm, setContactForm] = useState(initialContactForm);
  const eventsQuery = trpc.content.events.upcoming.useQuery();
  const announcementsQuery = trpc.content.announcements.latest.useQuery();
  const contactMutation = trpc.contact.submit.useMutation({ onSuccess: () => setContactForm(initialContactForm) });

  useRevealEffects();

  const submitContactForm = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    contactMutation.mutate(contactForm);
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="church-site">
      <header className="site-header">
        <div className="site-shell header-inner">
          <a className="brand-lockup" href="#top" aria-label="Community Baptist Church home" onClick={closeMenu}>
            <img src={logoUrl} alt="Community Baptist Church logo" className="brand-logo" />
            <span><strong>Community</strong><small>Baptist Church</small></span>
          </a>
          <button className="menu-toggle" type="button" aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-expanded={menuOpen} onClick={() => setMenuOpen(open => !open)}>
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <nav className={`site-nav ${menuOpen ? "is-open" : ""}`} aria-label="Primary navigation">
            {navLinks.map(([label, href]) => <a key={href} href={href} onClick={closeMenu}>{label}</a>)}
            <a className="nav-cta" href="#contact" onClick={closeMenu}>Let’s Connect</a>
          </nav>
        </div>
      </header>

      <main id="top">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-ornament hero-ornament-left" aria-hidden="true" />
          <div className="hero-ornament hero-ornament-right" aria-hidden="true" />
          <div className="site-shell hero-grid">
            <div className="hero-copy reveal is-visible">
              <p className="eyebrow"><Sparkles size={15} aria-hidden="true" /> Rooted in faith. Growing in grace.</p>
              <h1 id="hero-title">A community strengthened through Christ.</h1>
              <p className="hero-lede">Community Baptist Church is a place to worship, serve, and find belonging as we follow Jesus together.</p>
              <div className="hero-actions">
                <a className="button button-gold" href="#join">Join Us Sunday <ArrowRight size={18} aria-hidden="true" /></a>
                <a className="button button-quiet" href="#about">Discover our heart <ChevronDown size={18} aria-hidden="true" /></a>
              </div>
            </div>
            <aside className="hero-card reveal" aria-label="Community Baptist Church welcome">
              <div className="hero-card-logo-wrap"><img src={logoUrl} alt="" className="hero-card-logo" /></div>
              <p className="scripture-reference">Philippians 4:13</p>
              <blockquote>“I can do all things through Christ who strengthens me.”</blockquote>
            </aside>
          </div>
        </section>

        <section id="join" className="join-section section" aria-labelledby="join-title">
          <div className="site-shell join-content">
            <div className="section-heading join-heading reveal"><p className="eyebrow eyebrow-purple">Gather with us</p><h2 id="join-title">Join us This Week</h2></div>
            <div className="schedule-grid reveal">
              <article className="schedule-card"><CalendarDays size={24} aria-hidden="true" /><div><h3>Sunday Worship</h3><p>9:00am</p></div></article>
              <article className="schedule-card"><BookOpen size={24} aria-hidden="true" /><div><h3>Bible Study</h3><p>Wednesday 7:00pm</p></div></article>
            </div>
            <address className="church-address reveal">297 Fuller Road<br />Spartanburg, SC 29302</address>
          </div>
        </section>

        <section id="about" className="about-section section" aria-labelledby="about-title">
          <div className="site-shell about-grid">
            <div className="section-heading reveal"><p className="eyebrow eyebrow-purple">Our foundation</p><h2 id="about-title">A church family for every season of life.</h2></div>
            <div className="about-copy reveal">
              <p>We gather as a Christ-centered community committed to worship, prayer, biblical teaching, and care for one another. Whoever you are and wherever you are in your journey, there is room for you here.</p>
              <div className="value-grid">
                <article className="value-card"><span>01</span><h3>Our mission</h3><p>To share Christ’s love through worship, service, and authentic community.</p></article>
                <article className="value-card"><span>02</span><h3>Our vision</h3><p>To see lives renewed by faith and neighborhoods strengthened by hope.</p></article>
                <article className="value-card"><span>03</span><h3>Our values</h3><p>Grace, truth, compassion, discipleship, and joyful service guide our life together.</p></article>
              </div>
            </div>
          </div>
        </section>

        <section id="events" className="events-section section" aria-labelledby="events-title">
          <div className="site-shell">
            <div className="section-heading section-heading-row reveal"><div><p className="eyebrow">Gather with us</p><h2 id="events-title">Upcoming events</h2></div><p>Meaningful moments, shared together.</p></div>
            <div className="event-grid reveal">
              {eventsQuery.isLoading && <p className="loading-copy">Preparing upcoming gatherings…</p>}
              {eventsQuery.isError && <p className="status-copy">Upcoming events are temporarily unavailable. Please check back soon.</p>}
              {!eventsQuery.isLoading && !eventsQuery.isError && eventsQuery.data?.length === 0 && <p className="empty-copy">New gatherings will be shared here soon. We look forward to seeing you.</p>}
              {eventsQuery.data?.map(event => {
                const date = formatDateTime(event.eventStart);
                return <article className="event-card" key={event.id}><div className="event-date" aria-label={date.detail}><strong>{date.day}</strong><span>{date.month}</span></div><div><p className="event-time"><CalendarDays size={16} aria-hidden="true" /> {date.detail}</p><h3>{event.title}</h3><p>{event.description}</p></div></article>;
              })}
            </div>
          </div>
        </section>

        <section id="announcements" className="announcements-section section" aria-labelledby="announcements-title">
          <div className="site-shell announcements-grid">
            <div className="section-heading reveal"><p className="eyebrow eyebrow-purple">Stay connected</p><h2 id="announcements-title">Announcements</h2><p>Church news, encouragement, and the updates that keep our community connected.</p></div>
            <div className="announcement-list reveal">
              {announcementsQuery.isLoading && <p className="loading-copy purple-copy">Loading the latest updates…</p>}
              {announcementsQuery.isError && <p className="status-copy purple-copy">Announcements are temporarily unavailable. Please check back soon.</p>}
              {!announcementsQuery.isLoading && !announcementsQuery.isError && announcementsQuery.data?.length === 0 && <p className="empty-copy purple-copy">Our latest news and community updates will be posted here.</p>}
              {announcementsQuery.data?.map((announcement, index) => <article className="announcement" key={announcement.id}><span>0{index + 1}</span><div><p className="announcement-date">{new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(new Date(announcement.publishedAt))}</p><h3>{announcement.title}</h3><p>{announcement.content}</p></div></article>)}
            </div>
          </div>
        </section>

        <section id="contact" className="contact-section section" aria-labelledby="contact-title">
          <div className="site-shell contact-grid">
            <div className="contact-copy reveal"><p className="eyebrow">Let’s connect</p><h2 id="contact-title">How can we pray for or serve you?</h2><p>Send us a message and a member of our church team will follow up. Your message is received privately by the church office.</p><div className="contact-note"><Mail size={19} aria-hidden="true" /> We would be honored to hear from you.</div></div>
            <form className="contact-form reveal" onSubmit={submitContactForm}>
              <div className="form-row"><label><span>Name</span><input required value={contactForm.name} onChange={event => setContactForm(form => ({ ...form, name: event.target.value }))} /></label><label><span>Email</span><input required type="email" value={contactForm.email} onChange={event => setContactForm(form => ({ ...form, email: event.target.value }))} /></label></div>
              <label><span>Subject</span><input required value={contactForm.subject} onChange={event => setContactForm(form => ({ ...form, subject: event.target.value }))} /></label>
              <label><span>Message</span><textarea required rows={5} value={contactForm.message} onChange={event => setContactForm(form => ({ ...form, message: event.target.value }))} /></label>
              {contactMutation.isSuccess && contactMutation.data?.emailNotificationSent && <p className="form-success" role="status">Thank you. Your message has been received and the church office has been notified.</p>}
              {contactMutation.isSuccess && contactMutation.data && !contactMutation.data.emailNotificationSent && <p className="form-error" role="alert">Your message was received, but the church office email could not be delivered. Please contact the church directly.</p>}
              {contactMutation.isError && <p className="form-error" role="alert">We could not send your message just now. Please try again in a moment.</p>}
              <button className="button button-gold" disabled={contactMutation.isPending} type="submit">{contactMutation.isPending ? "Sending your message…" : "Send message"} <ArrowRight size={18} aria-hidden="true" /></button>
            </form>
          </div>
        </section>
      </main>

      <footer className="site-footer"><div className="site-shell footer-inner"><a className="brand-lockup" href="#top" aria-label="Back to top"><img src={logoUrl} alt="" className="brand-logo" /><span><strong>Community</strong><small>Baptist Church</small></span></a><p>© 2025 Community Baptist Church. All rights reserved.<br />“I can do all things through Christ who strengthens me.” - Philippians 4:13</p><a className="staff-link" href="/admin">Staff content manager</a></div></footer>
    </div>
  );
}
