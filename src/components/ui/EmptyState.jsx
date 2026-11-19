import Link from "next/link";
import { Inbox } from "lucide-react";

// Tampilan cadangan saat tabel atau daftar masih kosong
export default function EmptyState({
  icon,
  title = "Belum ada data",
  description = "Data akan tampil secara otomatis ketika sudah tersedia.",
  actionLabel,
  actionHref,
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm ring-1 ring-slate-200/80">
        {icon || <Inbox className="h-5 w-5" aria-hidden="true" />}
      </div>
      <h3 className="mt-3 text-sm font-semibold text-slate-800">{title}</h3>
      <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-500">
        {description}
      </p>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="mt-4 inline-flex items-center rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
