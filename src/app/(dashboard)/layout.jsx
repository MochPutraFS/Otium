import { redirect } from "next/navigation";
import AppShellClient from "@/components/layout/AppShellClient";
import { getCurrentUser } from "@/lib/auth";
import { getAppShellData } from "@/lib/shell-data";

/**
 * Layout utama untuk seluruh halaman terproteksi yang memakai Sidebar & TopNavbar.
 * Menerapkan Layer 2 Auth Guard: memverifikasi ulang sesi & status is_active ke PostgreSQL,
 * lalu memuat data App Shell realtime (badge antrean approval, notifikasi, & libur terdekat).
 */
export default async function DashboardLayout({ children }) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login?reason=inactive");
  }

  const shellData = await getAppShellData(currentUser);

  return (
    <AppShellClient sessionUser={currentUser} shellData={shellData}>
      {children}
    </AppShellClient>
  );
}
