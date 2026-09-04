import Link from "next/link";
import type { ReactNode } from "react";

export interface WizardShellProps {
  eyebrow: string;
  title: string;
  intro?: ReactNode;
  backHref?: string;
  nextHref?: string;
  nextLabel?: string;
  children: ReactNode;
}

/** Shared page frame: title, optional intro, a visible Back action, and Next. */
export function WizardShell({ eyebrow, title, intro, backHref, nextHref, nextLabel = "Continue", children }: WizardShellProps) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <p className="text-xs font-medium uppercase tracking-wide text-accent">{eyebrow}</p>
      <h1 className="mt-1 text-2xl font-semibold text-ink">{title}</h1>
      {intro && <div className="mt-3 max-w-prose text-ink/80">{intro}</div>}

      <div className="mt-6 flex flex-col gap-4">{children}</div>

      <nav className="mt-8 flex items-center justify-between border-t border-ink/10 pt-6" aria-label="Wizard navigation">
        {backHref ? (
          <Link
            href={backHref}
            className="rounded-md border border-ink/25 px-4 py-2 text-sm font-medium text-ink hover:bg-ink/5"
          >
            ← Back
          </Link>
        ) : (
          <span />
        )}
        {nextHref && (
          <Link
            href={nextHref}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90"
          >
            {nextLabel} →
          </Link>
        )}
      </nav>
    </main>
  );
}

/** Persistent, honest disclosure — required by the Milestone 2 persistence gate. */
export function EphemeralNotice() {
  return (
    <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900" role="status">
      Nothing you enter here is saved yet. This will start persisting once account sign-in and
      the approved data-security controls are in place.
    </p>
  );
}
