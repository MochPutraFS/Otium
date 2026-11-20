import LeaveRequestForm from "@/components/leaves/LeaveRequestForm";
import LeaveRoleGuardNotice from "@/components/leaves/LeaveRoleGuardNotice";
import {
  ROLE_PRESETS,
  resolvePreviewRole,
} from "@/lib/mock-dashboard-data";
import {
  COLLEAGUES_BY_DIVISION_MOCK,
  LEAVE_TYPES_MOCK,
} from "@/lib/mock-leaves-data";

export const metadata = {
  title: "Ajukan Cuti Baru — Otium Sistem Manajemen Cuti Karyawan",
};

const ALLOWED_ROLES = ["Karyawan", "Ketua Divisi"];

// Halaman Form Pengajuan Cuti (/leaves/new)
export default async function NewLeavePage({ searchParams }) {
  const resolvedParams = (await searchParams) || {};
  const previewRoleKey = resolvePreviewRole(resolvedParams.role);
  const activeUser = ROLE_PRESETS[previewRoleKey] || ROLE_PRESETS.karyawan;

  if (!ALLOWED_ROLES.includes(activeUser.role)) {
    return (
      <LeaveRoleGuardNotice
        roleName={activeUser.role}
        targetPath="/leaves/new"
      />
    );
  }

  const divisionColleagues = (
    COLLEAGUES_BY_DIVISION_MOCK[activeUser.divisionName] || []
  ).filter((colleague) => colleague.id !== activeUser.id);

  return (
    <LeaveRequestForm
      userProfile={activeUser}
      roleKey={previewRoleKey}
      leaveTypes={LEAVE_TYPES_MOCK.filter((lt) => lt.isActive)}
      colleagues={divisionColleagues}
    />
  );
}
