"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";

// Sidebar ringkas di kanan Form Pengajuan Cuti (Contextual-Only Feedback).
// Hanya menampilkan angka durasi & simulasi kuota; peringatan hanya muncul jika ada pelanggaran aturan.
export default function WhatIfQuotaWidget({
  selectedLeaveType,
  totalDays = 0,
  currentQuota = 12.0,
  initialQuota = 12.0,
  validationErrors = [],
}) {
  const deductsAnnual = Boolean(selectedLeaveType?.deductsAnnualQuota);
  const estimatedRemaining = deductsAnnual
    ? Number((currentQuota - totalDays).toFixed(1))
    : currentQuota;
  const isQuotaShort = deductsAnnual && estimatedRemaining < 0;
  const progressPercent = Math.max(
    0,
    Math.min(100, (estimatedRemaining / Math.max(1, initialQuota)) * 100)
  );

  return (
    <aside className="space-y-4 lg:sticky lg:top-20">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Ringkasan Pengajuan
          </h3>
          {selectedLeaveType && (
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
              {selectedLeaveType.name}
            </span>
          )}
        </div>

        {/* Angka Durasi Hari Kerja */}
        <div className="mt-4 flex items-baseline justify-between rounded-xl border border-slate-200/80 bg-slate-50 px-4 py-3.5">
          <span className="text-xs font-medium text-slate-500">
            Durasi Hari Kerja
          </span>
          <div className="text-right">
            <span className="text-2xl font-bold tabular-nums text-slate-900">
              {Number(totalDays).toFixed(1)}
            </span>
            <span className="ml-1 text-xs font-medium text-slate-500">
              Hari
            </span>
          </div>
        </div>

        {/* Blok Simulasi Kuota What-If atau Info Non-Potong Kuota */}
        {deductsAnnual ? (
          <div className="mt-4 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Saldo Saat Ini</span>
              <span className="font-semibold tabular-nums text-slate-800">
                {Number(currentQuota).toFixed(1)} Hari
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Pengajuan Ini</span>
              <span className="font-semibold tabular-nums text-amber-600">
                -{Number(totalDays).toFixed(1)} Hari
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 pt-2.5">
              <span className="font-semibold text-slate-700">
                Estimasi Sisa
              </span>
              <span
                className={`text-sm font-bold tabular-nums ${
                  isQuotaShort ? "text-rose-600" : "text-emerald-600"
                }`}
              >
                {estimatedRemaining.toFixed(1)} Hari
              </span>
            </div>

            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isQuotaShort ? "bg-rose-500" : "bg-emerald-500"
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <p className="text-[11px] leading-relaxed text-slate-400">
              Kuota ditahan saat berstatus <em>Pending</em> dan kembali otomatis
              jika dibatalkan atau ditolak.
            </p>
          </div>
        ) : (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs font-medium text-emerald-700">
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Tidak memotong kuota Cuti Tahunan.</span>
          </div>
        )}

        {/* Contextual-Only Alerts: HANYA muncul ketika ada syarat yang belum terpenuhi */}
        {validationErrors.length > 0 && (
          <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
            {validationErrors.map((err, index) => (
              <div
                key={`${err}-${index}`}
                className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700"
              >
                <AlertTriangle
                  className="mt-0.5 h-3.5 w-3.5 shrink-0"
                  aria-hidden="true"
                />
                <span>{err}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
