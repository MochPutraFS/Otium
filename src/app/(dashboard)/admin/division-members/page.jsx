import { redirect } from "next/navigation";
import AdminDivisionMembersClient from "@/components/admin/AdminDivisionMembersClient";
import { getCurrentUser } from "@/lib/auth";
import { getAdminDivisionMembersWorkspaceData } from "@/lib/admin-divisions-data";

export const metadata = {
  title: "Anggota Divisi — Otium Sistem Manajemen Cuti Karyawan",
};

/**
 * Halaman CMS Modul 3: Manajemen Anggota Divisi (/admin/division-members) — Pure Production.
 * Layer 2 RBAC: memverifikasi sesi aktif & role 'Admin' di PostgreSQL,
 * mendukung deep-link ?divisionId=<id> dari Modal Detail Divisi Modul 2.
 */
export default async function AdminDivisionMembersPage({ searchParams }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login?reason=inactive");
  }

  if (currentUser.role !== "Admin") {
    redirect("/dashboard?error=unauthorized_role");
  }

  const resolvedParams = (await searchParams) || {};
  const workspaceData = await getAdminDivisionMembersWorkspaceData(
    resolvedParams.divisionId || null
  );

  return (
    <AdminDivisionMembersClient
      initialDivisions={workspaceData.divisions}
      initialUsers={workspaceData.users}
      initialSelectedDivisionId={workspaceData.initialSelectedDivisionId}
    />
  );
}
