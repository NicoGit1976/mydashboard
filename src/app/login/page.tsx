"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { LayoutDashboard, Loader2 } from "lucide-react";

export default function LoginPage() {
  // Must stay named `identifier`: NextAuth silently drops credential keys that
  // aren't declared in the provider's `credentials` object.
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await signIn("credentials", { identifier, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      setError("Identifiant ou mot de passe incorrect.");
    } else {
      router.push("/overview");
      router.refresh();
    }
  }

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand text-white">
            <LayoutDashboard size={20} />
          </div>
          <span className="text-lg font-semibold tracking-tight text-ink">
            My<span className="text-brand">Dashboard</span>
          </span>
        </div>

        <form
          onSubmit={onSubmit}
          className="rounded-card border border-border/60 bg-surface p-6 shadow-soft"
        >
          <h1 className="text-base font-semibold text-ink">Connexion</h1>
          <p className="mt-1 text-sm text-ink-soft">Accède à tes rapports.</p>

          <label className="mt-5 block text-xs font-medium text-ink-soft">Identifiant</label>
          <input
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            required
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-brand"
            placeholder="identifiant ou email"
          />

          <label className="mt-4 block text-xs font-medium text-ink-soft">
            Mot de passe
          </label>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-brand"
            placeholder="••••••••"
          />

          {error && (
            <p className="mt-3 rounded-lg bg-negative-soft px-3 py-2 text-xs font-medium text-negative">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            Se connecter
          </button>

          <p className="mt-4 text-center text-[11px] leading-relaxed text-muted">
            Utilise les identifiants qui t&apos;ont été communiqués.
          </p>
        </form>
      </div>
    </div>
  );
}
