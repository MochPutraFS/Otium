import Link from "next/link";
import { ArrowLeft, ShieldAlert, UserCheck } from "lucide-react";

/**
 * Pengaman tampilan RBAC bergaya Swiss Archival untuk rute CMS Master Data (/admin/*).
 */
export default function AdminRoleGuardNotice({
  currentRoleName,
  targetPath = "/dashboard",
  moduleTitle = "Manajemen CMS Admin",
}) {
  return (
    <div className="panel mx-auto max-w-xl text-center">
      <div className="panel-body py-8 sm:px-8">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[2px] border border-[var(--ochre-border)] bg-[var(--ochre-tint)] text-[var(--ochre)]">
          <ShieldAlert className="h-6 w-6" aria-hidden="true" />
        </div>

        <span className="panel-eyebrow mt-4">Pembatasan Hak Akses</span>
        <h2 className="mt-1 font-serif text-2xl font-semibold text-[var(--ink)]">
          Halaman {moduleTitle} Khusus Peran Admin
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-[var(--ink-soft)]">
          Sesuai aturan hak akses (RBAC), peran{" "}
          <strong className="text-[var(--ink)]">{currentRoleName}</strong> tidak
          memiliki akses ke modul CMS Master Data. Gunakan tombol di bawah untuk
          kembali ke Dashboard.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
          <Link href="/dashboard" className="btn btn-sm">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Kembali ke Dashboard</span>
          </Link>
          {targetPath && targetPath !== "/dashboard" && (
            <Link href={targetPath} className="btn btn-primary btn-sm">
              <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Buka Halaman Terkait</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
