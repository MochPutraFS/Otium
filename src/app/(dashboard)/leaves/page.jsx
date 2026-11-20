import LeaveHistoryClient from "@/components/leaves/LeaveHistoryClient";
import LeaveRoleGuardNotice from "@/components/leaves/LeaveRoleGuardNotice";
import {
  ROLE_PRESETS,
  resolvePreviewRole,
} from "@/lib/mock-dashboard-data";
import { LEAVE_TYPES_MOCK } from "@/lib/mock-leaves-data";

export const metadata = {
  title: "Riwayat Cuti Saya — Otium Sistem Manajemen Cuti Karyawan",
};

const ALLOWED_ROLES = ["Karyawan", "Ketua Divisi"];

// Halaman Daftar Riwayat Cuti Pemohon (/leaves)
export default async function LeaveHistoryPage({ searchParams }) {
  const resolvedParams = (await searchParams) || {};
  const previewRoleKey = resolvePreviewRole(resolvedParams.role);
  const activeUser = ROLE_PRESETS[previewRoleKey] || ROLE_PRESETS.karyawan;

  if (!ALLOWED_ROLES.includes(activeUser.role)) {
    return (
      <LeaveRoleGuardNotice roleName={activeUser.role} targetPath="/leaves" />
    );
  }

  return (
    <LeaveHistoryClient
      userProfile={activeUser}
      roleKey={previewRoleKey}
      leaveTypes={LEAVE_TYPES_MOCK.filter((lt) => lt.isActive)}
    />
  );
}
