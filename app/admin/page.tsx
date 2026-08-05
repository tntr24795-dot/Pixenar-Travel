import { redirect } from "next/navigation";

/** `/admin` itself just forwards to the dashboard. */
export default function AdminIndexPage() {
  redirect("/admin/dashboard");
}
