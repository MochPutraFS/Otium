import AdminDivisionsClient from "@/components/admin/AdminDivisionsClient";
import AdminRoleGuardNotice from "@/components/admin/AdminRoleGuardNotice";
import {
  ROLE_PRESETS,
  resolvePreviewRole,
} from "@/lib/mock-dashboard-data";

export const metadata = {
  title: "Manajemen Divisi — Otium Sistem Manajemen Cuti Karyawan",
};

// Halaman CMS Modul 2: Manajemen Divisi — Khusus Admin (/admin/divisions)
export default async function AdminDivisionsPage({ searchParams }) {
  const resolvedParams = (await searchParams) || {};
  const previewRoleKey = resolvePreviewRole(resolvedParams.role);
  const activeUser = ROLE_PRESETS[previewRoleKey] || ROLE_PRESETS.karyawan;

  if (activeUser.role !== "Admin") {
    return (
      <AdminRoleGuardNotice
        currentRoleName={activeUser.role}
        currentRoleKey={previewRoleKey}
        targetPath="/admin/divisions"
        moduleTitle="Manajemen Divisi"
      />
    );
  }

  return <AdminDivisionsClient />;
}
