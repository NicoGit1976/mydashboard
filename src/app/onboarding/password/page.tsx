import { redirect } from "next/navigation";
import { LayoutDashboard } from "lucide-react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import OnboardingPasswordForm from "@/components/OnboardingPasswordForm";

// Standalone (no app chrome). The (app) layout redirects here while the user's
// mustChangePassword flag is set; the form clears it and sends them to /overview.
export default async function OnboardingPasswordPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Not mid-first-login → nothing to do here (and the no-current-password form
  // must not be reachable for established accounts).
  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user?.mustChangePassword) redirect("/overview");

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
        <OnboardingPasswordForm />
      </div>
    </div>
  );
}
