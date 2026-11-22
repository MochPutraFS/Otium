import { CalendarCheck2, Clock, ShieldAlert, ShieldCheck } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";

function formatDecimalDays(value) {
  const num = Number(value ?? 0);
  return Number.isNaN(num) ? "0.0" : num.toFixed(1);
}

/**
 * Panel sisa kuota tahunan (mendukung desimal 0.5) + donut SVG aksesibel.
 */
export default function QuotaOverviewCard({
  joinDate,
  tenureLabel,
  isEligibleAnnualLeave = true,
  initialQuota = 12.0,
  remainingQuota = 12.0,
}) {
  const safeInitial = Number(initialQuota) > 0 ? Number(initialQuota) : 12.0;
  const safeRemaining = Math.max(0, Number(remainingQuota ?? 0));
  const usedQuota = Math.max(0, Number((safeInitial - safeRemaining).toFixed(1)));
  const remainingPercent = Math.min(
    100,
    Math.max(0, Math.round((safeRemaining / safeInitial) * 100))
  );

  // Hitung panjang garis lingkaran SVG (r = 40) sesuai persentase sisa kuota
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference - (remainingPercent / 100) * circumference;

  const ringStrokeClass = !isEligibleAnnualLeave
    ? "stroke-amber-500"
    : remainingPercent > 50
      ? "stroke-emerald-600"
      : remainingPercent > 20
        ? "stroke-amber-500"
        : "stroke-rose-600";

  return (
    <section className="flex h-full flex-col justify-between rounded-xl border border-stone-200 bg-white p-5">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-[#0F172A]">
              Ringkasan Kelayakan &amp; Kuota Tahunan
            </h3>
            <p className="mt-0.5 text-xs text-slate-600">
              Saldo desimal realtime dengan syarat masa kerja &ge; 1 tahun.
            </p>
          </div>
          <StatusBadge
            status={isEligibleAnnualLeave ? "Eligible" : "Belum Eligible"}
          />
        </div>

        {/* Donut sisa kuota dan rincian angka */}
        <div className="mt-5 flex flex-col items-center gap-5 sm:flex-row">
          <div className="relative flex h-28 w-28 shrink-0 items-center justify-center">
            <svg
              role="img"
              aria-label={`Sisa kuota cuti tahunan ${formatDecimalDays(safeRemaining)} dari ${formatDecimalDays(safeInitial)} hari (${remainingPercent}%)`}
              viewBox="0 0 100 100"
              className="h-28 w-28 -rotate-90"
            >
              <circle
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                strokeWidth="9"
                className="stroke-stone-200"
              />
              <circle
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                strokeWidth="9"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className={`transition-all duration-300 ${ringStrokeClass}`}
              />
            </svg>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-xl font-bold leading-none tracking-tight tabular-nums text-[#0F172A]">
                {formatDecimalDays(safeRemaining)}
              </span>
              <span className="mt-1 text-[10px] font-semibold uppercase tracking-wider tabular-nums text-slate-500">
                / {formatDecimalDays(safeInitial)} Hr
              </span>
            </div>
          </div>

          <div className="grid w-full flex-1 grid-cols-3 gap-2 text-center sm:grid-cols-1 sm:text-left">
            <div className="flex flex-col justify-between rounded-lg border border-stone-200 bg-[#F4F2EC]/60 px-3 py-2 sm:flex-row sm:items-center">
              <span className="text-[11px] font-medium text-slate-600">
                Kuota Awal
              </span>
              <span className="text-xs font-bold tabular-nums text-[#0F172A]">
                {formatDecimalDays(safeInitial)} Hari
              </span>
            </div>
            <div className="flex flex-col justify-between rounded-lg border border-stone-200 bg-[#F4F2EC]/60 px-3 py-2 sm:flex-row sm:items-center">
              <span className="text-[11px] font-medium text-slate-600">
                Terpakai / Hold
              </span>
              <span className="text-xs font-bold tabular-nums text-amber-800">
                {formatDecimalDays(usedQuota)} Hari
              </span>
            </div>
            <div className="flex flex-col justify-between rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-2 sm:flex-row sm:items-center">
              <span className="text-[11px] font-medium text-emerald-800">
                Sisa Tersedia
              </span>
              <span className="text-xs font-bold tabular-nums text-emerald-800">
                {remainingPercent}% ({formatDecimalDays(safeRemaining)} Hr)
              </span>
            </div>
          </div>
        </div>

        {/* Info tanggal gabung & lama kerja */}
        <dl className="mt-4 grid grid-cols-2 gap-3 rounded-lg border border-stone-200 bg-[#F4F2EC]/60 p-3 text-xs">
          <div>
            <dt className="flex items-center gap-1.5 font-medium text-slate-600">
              <CalendarCheck2
                className="h-3.5 w-3.5 text-slate-500"
                aria-hidden="true"
              />
              Tanggal Bergabung
            </dt>
            <dd className="mt-1 font-semibold tabular-nums text-[#0F172A]">
              {joinDate}
            </dd>
          </div>
          <div>
            <dt className="flex items-center gap-1.5 font-medium text-slate-600">
              <Clock
                className="h-3.5 w-3.5 text-slate-500"
                aria-hidden="true"
              />
              Masa Kerja
            </dt>
            <dd className="mt-1 font-semibold tabular-nums text-[#0F172A]">
              {tenureLabel}
            </dd>
          </div>
        </dl>
      </div>

      {/* Keterangan syarat masa kerja */}
      <div
        className={`mt-4 flex items-start gap-2 rounded-lg border px-3 py-2.5 text-xs ${
          isEligibleAnnualLeave
            ? "border-emerald-200 bg-emerald-50/70 text-emerald-900"
            : "border-amber-200 bg-amber-50 text-amber-900"
        }`}
      >
        {isEligibleAnnualLeave ? (
          <ShieldCheck
            className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700"
            aria-hidden="true"
          />
        ) : (
          <ShieldAlert
            className="mt-0.5 h-4 w-4 shrink-0 text-amber-700"
            aria-hidden="true"
          />
        )}
        <p className="leading-relaxed">
          {isEligibleAnnualLeave
            ? "Masa kerja Anda memenuhi syarat ≥ 1 tahun untuk Cuti Tahunan (min. H-3)."
            : "Masa kerja < 1 tahun: Cuti Tahunan diblokir otomatis, namun Cuti Sakit & Cuti Lainnya tetap tersedia."}
        </p>
      </div>
    </section>
  );
}
