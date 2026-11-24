import { redirect } from "next/navigation";
import AdminPoliciesClient from "@/components/admin/AdminPoliciesClient";
import { getCurrentUser } from "@/lib/auth";
import { getPoliciesWorkspaceData } from "@/lib/policy-data";

export const metadata = {
  title: "Blackout & Kapasitas Tim — Otium Sistem Manajemen Cuti Karyawan",
};

const ALLOWED_ROLES = ["Admin", "HRD"];

/**
 * Halaman Fase 2 (8.6): Pengelolaan Periode Blackout & Batas Kapasitas Tim (/admin/policies).
 * Layer 2 RBAC: khusus Admin & HRD.
 */
export default async function AdminPoliciesPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login?reason=inactive");
  }

  if (!ALLOWED_ROLES.includes(currentUser.role)) {
    redirect("/dashboard?error=unauthorized_role");
  }

  const workspaceData = await getPoliciesWorkspaceData();

  return (
    <AdminPoliciesClient
      initialBlackouts={workspaceData.blackoutPeriods}
      initialDivisions={workspaceData.divisions}
      todayIso={workspaceData.todayIso}
      actorRole={currentUser.role}
    />
  );
}
