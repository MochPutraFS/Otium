import { redirect } from "next/navigation";
import LeaderVerificationClient from "@/components/approvals/LeaderVerificationClient";
import { getCurrentUser } from "@/lib/auth";
import { getLeaderApprovalWorkspaceData } from "@/lib/approval-data";

export const metadata = {
  title: "Verifikasi Cuti Divisi — Otium Sistem Manajemen Cuti Karyawan",
};

/**
 * Halaman Modul 6A: Verifikasi Pengajuan Cuti Tahap 1 — Khusus Ketua Divisi (/approvals/leader).
 * Layer 2 RBAC: memverifikasi sesi aktif & role 'Ketua Divisi' langsung dari PostgreSQL,
 * lalu memuat antrean & riwayat pengajuan anggota divisi yang dipimpinnya.
 */
export default async function LeaderApprovalPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login?reason=inactive");
  }

  if (currentUser.role !== "Ketua Divisi") {
    redirect("/dashboard?error=unauthorized_role");
  }

  const workspaceData = await getLeaderApprovalWorkspaceData(currentUser.id);
  if (!workspaceData) {
    redirect("/login?reason=inactive");
  }

  return (
    <LeaderVerificationClient
      initialLeaderProfile={workspaceData.leaderProfile}
      initialRequests={workspaceData.requests}
      initialCounts={workspaceData.counts}
      leaveTypes={workspaceData.leaveTypes}
    />
  );
}
