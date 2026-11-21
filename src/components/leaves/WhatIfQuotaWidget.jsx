"use client";

import { AlertTriangle, CalendarOff, CheckCircle2, Loader2 } from "lucide-react";
import { formatIndonesianDate } from "@/lib/date-utils";

/**
 * Sidebar ringkas di kanan Form Pengajuan Cuti (Contextual-Only Feedback).
 * Menggunakan bahasa desain Warm Alabaster — Swiss Editorial Minimalism
 * dan elemen native `<progress>` berstandar aksesibilitas modern.
 */
export default function WhatIfQuotaWidget({
  selectedLeaveType,
  totalDays = 0,
  currentQuota = 12.0,
  initialQuota = 12.0,
  holidayHits = [],
  validationErrors = [],
  isCheckingAvailability = false,
}) {
  const deductsAnnual = Boolean(selectedLeaveType?.deductsAnnualQuota);
  const estimatedRemaining = deductsAnnual
    ? Number((currentQuota - totalDays).toFixed(1))
    : currentQuota;
  const isQuotaShort = deductsAnnual && estimatedRemaining < 0;
  const safeMax = Math.max(0.5, Number(initialQuota) || 12);
  const clampedValue = Math.max(0, Math.min(safeMax, estimatedRemaining));

  return (
    <aside
      aria-label="Ringkasan dan simulasi kuota pengajuan cuti"
      className="space-y-4 lg:sticky lg:top-20"
    >
      <div className="rounded-xl border border-stone-200 bg-white p-5">
        <div className="flex items-center justify-between gap-2 border-b border-stone-100 pb-3.5">
          <div className="flex items-center gap-2">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-600">
              Ringkasan Pengajuan
            </h2>
            {isCheckingAvailability && (
              <Loader2
                className="h-3.5 w-3.5 animate-spin text-slate-500"
                aria-label="Memverifikasi ketersediaan ke server"
              />
            )}
          </div>
          {selectedLeaveType && (
            <span className="rounded-md border border-stone-200 bg-[#FAF9F6] px-2.5 py-0.5 text-[11px] font-semibold text-slate-800">
              {selectedLeaveType.name}
            </span>
          )}
        </div>

        {/* Angka Durasi Hari Kerja */}
        <div className="mt-4 flex items-baseline justify-between rounded-lg border border-stone-200 bg-[#FAF9F6] px-4 py-3.5">
          <div>
            <p className="text-xs font-medium text-slate-600">
              Durasi Hari Kerja
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Senin–Jumat, tanpa libur nasional
            </p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold tracking-tight tabular-nums text-slate-900">
              {Number(totalDays).toFixed(1)}
            </span>
            <span className="ml-1 text-xs font-medium text-slate-600">
              Hari
            </span>
          </div>
        </div>

        {/* Info Hari Libur yang Dikecualikan (hanya tampil jika rentang melewati hari libur) */}
        {holidayHits.length > 0 && (
          <div className="mt-3 rounded-lg border border-stone-200 bg-[#FAF9F6] px-3 py-2.5">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">
              <CalendarOff className="h-3.5 w-3.5 shrink-0 text-slate-600" aria-hidden="true" />
              {holidayHits.length} hari libur dikecualikan:
            </p>
            <ul className="mt-1 space-y-0.5 pl-5 text-[11px] text-slate-600">
              {holidayHits.map((h) => (
                <li key={h.holidayDate} className="list-disc">
                  <span className="font-medium text-slate-700">
                    {formatIndonesianDate(h.holidayDate)}
                  </span>{" "}
                  — {h.name}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Blok Simulasi Kuota What-If atau Info Non-Potong Kuota */}
        {deductsAnnual ? (
          <div className="mt-4 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Saldo Saat Ini</span>
              <span className="font-semibold tabular-nums text-slate-900">
                {Number(currentQuota).toFixed(1)} Hari
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Pengajuan Ini</span>
              <span className="font-semibold tabular-nums text-amber-700">
                -{Number(totalDays).toFixed(1)} Hari
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-stone-200 pt-2.5">
              <span className="font-semibold text-slate-800">
                Estimasi Sisa
              </span>
              <span
                className={`text-sm font-bold tabular-nums ${
                  isQuotaShort ? "text-rose-700" : "text-emerald-700"
                }`}
              >
                {estimatedRemaining.toFixed(1)} Hari
              </span>
            </div>

            <progress
              className={`otium-progress ${
                isQuotaShort
                  ? "otium-progress--danger"
                  : "otium-progress--ok"
              }`}
              max={safeMax}
              value={clampedValue}
              aria-label={`Estimasi sisa kuota cuti tahunan ${estimatedRemaining.toFixed(1)} dari ${safeMax.toFixed(1)} hari`}
            />

            <p className="text-[11px] leading-relaxed text-slate-500">
              Kuota ditahan saat berstatus <em>Pending</em> dan dikembalikan
              otomatis apabila pengajuan dibatalkan atau ditolak.
            </p>
          </div>
        ) : (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-2.5 text-xs text-emerald-900">
            <CheckCircle2
              className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700"
              aria-hidden="true"
            />
            <div>
              <p className="font-semibold">Tidak memotong kuota Cuti Tahunan.</p>
              {selectedLeaveType?.maxQuota ? (
                <p className="mt-0.5 text-[11px] text-emerald-800">
                  Batas maksimal jenis cuti ini:{" "}
                  <strong className="tabular-nums">
                    {Number(selectedLeaveType.maxQuota).toFixed(1)} hari
                  </strong>
                  .
                </p>
              ) : null}
            </div>
          </div>
        )}

        {/* Contextual-Only Alerts: HANYA tampil jika ada pelanggaran aturan Garda 3-8 */}
        {validationErrors.length > 0 && (
          <div
            role="alert"
            className="mt-4 space-y-2 border-t border-stone-200 pt-4"
          >
            {validationErrors.map((err, index) => (
              <div
                key={`${err}-${index}`}
                className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800"
              >
                <AlertTriangle
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-700"
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
