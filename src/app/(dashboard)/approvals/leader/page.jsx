import LeaderVerificationClient from "@/components/approvals/LeaderVerificationClient";
import ApprovalRoleGuardNotice from "@/components/approvals/ApprovalRoleGuardNotice";
import {
  ROLE_PRESETS,
  resolvePreviewRole,
} from "@/lib/mock-dashboard-data";
import { LEAVE_TYPES_MOCK } from "@/lib/mock-leaves-data";

export const metadata = {
  title: "Verifikasi Cuti Divisi — Otium Sistem Manajemen Cuti Karyawan",
};

// Halaman Modul 6A: Verifikasi Tahap 1 — Khusus Ketua Divisi (/approvals/leader)
export default async function LeaderApprovalPage({ searchParams }) {
  const resolvedParams = (await searchParams) || {};
  const previewRoleKey = resolvePreviewRole(resolvedParams.role);
  const activeUser = ROLE_PRESETS[previewRoleKey] || ROLE_PRESETS.karyawan;

  if (activeUser.role !== "Ketua Divisi") {
    return (
      <ApprovalRoleGuardNotice
        currentRoleName={activeUser.role}
        currentRoleKey={previewRoleKey}
        requiredRole="Ketua Divisi"
        requiredRoleKey="ketua-divisi"
        targetPath="/approvals/leader"
      />
    );
  }

  return (
    <LeaderVerificationClient
      leaderProfile={activeUser}
      leaveTypes={LEAVE_TYPES_MOCK.filter((lt) => lt.isActive)}
    />
  );
}
