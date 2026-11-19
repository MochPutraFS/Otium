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

const PROGRESS_MAP = {
  blue: "bg-blue-500",
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  purple: "bg-purple-500",
  sky: "bg-sky-500",
};

// Kartu angka ringkasan di dashboard (mendukung desimal 0.5, badge, progress bar, & clickable CTA)
export default function StatsCard({
  title,
  value,
  subtitle,
  icon,
  variant = "blue",
  href,
  actionLabel,
  badge,
  progressPercent,
  progressVariant,
  clickableCard = false,
}) {
  const iconTone = VARIANT_MAP[variant] || VARIANT_MAP.blue;
  const progressTone =
    PROGRESS_MAP[progressVariant || variant] || PROGRESS_MAP.emerald;
  const hasProgress = typeof progressPercent === "number";
  const clampedProgress = hasProgress
    ? Math.max(0, Math.min(100, progressPercent))
    : 0;

  const isWholeCardLink = Boolean(clickableCard && href);

  const cardInner = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {title}
            </p>
            {badge && <span className="shrink-0">{badge}</span>}
          </div>
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

      {hasProgress && (
        <div className="mt-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full transition-all duration-300 ${progressTone}`}
              style={{ width: `${clampedProgress}%` }}
            />
          </div>
        </div>
      )}

      {href && actionLabel && (
        <div className="mt-4 border-t border-slate-100 pt-3">
          {isWholeCardLink ? (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 transition group-hover:text-blue-700">
              {actionLabel}
              <ArrowUpRight
                className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                aria-hidden="true"
              />
            </span>
          ) : (
            <Link
              href={href}
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 transition hover:text-blue-700"
            >
              {actionLabel}
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          )}
        </div>
      )}
    </>
  );

  if (isWholeCardLink) {
    return (
      <Link
        href={href}
        className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:bg-blue-50/20 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500/30"
      >
        {cardInner}
      </Link>
    );
  }

  return (
    <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300/80 hover:shadow-md">
      {cardInner}
    </div>
  );
}
