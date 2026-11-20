import { redirect } from "next/navigation";
import AdminDivisionsClient from "@/components/admin/AdminDivisionsClient";
import { getCurrentUser } from "@/lib/auth";
import { getAdminDivisionsWorkspaceData } from "@/lib/admin-divisions-data";

export const metadata = {
  title: "Manajemen Divisi — Otium Sistem Manajemen Cuti Karyawan",
};

/**
 * Halaman CMS Modul 2: Manajemen Divisi (/admin/divisions) — Pure Production.
 * Layer 2 RBAC: memverifikasi sesi aktif & role 'Admin' di PostgreSQL,
 * lalu memuat seluruh divisi, ketua, anggota, dan kandidat ketua bebas tugas.
 */
export default async function AdminDivisionsPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login?reason=inactive");
  }

  if (currentUser.role !== "Admin") {
    redirect("/dashboard?error=unauthorized_role");
  }

  const workspaceData = await getAdminDivisionsWorkspaceData();

  return (
    <AdminDivisionsClient
      initialDivisions={workspaceData.divisions}
      initialAvailableLeaders={workspaceData.availableLeaders}
      initialStats={workspaceData.stats}
    />
  );
}
