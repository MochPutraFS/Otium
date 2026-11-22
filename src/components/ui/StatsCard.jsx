import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

const VARIANT_MAP = {
  blue: "bg-[var(--slate-tint)] text-[var(--slate-blue)] border-[var(--slate-border)]",
  emerald: "bg-[var(--spruce-tint)] text-[var(--spruce)] border-[var(--spruce-border)]",
  amber: "bg-[var(--ochre-tint)] text-[var(--ochre)] border-[var(--ochre-border)]",
  rose: "bg-[var(--terracotta-tint)] text-[var(--terracotta)] border-[var(--terracotta-border)]",
  purple: "bg-[var(--slate-tint)] text-[var(--slate-blue)] border-[var(--slate-border)]",
  sky: "bg-[var(--slate-tint)] text-[var(--slate-blue)] border-[var(--slate-border)]",
};

const PROGRESS_TONE_MAP = {
  blue: "otium-progress--sky",
  emerald: "otium-progress--ok",
  amber: "otium-progress--amber",
  rose: "otium-progress--danger",
  purple: "otium-progress--sky",
  sky: "otium-progress--sky",
};

/**
 * Kartu angka ringkasan bergaya Swiss Archival (border tegas, angka serif, native <progress>).
 * Mempertahankan 100% kontrak props lama untuk kompatibilitas lintas halaman.
 */
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
            <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--ink-muted)]">
              {title}
            </p>
            {badge && <span className="shrink-0">{badge}</span>}
          </div>
          <h3 className="mt-1.5 truncate font-serif text-[30px] font-semibold leading-none tracking-[-0.02em] text-[var(--ink)] tabular-nums">
            {value}
          </h3>
          {subtitle && (
            <p className="mt-2 text-xs leading-relaxed text-[var(--ink-soft)] tabular-nums">
              {subtitle}
            </p>
          )}
        </div>
        {icon && (
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[2px] border ${iconTone}`}
            aria-hidden="true"
          >
            {icon}
          </div>
        )}
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
        <div className="mt-4 border-t border-[var(--rule)] pt-3">
          {isWholeCardLink ? (
            <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--spruce)] transition-colors duration-150 group-hover:underline">
              {actionLabel}
              <ArrowUpRight
                className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                aria-hidden="true"
              />
            </span>
          ) : (
            <Link
              href={href}
              className="inline-flex cursor-pointer items-center gap-1 font-mono text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--spruce)] transition-colors duration-150 hover:underline"
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
        className="group flex cursor-pointer flex-col justify-between border border-[var(--rule-strong)] bg-[var(--paper-pure)] p-5 transition-colors duration-150 hover:border-[var(--spruce)] hover:bg-[var(--paper)]"
      >
        {cardInner}
      </Link>
    );
  }

  return (
    <div className="flex flex-col justify-between border border-[var(--rule-strong)] bg-[var(--paper-pure)] p-5">
      {cardInner}
    </div>
  );
}
