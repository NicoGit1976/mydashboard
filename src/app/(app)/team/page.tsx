import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { initials } from "@/lib/initials";
import CreateUserForm from "@/components/team/CreateUserForm";
import UserRowActions from "@/components/team/UserRowActions";

// ADMIN-only: manage who can use this MyDashboard instance. Members are
// fully partitioned — each one only ever sees their own clients.
export default async function TeamPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/overview");

  const users = await db.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      mustChangePassword: true,
      createdAt: true,
      _count: { select: { clients: true } },
    },
  });

  return (
    <div className="mx-auto max-w-3xl px-6 py-6">
      <h1 className="text-xl font-semibold tracking-tight text-ink">Équipe</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Crée des comptes pour tes proches — chacun gère ses clients dans son espace cloisonné.
      </p>

      <div className="mt-5">
        <CreateUserForm />
      </div>

      <div className="mt-4 rounded-card border border-border/60 bg-surface p-6 shadow-soft">
        <p className="text-sm font-semibold text-ink">
          Utilisateurs <span className="text-muted">({users.length})</span>
        </p>
        <div className="mt-3 space-y-2">
          {users.map((u) => (
            <div
              key={u.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-white p-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-xs font-bold text-brand">
                  {initials(u.name ?? u.email)}
                </div>
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 truncate text-sm font-medium text-ink">
                    {u.name ?? u.email}
                    {u.role === "ADMIN" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-1.5 py-0.5 text-[10px] font-semibold text-brand">
                        <ShieldCheck size={10} /> Admin
                      </span>
                    )}
                    {u.mustChangePassword && (
                      <span className="rounded-full bg-negative-soft px-1.5 py-0.5 text-[10px] font-medium text-negative">
                        1ʳᵉ connexion en attente
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {u.email} · {u._count.clients} client{u._count.clients > 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              {u.id !== session.user.id ? (
                <UserRowActions userId={u.id} />
              ) : (
                <span className="text-[11px] font-medium text-muted">C&apos;est toi</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
