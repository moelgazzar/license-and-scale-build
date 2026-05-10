import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Greenscape Pro | Closed-Lost Reactivation Control Center',
  description:
    'Internal sales console that turns stale GHL leads into reviewed, personalized follow-up opportunities. Built for Greenscape Pro.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">
        <header className="sticky top-0 z-10 border-b border-[var(--color-hairline-soft)] bg-[var(--color-canvas)]/95 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
            <Link href="/" className="flex items-center gap-2.5">
              <span aria-hidden className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-rausch text-white text-xs font-bold">G</span>
              <span className="text-[15px] font-semibold tracking-tight text-[var(--color-ink)]">Greenscape Pro</span>
              <span className="text-[var(--color-muted-soft)]">·</span>
              <span className="text-[14px] text-[var(--color-muted)]">Reactivation Control</span>
            </Link>
            <nav className="flex items-center gap-1 text-[14px]">
              <NavLink href="/">Leads</NavLink>
              <NavLink href="/queue">Approval queue</NavLink>
              <NavLink href="/outbox">Outbox</NavLink>
              <NavLink href="/replies">Replies</NavLink>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
        <footer className="mx-auto max-w-6xl px-6 pb-12 pt-6">
          <p className="border-t border-[var(--color-hairline-soft)] pt-6 text-[12px] text-[var(--color-muted)]">
            Internal tool. Customer-facing send is queued to Supabase outbox; production GHL/Twilio dispatch is documented behind the <code className="rounded bg-[var(--color-surface-strong)] px-1 text-[11px]">GHL_SEND_ENABLED</code> flag.
          </p>
        </footer>
      </body>
    </html>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-md px-3 py-1.5 text-[var(--color-ink)] hover:bg-[var(--color-surface-soft)] font-medium"
    >
      {children}
    </Link>
  );
}
