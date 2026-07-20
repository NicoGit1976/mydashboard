import type { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { db } from "@/lib/db";

// THE access model. Every query that reads or writes a client — or anything
// hanging off one — must go through this module. A literal `ownerId` filter
// anywhere else is a bug: it silently ignores invitations.
//
//   SUPER_ADMIN  sees everything, manages accounts.
//   ADMIN        owns clients, invites members onto them. Never sees another
//                admin's clients: "private" is simply "not shared".
//   MEMBER       only sees clients they were invited to. Cannot create or
//                delete clients.

export type Role = "SUPER_ADMIN" | "ADMIN" | "MEMBER";
export type Actor = { id: string; role: Role; username: string | null; name: string | null };

export type Level = "view" | "edit" | "manage";

function asRole(v: string | null | undefined): Role {
  return v === "SUPER_ADMIN" || v === "ADMIN" ? v : "MEMBER";
}

// Role is read from the DB, never from the JWT: the token is minted at sign-in
// and lives for weeks, so a demoted account would keep its old powers until it
// expired.
export async function getActor(): Promise<Actor | null> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  const u = await db.user.findUnique({
    where: { id },
    select: { id: true, role: true, username: true, name: true },
  });
  if (!u) return null;
  return { id: u.id, role: asRole(u.role), username: u.username, name: u.name };
}

export async function requireActor(): Promise<Actor> {
  const actor = await getActor();
  if (!actor) throw new Error("UNAUTHENTICATED");
  return actor;
}

export function isSuperAdmin(actor: Actor) {
  return actor.role === "SUPER_ADMIN";
}

// Can this actor own clients at all? Members work on other people's clients.
export function canCreateClients(actor: Actor) {
  return actor.role === "SUPER_ADMIN" || actor.role === "ADMIN";
}

export function canManageUsers(actor: Actor) {
  return actor.role === "SUPER_ADMIN";
}

// ---------------------------------------------------------------------------
// The predicate. Everything else is derived from it.

export function visibleClientsWhere(actor: Actor): Prisma.ClientWhereInput {
  if (actor.role === "SUPER_ADMIN") return {};
  return {
    OR: [{ ownerId: actor.id }, { assignments: { some: { userId: actor.id } } }],
  };
}

export function visibleReportsWhere(actor: Actor): Prisma.ReportWhereInput {
  if (actor.role === "SUPER_ADMIN") return {};
  return { client: visibleClientsWhere(actor) };
}

// ---------------------------------------------------------------------------
// Guards. They return the row so callers don't re-query, and null when the
// actor may not act at that level — callers turn that into notFound()/message.

export async function getClientFor(
  actor: Actor,
  clientId: string,
  level: Level = "view",
) {
  const client = await db.client.findFirst({
    where: { AND: [{ id: clientId }, visibleClientsWhere(actor)] },
    include: { assignments: { select: { userId: true } } },
  });
  if (!client) return null;
  if (level === "view") return client;

  // Assignees may work on a client (reports, widgets, sources, share links)
  // but never delete it or change who else can see it.
  const owns = client.ownerId === actor.id || actor.role === "SUPER_ADMIN";
  if (level === "manage") return owns ? client : null;
  return client; // "edit": visibility already implies it
}

export async function getReportClientFor(
  actor: Actor,
  reportId: string,
  level: Level = "edit",
) {
  const report = await db.report.findUnique({ where: { id: reportId } });
  if (!report) return null;
  const client = await getClientFor(actor, report.clientId, level);
  return client ? { report, client } : null;
}

export async function getWidgetClientFor(
  actor: Actor,
  widgetId: string,
  level: Level = "edit",
) {
  const widget = await db.widget.findUnique({ where: { id: widgetId } });
  if (!widget) return null;
  const found = await getReportClientFor(actor, widget.reportId, level);
  return found ? { widget, ...found } : null;
}
