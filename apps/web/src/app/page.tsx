import Link from "next/link";
import { EphemeralNotice } from "@/components/WizardShell";

export default function WelcomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-4 py-8 sm:px-6">
      <p className="text-xs font-medium uppercase tracking-wide text-accent">Revenue Reality</p>
      <h1 className="mt-2 text-3xl font-semibold text-ink">Before the business, the life.</h1>
      <p className="mt-4 max-w-prose text-ink/80">
        Revenue Reality works backward from your life and your business to calculate what the
        model needs to produce. You will not be asked to guess a revenue goal — that number gets
        calculated, later, from what you tell us here.
      </p>
      <p className="mt-4 max-w-prose text-ink/80">
        We&rsquo;ll start with the life you&rsquo;re living now, then the life you&rsquo;re
        building toward. The business comes after.
      </p>

      <div className="mt-6">
        <EphemeralNotice />
      </div>

      <div className="mt-8">
        <Link
          href="/life/current"
          className="inline-block rounded-md bg-accent px-5 py-3 text-sm font-medium text-white hover:bg-accent/90"
        >
          Start with your life →
        </Link>
      </div>
    </main>
  );
}
