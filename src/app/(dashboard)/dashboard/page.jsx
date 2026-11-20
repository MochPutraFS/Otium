import { redirect } from "next/navigation";
import { AlertCircle } from "lucide-react";
import AdminDashboardView from "@/components/dashboard/AdminDashboardView";
import EmployeeDashboardView from "@/components/dashboard/EmployeeDashboardView";
import LeaderDashboardView from "@/components/dashboard/LeaderDashboardView";
import HrdDashboardView from "@/components/dashboard/HrdDashboardView";
import { getCurrentUser, mapRoleToUiKey } from "@/lib/auth";
import {
  ADMIN_DASHBOARD_MOCK,
  EMPLOYEE_DASHBOARD_MOCK,
  HRD_DASHBOARD_MOCK,
  LEADER_DASHBOARD_MOCK,
} from "@/lib/mock-dashboard-data";

export const metadata = {
  title: "Dashboard — Otium Sistem Manajemen Cuti Karyawan",
};

/**
 * Menampilkan tampilan dashboard otomatis sesuai role akun yang sedang login (deteksi role otomatis).
 */
export default async function DashboardPage({ searchParams }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login?reason=inactive");
  }

  const resolvedParams = (await searchParams) || {};
  const errorCode = resolvedParams.error || "";
  const activeRoleKey = mapRoleToUiKey(currentUser.role);

  function renderRoleDashboard() {
    switch (activeRoleKey) {
      case "admin":
        return <AdminDashboardView data={ADMIN_DASHBOARD_MOCK} />;
      case "ketua-divisi":
        return <LeaderDashboardView data={LEADER_DASHBOARD_MOCK} />;
      case "hrd":
        return <HrdDashboardView data={HRD_DASHBOARD_MOCK} />;
      case "karyawan":
      default:
        return <EmployeeDashboardView data={EMPLOYEE_DASHBOARD_MOCK} />;
    }
  }

  return (
    <div className="space-y-5">
      {errorCode === "unauthorized_role" && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
        >
          <AlertCircle
            className="mt-0.5 h-4 w-4 shrink-0 text-rose-600"
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
