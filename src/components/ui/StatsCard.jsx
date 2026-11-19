import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

const VARIANT_MAP = {
  blue: "bg-blue-50 text-blue-600 border-blue-100",
  emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
  amber: "bg-amber-50 text-amber-600 border-amber-100",
  rose: "bg-rose-50 text-rose-600 border-rose-100",
  purple: "bg-purple-50 text-purple-600 border-purple-100",
  sky: "bg-sky-50 text-sky-600 border-sky-100",
};

// Kartu angka ringkasan di dashboard (bisa tampilkan angka bulat maupun desimal 0.5)
export default function StatsCard({
  title,
  value,
  subtitle,
  icon,
  variant = "blue",
  href,
  actionLabel,
}) {
  const iconTone = VARIANT_MAP[variant] || VARIANT_MAP.blue;

  return (
    <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300/80 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {title}
          </p>
          <h3 className="mt-1.5 truncate text-2xl font-bold tracking-tight text-slate-900">
            {value}
          </h3>
          {subtitle && (
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              {subtitle}
            </p>
          )}
        </div>
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${iconTone}`}
        >
          {icon}
        </div>
      </div>

      {href && actionLabel && (
        <div className="mt-4 border-t border-slate-100 pt-3">
          <Link
            href={href}
            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 transition hover:text-blue-700"
          >
            {actionLabel}
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      )}
    </div>
  );
}
