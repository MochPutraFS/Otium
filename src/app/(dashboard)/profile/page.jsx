import { redirect } from "next/navigation";
import ProfilePageView from "@/components/profile/ProfilePageView";
import { getCurrentUser } from "@/lib/auth";
import { getProfilePageData } from "@/lib/shell-data";

export const metadata = {
  title: "Profil & Pengaturan Akun — Otium Sistem Manajemen Cuti Karyawan",
};

/**
 * Halaman Profil & Panel Kuota Realtime (/profile) — Pure Production.
 * Menerapkan Layer 2 RBAC: memverifikasi sesi aktif & memuat data profil langsung dari PostgreSQL.
 */
export default async function ProfilePage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login?reason=inactive");
  }

  const profileData = await getProfilePageData(currentUser.id);
  if (!profileData) {
    redirect("/login?reason=inactive");
  }

  return (
    <ProfilePageView
      initialProfile={profileData.profile}
      divisions={profileData.divisions}
    />
  );
}
