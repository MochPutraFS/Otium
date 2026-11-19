import { AlertCircle } from "lucide-react";
import AdminDashboardView from "@/components/dashboard/AdminDashboardView";
import EmployeeDashboardView from "@/components/dashboard/EmployeeDashboardView";
import LeaderDashboardView from "@/components/dashboard/LeaderDashboardView";
import HrdDashboardView from "@/components/dashboard/HrdDashboardView";
import {
  ADMIN_DASHBOARD_MOCK,
  EMPLOYEE_DASHBOARD_MOCK,
  HRD_DASHBOARD_MOCK,
  LEADER_DASHBOARD_MOCK,
  resolvePreviewRole,
} from "@/lib/mock-dashboard-data";

export const metadata = {
  title: "Dashboard — Otium Sistem Manajemen Cuti Karyawan",
};

// Menampilkan tampilan dashboard sesuai role yang aktif.
// Sementara role dibaca dari query ?role= di URL, nanti diganti sesi login dari server.
export default async function DashboardPage({ searchParams }) {
  const resolvedParams = (await searchParams) || {};
  const previewRoleKey = resolvePreviewRole(resolvedParams.role);
  const errorCode = resolvedParams.error || "";

  function renderRoleDashboard() {
    switch (previewRoleKey) {
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
