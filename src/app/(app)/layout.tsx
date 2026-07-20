import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getActor, visibleClientsWhere } from "@/lib/access";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // First-login gate: force a password change before anything else.
  if (session?.user?.id) {
    const u = await db.user.findUnique({
      where: { id: session.user.id },
      select: { mustChangePassword: true },
    });
    if (u?.mustChangePassword) redirect("/onboarding/password");
  }

  const actor = await getActor();
  const userName = session?.user?.name ?? actor?.username ?? "Utilisateur";
  const clients = actor
    ? await db.client.findMany({
        where: visibleClientsWhere(actor),
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, brandColor: true },
      })
    : [];

  return (
    <div className="flex min-h-screen">
      <Sidebar isAdmin={actor?.role === "SUPER_ADMIN"} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          userName={userName}
          clients={clients}
          isAdmin={actor?.role === "SUPER_ADMIN"}
        />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
