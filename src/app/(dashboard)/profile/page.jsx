import ProfilePageView from "@/components/profile/ProfilePageView";
import {
  ROLE_PRESETS,
  resolvePreviewRole,
} from "@/lib/mock-dashboard-data";

export const metadata = {
  title: "Profil & Pengaturan Akun — Otium Sistem Manajemen Cuti Karyawan",
};

// Halaman Profil & Panel Kuota Realtime (/profile)
// Sementara role dibaca dari query ?role= di URL untuk pratinjau UI 4 role.
export default async function ProfilePage({ searchParams }) {
  const resolvedParams = (await searchParams) || {};
  const previewRoleKey = resolvePreviewRole(resolvedParams.role);
  const activeUser = ROLE_PRESETS[previewRoleKey] || ROLE_PRESETS.karyawan;

  return <ProfilePageView initialUser={activeUser} roleKey={previewRoleKey} />;
}
