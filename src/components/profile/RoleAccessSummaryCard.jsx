import {
  CalendarCheck2,
  CheckCircle2,
  Clock,
  Shield,
  ShieldCheck,
} from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import { ROLE_ACCESS_METADATA } from "@/lib/role-metadata";

/**
 * Kartu pengganti QuotaOverviewCard khusus untuk Role Admin & HRD.
 */
export default function RoleAccessSummaryCard({
  role,
  joinDate,
  tenureLabel,
  isActive = true,
}) {
  const summary = ROLE_ACCESS_METADATA[role] || ROLE_ACCESS_METADATA.Admin;

  return (
    <section className="panel">
      <div className="panel-body flex flex-col justify-between gap-4">
        <div>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--ink-muted)]">
                OTORITAS PERAN
              </p>
              <h3 className="mt-0.5 font-serif text-[19px] font-semibold leading-snug text-[var(--ink)]">
                {summary.title}
              </h3>
              <p className="mt-0.5 text-[12px] text-[var(--ink-soft)]">
                {summary.subtitle}
              </p>
            </div>
            <StatusBadge status={isActive ? "Aktif" : "Nonaktif"} />
          </div>

          {/* Metadata tanggal bergabung & masa kerja */}
          <dl className="mt-4 grid grid-cols-2 gap-3 rounded-[4px] border border-[var(--rule)] bg-[var(--alabaster)] p-3 text-[12px]">
            <div>
              <dt className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--ink-muted)]">
                <CalendarCheck2 className="h-3 w-3" aria-hidden="true" />
                Bergabung
              </dt>
              <dd className="mt-1 font-mono font-semibold tabular-nums text-[var(--ink)]">
                {joinDate}
              </dd>
            </div>
            <div>
              <dt className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--ink-muted)]">
                <Clock className="h-3 w-3" aria-hidden="true" />
                Masa Kerja
              </dt>
              <dd className="mt-1 font-mono font-semibold tabular-nums text-[var(--ink)]">
                {tenureLabel}
              </dd>
            </div>
          </dl>

          {/* Daftar wewenang utama */}
          <div className="mt-4">
            <p className="flex items-center gap-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--ink-muted)]">
              <Shield className="h-3 w-3" aria-hidden="true" />
              Hak Akses Utama ({role})
            </p>
            <ul className="mt-2.5 space-y-2 text-[12px] text-[var(--ink-soft)]">
              {summary.permissions.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 leading-relaxed"
                >
                  <CheckCircle2
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--spruce)]"
                    aria-hidden="true"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Catatan proteksi akun Admin/HRD */}
        <div className="notice notice-info">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p className="leading-relaxed">{summary.protectionNote}</p>
        </div>
      </div>
    </section>
  );
}
