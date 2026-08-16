import Link from "next/link";
import { APP, LEGAL_UPDATED } from "@/lib/legal";

// Frame for the public legal pages. No app chrome, no session: these are read
// by people who have no account — a platform reviewer, a client, a visitor.
export default function LegalShell({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-full bg-bg">
      <div className="mx-auto max-w-3xl px-6 py-14">
        <header className="border-b border-border pb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            {APP.name}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">
            {title}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">{intro}</p>
          <p className="mt-3 text-xs text-muted">
            Version en vigueur au {LEGAL_UPDATED}.
          </p>
        </header>

        <article className="py-8">{children}</article>

        <footer className="flex flex-wrap gap-x-5 gap-y-2 border-t border-border pt-6 text-xs text-muted">
          <Link href="/confidentialite" className="hover:text-ink-soft">
            Politique de confidentialité
          </Link>
          <Link href="/mentions-legales" className="hover:text-ink-soft">
            Mentions légales
          </Link>
          <Link href="/login" className="hover:text-ink-soft">
            Accès à l&apos;application
          </Link>
        </footer>
      </div>
    </div>
  );
}

// Section heading + body, so every legal page has the same rhythm.
export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-7">
      <h2 className="mb-2 text-base font-semibold text-ink">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-ink-soft">
        {children}
      </div>
    </section>
  );
}
