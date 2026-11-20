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
    <section className="flex flex-col justify-between rounded-xl border border-stone-200 bg-white p-5">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-[#0F172A]">
              {summary.title}
            </h3>
            <p className="mt-0.5 text-xs text-slate-600">{summary.subtitle}</p>
          </div>
          <StatusBadge status={isActive ? "Aktif" : "Nonaktif"} />
        </div>

        {/* Metadata tanggal bergabung & masa kerja */}
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

        {/* Daftar wewenang utama */}
        <div className="mt-4">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            <Shield className="h-3.5 w-3.5" aria-hidden="true" />
            Hak Akses Utama ({role})
          </p>
          <ul className="mt-2.5 space-y-2 text-xs text-slate-700">
            {summary.permissions.map((item) => (
              <li key={item} className="flex items-start gap-2 leading-relaxed">
                <CheckCircle2
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700"
                  aria-hidden="true"
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Catatan proteksi akun Admin/HRD */}
      <div className="mt-4 flex items-start gap-2 rounded-lg border border-stone-200 bg-[#F4F2EC]/80 px-3 py-2.5 text-xs text-slate-700">
        <ShieldCheck
          className="mt-0.5 h-4 w-4 shrink-0 text-[#0F172A]"
          aria-hidden="true"
        />
        <p className="leading-relaxed">{summary.protectionNote}</p>
      </div>
    </section>
  );
}
