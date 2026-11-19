import {
  CalendarCheck2,
  CheckCircle2,
  Clock,
  Shield,
  ShieldCheck,
} from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import { ROLE_ACCESS_SUMMARIES } from "@/lib/mock-dashboard-data";

// Kartu pengganti QuotaOverviewCard khusus untuk Role Admin & HRD
export default function RoleAccessSummaryCard({
  role,
  joinDate,
  tenureLabel,
  isActive = true,
}) {
  const summary = ROLE_ACCESS_SUMMARIES[role] || ROLE_ACCESS_SUMMARIES.Admin;

  return (
    <section className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              {summary.title}
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">{summary.subtitle}</p>
          </div>
          <StatusBadge status={isActive ? "Aktif" : "Nonaktif"} />
        </div>

        {/* Metadata tanggal bergabung & masa kerja */}
        <dl className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs">
          <div>
            <dt className="flex items-center gap-1.5 font-medium text-slate-500">
              <CalendarCheck2
                className="h-3.5 w-3.5 text-slate-400"
                aria-hidden="true"
              />
              Tanggal Bergabung
            </dt>
            <dd className="mt-1 font-semibold text-slate-800">{joinDate}</dd>
          </div>
          <div>
            <dt className="flex items-center gap-1.5 font-medium text-slate-500">
              <Clock
                className="h-3.5 w-3.5 text-slate-400"
                aria-hidden="true"
              />
              Masa Kerja
            </dt>
            <dd className="mt-1 font-semibold text-slate-800">{tenureLabel}</dd>
          </div>
        </dl>

        {/* Daftar wewenang utama */}
        <div className="mt-4">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            <Shield className="h-3.5 w-3.5" aria-hidden="true" />
            Hak Akses Utama ({role})
          </p>
          <ul className="mt-2.5 space-y-2 text-xs text-slate-700">
            {summary.permissions.map((item) => (
              <li key={item} className="flex items-start gap-2 leading-relaxed">
                <CheckCircle2
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600"
                  aria-hidden="true"
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Catatan proteksi akun Admin/HRD */}
      <div className="mt-4 flex items-start gap-2 rounded-xl border border-blue-200/80 bg-blue-50/70 px-3 py-2.5 text-xs text-blue-800">
        <ShieldCheck
          className="mt-0.5 h-4 w-4 shrink-0 text-blue-600"
          aria-hidden="true"
        />
        <p className="leading-relaxed">{summary.protectionNote}</p>
      </div>
    </section>
  );
}
