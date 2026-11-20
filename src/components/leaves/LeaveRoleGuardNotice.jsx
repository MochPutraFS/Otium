import Link from "next/link";
import { ShieldAlert, ArrowLeft, UserCheck } from "lucide-react";

// Pengaman tampilan RBAC untuk preview role Admin/HRD yang tidak mengajukan cuti
export default function LeaveRoleGuardNotice({ roleName, targetPath = "/leaves" }) {
  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 ring-1 ring-amber-200">
        <ShieldAlert className="h-6 w-6" aria-hidden="true" />
      </div>
      <h2 className="mt-4 text-base font-bold text-slate-900">
        Halaman Khusus Karyawan &amp; Ketua Divisi
      </h2>
      <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
        Sesuai aturan hak akses sistem, peran <strong>{roleName}</strong> tidak
        menggunakan alur pengajuan cuti pribadi. Gunakan tombol di bawah untuk
        kembali ke Dashboard atau beralih pratinjau peran.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
        <Link
          href={`/dashboard?role=${roleName.toLowerCase()}`}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Kembali ke Dashboard
        </Link>
        <Link
          href={`${targetPath}?role=karyawan`}
          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
        >
          <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
          Pratinjau sebagai Karyawan
        </Link>
      </div>
    </div>
  );
}
