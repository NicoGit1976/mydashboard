import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getActor } from "@/lib/access";
import { updateAgency } from "@/lib/user-actions";
import { initials } from "@/lib/initials";
import ChangePasswordForm from "@/components/settings/ChangePasswordForm";

export default async function SettingsPage() {
  const session = await auth();
  const name = session?.user?.name ?? "Utilisateur";
  const actor = await getActor();
  const email = actor?.username ?? session?.user?.email ?? "—";
  const user = session?.user?.id
    ? await db.user.findUnique({ where: { id: session.user.id } })
    : null;

  return (
    <div className="mx-auto max-w-xl px-6 py-6">
      <h1 className="text-xl font-semibold tracking-tight text-ink">Réglages</h1>

      <section className="mt-5 rounded-card border border-border/60 bg-surface p-6 shadow-soft">
        <p className="text-sm font-semibold text-ink">Profil</p>
        <div className="mt-3 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-full bg-brand text-sm font-semibold text-white">
            {initials(name)}
          </div>
          <div>
            <p className="text-sm font-medium text-ink">{name}</p>
            <p className="text-xs text-muted">{email}</p>
          </div>
        </div>
      </section>

      <section className="mt-4 rounded-card border border-border/60 bg-surface p-6 shadow-soft">
        <p className="text-sm font-semibold text-ink">Mot de passe</p>
        <p className="mb-3 mt-0.5 text-xs text-muted">
          Remplace le mot de passe de démonstration par le tien.
        </p>
        <ChangePasswordForm />
      </section>

      <section className="mt-4 rounded-card border border-border/60 bg-surface p-6 shadow-soft">
        <p className="text-sm font-semibold text-ink">Signature des rapports</p>
        <p className="mb-3 mt-0.5 text-xs text-muted">
          Ton logo d'agence + une mention, affichés en pied de chaque rapport (et dans le PDF).
        </p>
        <form action={updateAgency}>
          <label className="block text-xs font-medium text-ink-soft">Nom de l'agence</label>
          <input
            name="agencyName"
            defaultValue={user?.agencyName ?? ""}
            placeholder="NSG Consulting"
            className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-brand"
          />
          <label className="mt-4 block text-xs font-medium text-ink-soft">
            Mention de pied de page
          </label>
          <input
            name="footerNote"
            defaultValue={user?.footerNote ?? ""}
            placeholder="Rapport confidentiel — réalisé par NSG Consulting"
            className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-brand"
          />
          <label className="mt-4 block text-xs font-medium text-ink-soft">
            Logo d'agence <span className="text-muted">(optionnel)</span>
          </label>
          <div className="mt-1 flex items-center gap-3">
            {user?.agencyLogo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.agencyLogo} alt="Logo agence" className="h-9 w-auto max-w-[120px] object-contain" />
            )}
            <input
              name="agencyLogo"
              type="file"
              accept="image/*"
              className="text-sm text-ink-soft file:mr-3 file:rounded-md file:border-0 file:bg-brand-soft file:px-2 file:py-1 file:text-xs file:font-medium file:text-brand"
            />
          </div>
          <button
            type="submit"
            className="mt-5 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            Enregistrer la signature
          </button>
        </form>
      </section>

      <section className="mt-4 rounded-card border border-border/60 bg-surface p-6 shadow-soft">
        <p className="text-sm font-semibold text-ink">À propos</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted">
          MyDashboard — ton studio de reporting social & web. Tes rapports, tes données, ton PDF.
          Zéro abonnement tiers.
        </p>
      </section>
    </div>
  );
}
