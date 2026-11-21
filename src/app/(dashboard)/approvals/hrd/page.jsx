import { redirect } from "next/navigation";
import HrdApprovalClient from "@/components/approvals/HrdApprovalClient";
import { getCurrentUser } from "@/lib/auth";
import { getHrdApprovalWorkspaceData } from "@/lib/approval-data";

export const metadata = {
  title: "Persetujuan Final HRD — Otium Sistem Manajemen Cuti Karyawan",
};

/**
 * Halaman Modul 6B: Persetujuan Final & Multi-Approve — Khusus HRD (/approvals/hrd).
 * Layer 2 RBAC: memverifikasi sesi aktif & role 'HRD' langsung dari PostgreSQL,
 * lalu memuat antrean Final Approval (Jalur 1 & Jalur 2) serta seluruh pengajuan perusahaan.
 */
export default async function HrdApprovalPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login?reason=inactive");
  }

  if (currentUser.role !== "HRD") {
    redirect("/dashboard?error=unauthorized_role");
  }

  const workspaceData = await getHrdApprovalWorkspaceData(currentUser.id);
  if (!workspaceData) {
    redirect("/login?reason=inactive");
  }

  return (
    <HrdApprovalClient
      initialHrdProfile={workspaceData.hrdProfile}
      initialRequests={workspaceData.requests}
      initialCounts={workspaceData.counts}
      divisions={workspaceData.divisions}
      leaveTypes={workspaceData.leaveTypes}
    />
  );
}
