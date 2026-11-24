import { redirect } from "next/navigation";
import LeaveRequestForm from "@/components/leaves/LeaveRequestForm";
import { getCurrentUser } from "@/lib/auth";
import { getNewLeaveWorkspaceData } from "@/lib/leave-request-data";

export const metadata = {
  title: "Ajukan Cuti Baru — Otium Sistem Manajemen Cuti Karyawan",
};

const ALLOWED_ROLES = ["Karyawan", "Ketua Divisi"];

/**
 * Halaman Form Pengajuan Cuti Baru (/leaves/new) — Pure Production.
 * Layer 2 RBAC: memverifikasi sesi aktif & role Karyawan / Ketua Divisi di PostgreSQL,
 * lalu memuat jenis cuti aktif, rekan satu divisi, hari libur, dan jadwal cuti aktif.
 */
export default async function NewLeavePage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login?reason=inactive");
  }

  if (!ALLOWED_ROLES.includes(currentUser.role)) {
    redirect("/dashboard?error=unauthorized_role");
  }

  const workspaceData = await getNewLeaveWorkspaceData(currentUser.id);
  if (!workspaceData) {
    redirect("/login?reason=inactive");
  }

  return (
    <LeaveRequestForm
      serverToday={workspaceData.serverToday}
      userProfile={workspaceData.userProfile}
      leaveTypes={workspaceData.leaveTypes}
      colleagues={workspaceData.colleagues}
      holidays={workspaceData.holidays}
      activeLeaveRanges={workspaceData.activeLeaveRanges}
      colleagueLeaves={workspaceData.colleagueLeaves}
      blackoutPeriods={workspaceData.blackoutPeriods}
    />
  );
}
