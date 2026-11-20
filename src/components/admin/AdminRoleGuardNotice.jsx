import Link from "next/link";
import { ArrowLeft, ShieldAlert, UserCheck } from "lucide-react";

// Pengaman tampilan RBAC khusus untuk rute CMS Master Data (/admin/*)
export default function AdminRoleGuardNotice({
  currentRoleName,
  currentRoleKey = "karyawan",
  targetPath = "/admin/users",
  moduleTitle = "Manajemen CMS Admin",
}) {
  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 ring-1 ring-amber-200">
        <ShieldAlert className="h-6 w-6" aria-hidden="true" />
      </div>

      <h2 className="mt-4 text-base font-bold text-slate-900">
        Halaman {moduleTitle} Khusus Peran Admin
      </h2>
      <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
        Sesuai aturan hak akses (RBAC), peran{" "}
        <strong className="text-slate-800">{currentRoleName}</strong> tidak
        memiliki akses ke modul CMS Master Data. Gunakan tombol di bawah untuk
        kembali ke Dashboard atau beralih pratinjau sebagai{" "}
        <strong className="text-slate-800">Admin</strong>.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
        <Link
          href={`/dashboard?role=${currentRoleKey}`}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-colors duration-200 hover:bg-slate-50"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Kembali ke Dashboard
        </Link>
        <Link
          href={`${targetPath}?role=admin`}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors duration-200 hover:bg-blue-700"
        >
          <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
          Pratinjau sebagai Admin
        </Link>
      </div>
    </div>
  );
}
