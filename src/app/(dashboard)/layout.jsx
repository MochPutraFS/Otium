import { redirect } from "next/navigation";
import AppShellClient from "@/components/layout/AppShellClient";
import { getCurrentUser } from "@/lib/auth";

/**
 * Layout utama untuk seluruh halaman terproteksi yang memakai Sidebar & TopNavbar.
 * Menerapkan Layer 2 Auth Guard: memverifikasi ulang sesi & status is_active ke PostgreSQL.
 */
export default async function DashboardLayout({ children }) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login?reason=inactive");
  }

  return <AppShellClient sessionUser={currentUser}>{children}</AppShellClient>;
}
