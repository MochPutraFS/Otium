import Link from "next/link";
import { ShieldAlert, ArrowLeft, UserCheck } from "lucide-react";

// Pengaman tampilan RBAC khusus untuk /approvals/leader (Ketua Divisi) & /approvals/hrd (HRD)
export default function ApprovalRoleGuardNotice({
  currentRoleName,
  currentRoleKey = "karyawan",
  requiredRole = "Ketua Divisi",
  requiredRoleKey = "ketua-divisi",
  targetPath = "/approvals/leader",
}) {
  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 ring-1 ring-amber-200">
        <ShieldAlert className="h-6 w-6" aria-hidden="true" />
      </div>

      <h2 className="mt-4 text-base font-bold text-slate-900">
        Halaman Khusus Peran {requiredRole}
      </h2>
      <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
        Sesuai aturan hak akses (RBAC), peran{" "}
        <strong className="text-slate-700">{currentRoleName}</strong> tidak
        memiliki akses ke halaman ini. Gunakan tombol di bawah untuk kembali ke
        Dashboard atau beralih pratinjau sebagai{" "}
        <strong className="text-slate-700">{requiredRole}</strong>.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
        <Link
          href={`/dashboard?role=${currentRoleKey}`}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Kembali ke Dashboard
        </Link>
        <Link
          href={`${targetPath}?role=${requiredRoleKey}`}
          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
        >
          <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
          Pratinjau sebagai {requiredRole}
        </Link>
      </div>
    </div>
  );
}
