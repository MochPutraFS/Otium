import { redirect } from "next/navigation";
import LeaveHistoryClient from "@/components/leaves/LeaveHistoryClient";
import { getCurrentUser } from "@/lib/auth";
import { getLeaveHistoryWorkspaceData } from "@/lib/leave-request-data";

export const metadata = {
  title: "Riwayat Cuti Saya — Otium Sistem Manajemen Cuti Karyawan",
};

const ALLOWED_ROLES = ["Karyawan", "Ketua Divisi"];

/**
 * Halaman Daftar Riwayat & Pembatalan Cuti Pemohon (/leaves) — Pure Production.
 * Layer 2 RBAC: memverifikasi sesi aktif & role Karyawan / Ketua Divisi di PostgreSQL,
 * lalu memuat daftar riwayat cuti pribadi, counter status, dan master jenis cuti.
 */
export default async function LeaveHistoryPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login?reason=inactive");
  }

  if (!ALLOWED_ROLES.includes(currentUser.role)) {
    redirect("/dashboard?error=unauthorized_role");
  }

  const workspaceData = await getLeaveHistoryWorkspaceData(currentUser.id, {
    status: "ALL",
    sortBy: "submitted_desc",
  });

  if (!workspaceData) {
    redirect("/login?reason=inactive");
  }

  return (
    <LeaveHistoryClient
      initialUserProfile={workspaceData.userProfile}
      initialRequests={workspaceData.requests}
      initialCounts={workspaceData.counts}
      leaveTypes={workspaceData.leaveTypes}
    />
  );
}
