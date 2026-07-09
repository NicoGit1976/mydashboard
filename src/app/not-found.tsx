import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-bg px-4">
      <div className="w-full max-w-sm rounded-card border border-border/60 bg-surface p-8 text-center shadow-soft">
        <div className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-brand-soft text-brand">
          <Compass size={22} />
        </div>
        <h1 className="mt-4 text-base font-semibold text-ink">Page introuvable</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Ce contenu n&apos;existe pas ou n&apos;est plus accessible.
        </p>
        <Link
          href="/overview"
          className="mt-5 inline-block rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
        >
          Retour au tableau de bord
        </Link>
      </div>
    </div>
  );
}
