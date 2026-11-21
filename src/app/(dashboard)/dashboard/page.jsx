import { redirect } from "next/navigation";
import { AlertCircle } from "lucide-react";
import AdminDashboardView from "@/components/dashboard/AdminDashboardView";
import EmployeeDashboardView from "@/components/dashboard/EmployeeDashboardView";
import LeaderDashboardView from "@/components/dashboard/LeaderDashboardView";
import HrdDashboardView from "@/components/dashboard/HrdDashboardView";
import { getCurrentUser } from "@/lib/auth";
import { getDashboardDataForUser } from "@/lib/dashboard-data";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Dashboard — Otium Sistem Manajemen Cuti Karyawan",
};

/**
 * Halaman Dashboard 4 Role (Pure Production Live Data dari PostgreSQL).
 * Memverifikasi sesi aktif di database dan merender tampilan sesuai role secara otomatis.
 */
export default async function DashboardPage({ searchParams }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login?reason=inactive");
  }

  const resolvedParams = (await searchParams) || {};
  const errorCode = resolvedParams.error || "";

  const { roleKey, data } = await getDashboardDataForUser(currentUser);

  function renderRoleDashboard() {
    switch (roleKey) {
      case "admin":
        return <AdminDashboardView initialData={data} />;
      case "ketua-divisi":
        return <LeaderDashboardView initialData={data} />;
      case "hrd":
        return <HrdDashboardView initialData={data} />;
      case "karyawan":
      default:
        return <EmployeeDashboardView initialData={data} />;
    }
  }

  return (
    <div className="space-y-5">
      {errorCode === "unauthorized_role" && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
        >
          <AlertCircle
            className="mt-0.5 h-4 w-4 shrink-0 text-rose-700"
            aria-hidden="true"
          />
          <span>
            Anda tidak memiliki hak akses untuk membuka halaman tersebut. Sistem
            mengarahkan Anda kembali ke Dashboard sesuai peran Anda.
          </span>
        </div>
      )}

      {renderRoleDashboard()}
    </div>
  );
}
