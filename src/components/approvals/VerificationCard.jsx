"use client";

import {
  CalendarDays,
  CheckCircle2,
  Eye,
  Paperclip,
  UserCheck,
  Zap,
} from "lucide-react";
import {
  formatIndonesianDate,
  formatIndonesianDateRange,
} from "@/lib/date-utils";

// Compact Card antrean aktif untuk Ketua Divisi (mode="leader") & HRD (mode="hrd")
export default function VerificationCard({
  request,
  mode = "leader",
  isSelected = false,
  onToggleSelect,
  onOpenDetail,
  onOpenApprove,
  onOpenReject,
}) {
  const isHrd = mode === "hrd";
  const isDirectLeaderPath = request.applicantRole === "Ketua Divisi";

  return (
    <article
      className={`rounded-2xl border bg-white p-4 shadow-sm transition hover:shadow-md ${
        isSelected
          ? "border-blue-500 ring-2 ring-blue-100"
          : "border-slate-200 hover:border-slate-300"
      }`}
    >
      {/* Baris 1: Identitas Pemohon + Badge Jenis Cuti & Cek Kuota */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {isHrd && (
            <div className="pt-1">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={(event) =>
                  onToggleSelect?.(request.id, event.target.checked)
                }
                aria-label={`Pilih pengajuan ${request.applicantName}`}
                className="h-4 w-4 cursor-pointer rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
            </div>
          )}

          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-700 ring-1 ring-blue-100">
            {request.applicantInitials}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <h3 className="text-sm font-bold text-slate-900">
                {request.applicantName}
              </h3>
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                {request.applicantRole} • {request.divisionName}
              </span>
            </div>
            <p className="mt-0.5 text-[11px] text-slate-400">
              Diajukan {formatIndonesianDate(request.submissionDate)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-100">
            {request.leaveTypeName} • {Number(request.totalDays).toFixed(1)} Hr
            {request.isHalfDay ? " (0.5)" : ""}
          </span>

          {request.deductsAnnualQuota ? (
            <span className="inline-flex items-center rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
              Sisa Kuota: {Number(request.remainingQuota).toFixed(1)} Hr
            </span>
          ) : (
            <span className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600">
              Non-Potong Kuota
            </span>
          )}
        </div>
      </div>

      {/* Baris 2: Periode Tanggal, Handover, Lampiran, & Tombol Aksi */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays
              className="h-3.5 w-3.5 text-slate-400"
              aria-hidden="true"
            />
            <strong className="font-semibold text-slate-800">
              {formatIndonesianDateRange(
                request.startDate,
                request.endDate,
                request.isHalfDay
              )}
            </strong>
          </span>

          <span className="inline-flex items-center gap-1.5">
            <UserCheck
              className="h-3.5 w-3.5 text-slate-400"
              aria-hidden="true"
            />
            <span>
              Handover:{" "}
              <strong className="font-semibold text-slate-800">
                {request.handoverUserName}
              </strong>
            </span>
          </span>

          {request.attachmentName && (
            <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700">
              <Paperclip className="h-3 w-3" aria-hidden="true" />
              Lampiran
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => onOpenDetail(request)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
          >
            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
            Lihat Detail
          </button>
          <button
            type="button"
            onClick={() => onOpenReject(request)}
            className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-600 hover:text-white"
          >
            Tolak
          </button>
          <button
            type="button"
            onClick={() => onOpenApprove(request)}
            className="rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700"
          >
            Setujui
          </button>
        </div>
      </div>

      {/* Baris 3 (Khusus HRD): Strip 1 Baris Histori Persetujuan Atasan / Jalur Langsung */}
      {isHrd && (
        <div
          className={`mt-3 flex items-center gap-2 rounded-xl border px-3 py-2 text-xs ${
            isDirectLeaderPath
              ? "border-amber-200 bg-amber-50/80 text-amber-900"
              : "border-sky-200 bg-sky-50/80 text-sky-900"
          }`}
        >
          {isDirectLeaderPath ? (
            <>
              <Zap
                className="h-3.5 w-3.5 shrink-0 text-amber-600"
                aria-hidden="true"
              />
              <p className="truncate">
                <strong>Jalur 2 (Langsung Ketua Divisi → HRD):</strong>{" "}
                Pengajuan pribadi Ketua Divisi, tanpa verifikasi Tahap 1.
              </p>
            </>
          ) : (
            <>
              <CheckCircle2
                className="h-3.5 w-3.5 shrink-0 text-sky-600"
                aria-hidden="true"
              />
              <p className="truncate">
                <strong>
                  Disetujui {request.leaderApproverName || "Ketua Divisi"}
                </strong>{" "}
                ({request.leaderApprovedAt || "Tahap 1"})
                {request.leaderNotes ? ` — "${request.leaderNotes}"` : ""}
              </p>
            </>
          )}
        </div>
      )}
    </article>
  );
}
