import { redirect } from "next/navigation";

// The dashboard is now per-client at /clients/[id]. Keep this route as a
// redirect so old links / bookmarks still land somewhere sensible.
export default function DashboardPage() {
  redirect("/overview");
}
