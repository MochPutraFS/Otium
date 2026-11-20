import HrdApprovalClient from "@/components/approvals/HrdApprovalClient";
import ApprovalRoleGuardNotice from "@/components/approvals/ApprovalRoleGuardNotice";
import {
  ROLE_PRESETS,
  resolvePreviewRole,
} from "@/lib/mock-dashboard-data";
import { LEAVE_TYPES_MOCK } from "@/lib/mock-leaves-data";

export const metadata = {
  title: "Persetujuan Final HRD — Otium Sistem Manajemen Cuti Karyawan",
};

// Halaman Modul 6B: Persetujuan Final & Multi-Approve — Khusus HRD (/approvals/hrd)
export default async function HrdApprovalPage({ searchParams }) {
  const resolvedParams = (await searchParams) || {};
  const previewRoleKey = resolvePreviewRole(resolvedParams.role);
  const activeUser = ROLE_PRESETS[previewRoleKey] || ROLE_PRESETS.karyawan;

  if (activeUser.role !== "HRD") {
    return (
      <ApprovalRoleGuardNotice
        currentRoleName={activeUser.role}
        currentRoleKey={previewRoleKey}
        requiredRole="HRD"
        requiredRoleKey="hrd"
        targetPath="/approvals/hrd"
      />
    );
  }

  return (
    <HrdApprovalClient
      hrdProfile={activeUser}
      leaveTypes={LEAVE_TYPES_MOCK.filter((lt) => lt.isActive)}
    />
  );
}
