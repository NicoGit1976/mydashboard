import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
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

  const userName = session?.user?.name ?? session?.user?.email ?? "Utilisateur";
  const clients = session?.user?.id
    ? await db.client.findMany({
        where: { ownerId: session.user.id },
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, brandColor: true },
      })
    : [];

  return (
    <div className="flex min-h-screen">
      <Sidebar isAdmin={session?.user?.role === "ADMIN"} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          userName={userName}
          clients={clients}
          isAdmin={session?.user?.role === "ADMIN"}
        />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
