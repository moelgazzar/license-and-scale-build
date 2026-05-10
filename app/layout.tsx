import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Greenscape Pro | Closed-Lost Reactivation',
  description:
    'Closed-Lost Reactivation Control Center for Greenscape Pro - Marcus-voice re-engagement of cold leads with AI-drafted SMS, email, and call openers.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-stone-50 text-stone-900">
        <header className="border-b border-stone-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-600" />
              <span>Greenscape Pro</span>
              <span className="text-stone-400">/</span>
              <span className="text-stone-600 font-normal">Reactivation Control</span>
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              <NavLink href="/">Leads</NavLink>
              <NavLink href="/queue">Queue</NavLink>
              <NavLink href="/outbox">Outbox</NavLink>
              <NavLink href="/replies">Replies</NavLink>
              <NavLink href="/replies/simulate" emphasis>
                Simulate Reply
              </NavLink>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
        <footer className="mx-auto max-w-6xl px-6 pb-12 pt-4 text-xs text-stone-500">
          Internal tool. Customer-facing send is queued to Supabase outbox; production GHL/Twilio dispatch is a documented hookup.
        </footer>
      </body>
    </html>
  );
}

function NavLink({ href, children, emphasis = false }: { href: string; children: React.ReactNode; emphasis?: boolean }) {
  return (
    <Link
      href={href}
      className={
        emphasis
          ? 'rounded-md bg-stone-900 px-3 py-1.5 text-white hover:bg-stone-700'
          : 'rounded-md px-3 py-1.5 text-stone-700 hover:bg-stone-100'
      }
    >
      {children}
    </Link>
  );
}
