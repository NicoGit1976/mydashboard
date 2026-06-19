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
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar userName={userName} clients={clients} />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
