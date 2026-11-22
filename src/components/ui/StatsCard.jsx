import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

const VARIANT_MAP = {
  blue: "bg-blue-50/80 text-blue-700 border-blue-200/70",
  emerald: "bg-emerald-50/80 text-emerald-700 border-emerald-200/70",
  amber: "bg-amber-50/80 text-amber-800 border-amber-200/80",
  rose: "bg-rose-50/80 text-rose-700 border-rose-200/70",
  purple: "bg-purple-50/80 text-purple-700 border-purple-200/70",
  sky: "bg-sky-50/80 text-sky-700 border-sky-200/70",
};

const PROGRESS_TONE_MAP = {
  blue: "",
  emerald: "otium-progress--ok",
  amber: "otium-progress--amber",
  rose: "otium-progress--danger",
  purple: "",
  sky: "otium-progress--sky",
};

// Kartu angka ringkasan di dashboard (Swiss Editorial Minimalism + native <progress>)
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
  progressLabel,
  clickableCard = false,
}) {
  const iconTone = VARIANT_MAP[variant] || VARIANT_MAP.blue;
  const progressTone =
    PROGRESS_TONE_MAP[progressVariant || variant] ?? PROGRESS_TONE_MAP.emerald;
  const hasProgress = typeof progressPercent === "number";
  const clampedProgress = hasProgress
    ? Math.max(0, Math.min(100, Math.round(progressPercent)))
    : 0;

  const isWholeCardLink = Boolean(clickableCard && href);

  const cardInner = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-600">
              {title}
            </p>
            {badge && <span className="shrink-0">{badge}</span>}
          </div>
          <h3 className="mt-1.5 truncate text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
            {value}
          </h3>
          {subtitle && (
            <p className="mt-1 text-xs leading-relaxed text-slate-600 tabular-nums">
              {subtitle}
            </p>
          )}
        </div>
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${iconTone}`}
          aria-hidden="true"
        >
          {icon}
        </div>
      </div>

      {hasProgress && (
        <div className="mt-3.5">
          <progress
            className={`otium-progress ${progressTone}`}
            value={clampedProgress}
            max={100}
            aria-label={progressLabel || `${title}: ${clampedProgress}%`}
          />
        </div>
      )}

      {href && actionLabel && (
        <div className="mt-4 border-t border-stone-100 pt-3">
          {isWholeCardLink ? (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 transition-colors duration-150 group-hover:text-blue-800">
              {actionLabel}
              <ArrowUpRight
                className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                aria-hidden="true"
              />
            </span>
          ) : (
            <Link
              href={href}
              className="inline-flex cursor-pointer items-center gap-1 rounded text-xs font-semibold text-blue-700 transition-colors duration-150 hover:text-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
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
        className="group flex cursor-pointer flex-col justify-between rounded-xl border border-stone-200 bg-white p-5 transition-colors duration-150 hover:border-slate-400 hover:bg-[#FAF9F6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
      >
        {cardInner}
      </Link>
    );
  }

  return (
    <div className="flex flex-col justify-between rounded-xl border border-stone-200 bg-white p-5">
      {cardInner}
    </div>
  );
}
