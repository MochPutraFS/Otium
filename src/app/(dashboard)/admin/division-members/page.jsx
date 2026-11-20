import AdminDivisionMembersClient from "@/components/admin/AdminDivisionMembersClient";
import AdminRoleGuardNotice from "@/components/admin/AdminRoleGuardNotice";
import {
  ROLE_PRESETS,
  resolvePreviewRole,
} from "@/lib/mock-dashboard-data";

export const metadata = {
  title: "Anggota Divisi — Otium Sistem Manajemen Cuti Karyawan",
};

// Halaman CMS Modul 3: Manajemen Anggota Divisi — Khusus Admin (/admin/division-members)
export default async function AdminDivisionMembersPage({ searchParams }) {
  const resolvedParams = (await searchParams) || {};
  const previewRoleKey = resolvePreviewRole(resolvedParams.role);
  const activeUser = ROLE_PRESETS[previewRoleKey] || ROLE_PRESETS.karyawan;

  if (activeUser.role !== "Admin") {
    return (
      <AdminRoleGuardNotice
        currentRoleName={activeUser.role}
        currentRoleKey={previewRoleKey}
        targetPath="/admin/division-members"
        moduleTitle="Manajemen Anggota Divisi"
      />
    );
  }

  return (
    <AdminDivisionMembersClient
      initialDivisionId={resolvedParams.divisionId || null}
    />
  );
}
