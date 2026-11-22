import { CalendarCheck2, Clock, ShieldAlert, ShieldCheck } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import QuotaPrecisionRuler from "@/components/ui/QuotaPrecisionRuler";

function formatDecimalDays(value) {
  const num = Number(value ?? 0);
  return Number.isNaN(num) ? "0.0" : num.toFixed(1);
}

/**
 * Panel ringkasan kelayakan & sisa kuota tahunan (mendukung desimal 0.5)
 * bergaya Swiss Archival dengan 12-Day Precision Ruler.
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

  return (
    <section className="panel flex h-full flex-col justify-between">
      <div className="panel-head">
        <div>
          <span className="panel-eyebrow">Saldo Kuota Tahunan</span>
          <h3 className="panel-title">Kelayakan &amp; Saldo Kuota</h3>
        </div>
        <StatusBadge
          status={isEligibleAnnualLeave ? "Eligible" : "Belum Eligible"}
        />
      </div>

      <div className="panel-body flex flex-1 flex-col justify-between gap-4">
        <div className="space-y-4">
          {/* Angka Utama Saldo */}
          <div className="flex items-baseline justify-between gap-3">
            <div className="font-serif text-[40px] font-semibold leading-none text-[var(--spruce)] tabular-nums">
              {formatDecimalDays(safeRemaining)}{" "}
              <span className="font-sans text-sm font-normal text-[var(--ink-soft)]">
                dari {formatDecimalDays(safeInitial)} hari kerja
              </span>
            </div>
            <span className="mono text-xs font-semibold text-[var(--ink-muted)]">
              {remainingPercent}%
            </span>
          </div>

          {/* 12-Day Precision Ruler */}
          <QuotaPrecisionRuler
            total={safeInitial}
            remaining={safeRemaining}
            delta={0}
          />

          {/* 3-Cell KPI Strip */}
          <div className="quota-kpi-row">
            <div className="quota-kpi-cell">
              <span className="metric-label block">Kuota Awal</span>
              <span className="mono mt-0.5 block text-sm font-semibold text-[var(--ink)]">
                {formatDecimalDays(safeInitial)} hr
              </span>
            </div>
            <div className="quota-kpi-cell">
              <span className="metric-label block">Terpakai / Hold</span>
              <span className="mono mt-0.5 block text-sm font-semibold text-[var(--ochre)]">
                {formatDecimalDays(usedQuota)} hr
              </span>
            </div>
            <div className="quota-kpi-cell">
              <span className="metric-label block">Tersedia</span>
              <span className="mono mt-0.5 block text-sm font-semibold text-[var(--spruce)]">
                {formatDecimalDays(safeRemaining)} hr
              </span>
            </div>
          </div>

          {/* Info tanggal gabung & lama kerja */}
          <dl className="grid grid-cols-2 gap-3 border border-[var(--rule)] bg-[var(--alabaster)] p-3 text-xs">
            <div>
              <dt className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.05em] text-[var(--ink-muted)]">
                <CalendarCheck2 className="h-3.5 w-3.5" aria-hidden="true" />
                Bergabung
              </dt>
              <dd className="mono mt-1 font-semibold text-[var(--ink)]">
                {joinDate}
              </dd>
            </div>
            <div>
              <dt className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.05em] text-[var(--ink-muted)]">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                Masa Kerja
              </dt>
              <dd className="mono mt-1 font-semibold text-[var(--ink)]">
                {tenureLabel}
              </dd>
            </div>
          </dl>
        </div>

        {/* Keterangan syarat masa kerja */}
        <div
          className={`notice ${
            isEligibleAnnualLeave ? "notice-success" : "notice-warn"
          }`}
        >
          {isEligibleAnnualLeave ? (
            <ShieldCheck aria-hidden="true" />
          ) : (
            <ShieldAlert aria-hidden="true" />
          )}
          <p className="m-0 leading-relaxed">
            {isEligibleAnnualLeave
              ? "Masa kerja Anda memenuhi syarat ≥ 1 tahun untuk Cuti Tahunan (min. H-3)."
              : "Masa kerja < 1 tahun: Cuti Tahunan diblokir otomatis, namun Cuti Sakit & Cuti Lainnya tetap tersedia."}
          </p>
        </div>
      </div>
    </section>
  );
}
