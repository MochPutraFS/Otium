import Link from "next/link";
import { Inbox } from "lucide-react";

/**
 * Tampilan cadangan bergaya Swiss Archival saat tabel atau daftar masih kosong.
 */
export default function EmptyState({
  icon,
  title = "Belum ada data",
  description = "Data akan tampil secara otomatis ketika sudah tersedia.",
  actionLabel,
  actionHref,
}) {
  return (
    <div className="flex flex-col items-center justify-center border border-dashed border-[var(--rule-strong)] bg-[var(--paper)] px-6 py-10 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-[2px] border border-[var(--rule-strong)] bg-[var(--paper-pure)] text-[var(--ink-muted)]">
        {icon || <Inbox className="h-5 w-5" aria-hidden="true" />}
      </div>
      <h3 className="mt-3 text-sm font-semibold text-[var(--ink)]">{title}</h3>
      <p className="mt-1 max-w-sm text-xs leading-relaxed text-[var(--ink-soft)]">
        {description}
      </p>
      {actionLabel && actionHref && (
        <Link href={actionHref} className="btn btn-primary btn-sm mt-4">
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
