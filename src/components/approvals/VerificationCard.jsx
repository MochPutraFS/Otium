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

/**
 * Compact Card antrean aktif untuk Ketua Divisi (`mode="leader"`) & HRD (`mode="hrd"`).
 * Mengikuti bahasa desain Warm Alabaster — Swiss Editorial Minimalism:
 * hairline border `stone-200`, tipografi tajam `slate-900`, foto profil dengan fallback inisial,
 * serta fokus keyboard (`focus-visible`) & `cursor-pointer` di seluruh kontrol interaktif.
 */
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
  const hasAttachment = Boolean(request.attachmentUrl || request.attachmentName);

  return (
    <article
      className={`rounded-xl border bg-white p-4 sm:p-5 transition-colors duration-150 ${
        isSelected
          ? "border-slate-900 ring-1 ring-slate-900"
          : "border-stone-200 hover:border-stone-300"
      }`}
    >
      {/* Baris 1: Identitas Pemohon (Foto/Inisial) + Badge Jenis Cuti & Sisa Kuota */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          {isHrd && (
            <div className="pt-1">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={(event) =>
                  onToggleSelect?.(request.id, event.target.checked)
                }
                aria-label={`Pilih pengajuan ${request.applicantName}`}
                className="otium-checkbox h-4 w-4 cursor-pointer rounded border-stone-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1"
              />
            </div>
          )}

          {request.applicantAvatar ? (
            <img
              src={request.applicantAvatar}
              alt={`Foto profil ${request.applicantName}`}
              className="h-10 w-10 shrink-0 rounded-full border border-stone-200 object-cover bg-[#F4F2EC]"
            />
          ) : (
            <div
              aria-hidden="true"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-stone-200 bg-[#F4F2EC] text-xs font-bold tracking-tight text-slate-800"
            >
              {request.applicantInitials || "KR"}
            </div>
          )}

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold tracking-tight text-slate-900">
                {request.applicantName}
              </h3>
              <span className="inline-flex items-center rounded-full border border-stone-200 bg-[#F4F2EC] px-2 py-0.5 text-[11px] font-medium text-slate-700">
                {request.applicantRole} • {request.divisionName}
              </span>
            </div>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Diajukan {formatIndonesianDate(request.submissionDate)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center rounded-lg border border-stone-200 bg-[#F4F2EC] px-2.5 py-1 text-xs font-semibold text-slate-900 tabular-nums">
            {request.leaveTypeName} • {Number(request.totalDays).toFixed(1)} Hr
            {request.isHalfDay ? " (0.5)" : ""}
          </span>

          {request.deductsAnnualQuota ? (
            <span className="inline-flex items-center rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 tabular-nums">
              Sisa Kuota: {Number(request.remainingQuota).toFixed(1)} Hr
            </span>
          ) : (
            <span className="inline-flex items-center rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600">
              Non-Potong Kuota
            </span>
          )}
        </div>
      </div>

      {/* Ringkasan Alasan Cuti (1-2 baris editorial agar Ketua Divisi dapat memindai cepat) */}
      {request.reason && (
        <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-slate-600">
          {request.reason}
        </p>
      )}

      {/* Baris 2: Periode Tanggal, Handover, Lampiran, & Tombol Aksi */}
      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 border-t border-stone-200/80 pt-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays
              className="h-3.5 w-3.5 shrink-0 text-slate-500"
              aria-hidden="true"
            />
            <strong className="font-semibold text-slate-900">
              {formatIndonesianDateRange(
                request.startDate,
                request.endDate,
                request.isHalfDay
              )}
            </strong>
          </span>

          <span className="inline-flex items-center gap-1.5">
            <UserCheck
              className="h-3.5 w-3.5 shrink-0 text-slate-500"
              aria-hidden="true"
            />
            <span>
              Handover:{" "}
              <strong className="font-semibold text-slate-900">
                {request.handoverUserName}
              </strong>
            </span>
          </span>

          {hasAttachment && (
            <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-800">
              <Paperclip className="h-3 w-3" aria-hidden="true" />
              Lampiran
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onOpenDetail(request)}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 transition-colors duration-150 hover:border-slate-900 hover:bg-[#F4F2EC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1"
          >
            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
            Lihat Detail
          </button>
          <button
            type="button"
            onClick={() => onOpenReject(request)}
            className="cursor-pointer rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-800 transition-colors duration-150 hover:border-rose-700 hover:bg-rose-700 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-700 focus-visible:ring-offset-1"
          >
            Tolak
          </button>
          <button
            type="button"
            onClick={() => onOpenApprove(request)}
            className="cursor-pointer rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors duration-150 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1"
          >
            Setujui
          </button>
        </div>
      </div>

      {/* Baris 3 (Khusus HRD): Strip 1 Baris Histori Persetujuan Atasan / Jalur Langsung */}
      {isHrd && (
        <div
          className={`mt-3 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${
            isDirectLeaderPath
              ? "border-amber-200 bg-amber-50/80 text-amber-900"
              : "border-sky-200 bg-sky-50/80 text-sky-900"
          }`}
        >
          {isDirectLeaderPath ? (
            <>
              <Zap
                className="h-3.5 w-3.5 shrink-0 text-amber-700"
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
                className="h-3.5 w-3.5 shrink-0 text-sky-700"
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
