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
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-stone-300 bg-[#faf9f6] px-6 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-500 ring-1 ring-stone-200">
        {icon || <Inbox className="h-5 w-5" aria-hidden="true" />}
      </div>
      <h3 className="mt-3 text-sm font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-600">
        {description}
      </p>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="mt-4 inline-flex cursor-pointer items-center rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-colors duration-150 hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
