import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/auth";
import { db } from "@/lib/db";

async function createClient(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect("/clients/new");
  const sector = String(formData.get("sector") ?? "").trim() || null;
  const brandColor = String(formData.get("brandColor") ?? "#4f46e5");

  // Logo upload → public/uploads (mount a Docker volume here in prod).
  let logoUrl: string | null = null;
  const logo = formData.get("logo");
  if (logo instanceof File && logo.size > 0) {
    const ext = (logo.name.split(".").pop() ?? "png").toLowerCase().replace(/[^a-z0-9]/g, "");
    const dir = path.join(process.cwd(), "public", "uploads");
    await mkdir(dir, { recursive: true });
    const fileName = `${randomUUID()}.${ext}`;
    await writeFile(path.join(dir, fileName), Buffer.from(await logo.arrayBuffer()));
    logoUrl = `/uploads/${fileName}`;
  }

  const client = await db.client.create({
    data: { ownerId: session.user.id, name, sector, brandColor, logoUrl },
  });

  revalidatePath("/clients");
  redirect(`/clients/${client.id}`);
}

export default function NewClientPage() {
  return (
    <div className="mx-auto max-w-xl px-6 py-6">
      <Link
        href="/clients"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft transition-colors hover:text-ink"
      >
        <ArrowLeft size={16} /> Clients
      </Link>

      <h1 className="mt-3 text-xl font-semibold tracking-tight text-ink">
        Nouveau client
      </h1>
      <p className="mt-1 text-sm text-ink-soft">
        Logo + couleur de marque — le rapport se brandera automatiquement.
      </p>

      <form
        action={createClient}
        className="mt-5 rounded-card border border-border/60 bg-surface p-6 shadow-soft"
      >
        <label className="block text-xs font-medium text-ink-soft">Nom du client</label>
        <input
          name="name"
          required
          className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-brand"
          placeholder="Maison Aurore"
        />

        <label className="mt-4 block text-xs font-medium text-ink-soft">
          Secteur <span className="text-muted">(optionnel)</span>
        </label>
        <input
          name="sector"
          className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-brand"
          placeholder="Hôtellerie & Spa"
        />

        <div className="mt-4 flex gap-4">
          <div>
            <label className="block text-xs font-medium text-ink-soft">Couleur</label>
            <input
              name="brandColor"
              type="color"
              defaultValue="#4f46e5"
              className="mt-1 h-10 w-16 cursor-pointer rounded-lg border border-border bg-white p-1"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-ink-soft">
              Logo <span className="text-muted">(optionnel)</span>
            </label>
            <input
              name="logo"
              type="file"
              accept="image/*"
              className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink-soft file:mr-3 file:rounded-md file:border-0 file:bg-brand-soft file:px-2 file:py-1 file:text-xs file:font-medium file:text-brand"
            />
          </div>
        </div>

        <button
          type="submit"
          className="mt-6 w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
        >
          Créer le client
        </button>
      </form>
    </div>
  );
}
