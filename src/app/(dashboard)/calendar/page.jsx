import { redirect } from "next/navigation";
import CompanyCalendarClient from "@/components/calendar/CompanyCalendarClient";
import { getCurrentUser } from "@/lib/auth";
import { getCompanyCalendarData } from "@/lib/calendar-data";

export const metadata = {
  title: "Kalender Cuti Perusahaan — Otium Sistem Manajemen Cuti Karyawan",
};

/**
 * Halaman Fase 2 (8.2): Transparansi Riwayat & Kalender Cuti Lintas Role (/calendar).
 * Dapat diakses seluruh 4 role aktif dengan penyembunyian data sensitif di level SQL.
 */
export default async function CompanyCalendarPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login?reason=inactive");
  }

  const initialData = await getCompanyCalendarData();

  return (
    <CompanyCalendarClient
      initialData={initialData}
      currentUserId={currentUser.id}
      currentUserDivisionId={currentUser.divisionId}
    />
  );
}
