import AdminLeaveTypesClient from "@/components/admin/AdminLeaveTypesClient";
import AdminRoleGuardNotice from "@/components/admin/AdminRoleGuardNotice";
import {
  ROLE_PRESETS,
  resolvePreviewRole,
} from "@/lib/mock-dashboard-data";

export const metadata = {
  title: "Jenis Cuti Dinamis — Otium Sistem Manajemen Cuti Karyawan",
};

// Halaman CMS Modul 4: Manajemen Jenis Cuti Dinamis — Khusus Admin (/admin/leave-types)
export default async function AdminLeaveTypesPage({ searchParams }) {
  const resolvedParams = (await searchParams) || {};
  const previewRoleKey = resolvePreviewRole(resolvedParams.role);
  const activeUser = ROLE_PRESETS[previewRoleKey] || ROLE_PRESETS.karyawan;

  if (activeUser.role !== "Admin") {
    return (
      <AdminRoleGuardNotice
        currentRoleName={activeUser.role}
        currentRoleKey={previewRoleKey}
        targetPath="/admin/leave-types"
        moduleTitle="Manajemen Jenis Cuti Dinamis"
      />
    );
  }

  return <AdminLeaveTypesClient />;
}
