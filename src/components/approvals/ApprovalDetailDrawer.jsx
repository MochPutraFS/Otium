"use client";

import { useEffect } from "react";
import {
  CheckCircle2,
  MapPin,
  Paperclip,
  Phone,
  UserCheck,
  X,
  XCircle,
} from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import {
  formatIndonesianDate,
  formatIndonesianDateRange,
} from "@/lib/date-utils";

// Slide-Over Drawer kanan untuk inspeksi detail pengajuan pada Portal Ketua Divisi & HRD
export default function ApprovalDetailDrawer({
  request,
  isOpen,
  canTakeAction = false,
  onClose,
  onOpenApprove,
  onOpenReject,
  onPreviewAttachment,
}) {
  useEffect(() => {
    if (!isOpen) return undefined;
    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !request) return null;

  const isLeaderApplicant = request.applicantRole === "Ketua Divisi";

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/40 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="approval-drawer-title"
        className="relative z-50 flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-700 ring-1 ring-blue-100">
              {request.applicantInitials}
            </div>
            <div>
              <h3
                id="approval-drawer-title"
                className="text-sm font-bold text-slate-900"
              >
                {request.applicantName}
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                {request.applicantRole} • {request.divisionName}
              </p>
              <p className="mt-0.5 text-xs font-semibold text-blue-700">
                {request.leaveTypeName} ({Number(request.totalDays).toFixed(1)}{" "}
                Hari) •{" "}
                {formatIndonesianDateRange(
                  request.startDate,
                  request.endDate,
                  request.isHalfDay
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup panel detail"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5 text-xs">
          {/* Status & Tanggal Diajukan */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <StatusBadge
              status={request.status}
              rejectedByRole={request.rejectedByRole}
            />
            <span className="text-slate-400">
              Diajukan {formatIndonesianDate(request.submissionDate)}
            </span>
          </div>

          {/* Info Kuota Pemohon */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Status Kuota Tahunan Pemohon</span>
              <span className="font-bold text-slate-900">
                {request.deductsAnnualQuota
                  ? `Sisa ${Number(request.remainingQuota).toFixed(1)} Hari`
                  : "Tidak Memotong Kuota"}
              </span>
            </div>
            {request.deductsAnnualQuota && (
              <p className="mt-1 text-[11px] text-slate-500">
                {request.quotaDeducted
                  ? `Kuota sebesar ${Number(request.totalDays).toFixed(1)} hari sedang ditahan (Hold) untuk pengajuan ini.`
                  : "Kuota telah dikembalikan otomatis (Auto-Refund) ke saldo pemohon."}
              </p>
            )}
          </div>

          {/* Alasan Penolakan (jika Rejected) */}
          {request.status === "Rejected" && request.rejectionReason && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-rose-800">
              <p className="font-semibold">
                Alasan Penolakan ({request.rejectedByRole || "Approver"})
              </p>
              <p className="mt-1 leading-relaxed text-rose-700">
                {request.rejectionReason}
              </p>
            </div>
          )}

          {/* Alasan Cuti */}
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Alasan Cuti
            </p>
            <p className="leading-relaxed text-slate-700">{request.reason}</p>
          </div>

          {/* Serah Terima Tugas (Handover) */}
          <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Serah Terima Tugas (Handover)
            </p>
            <div className="flex items-center gap-1.5 font-semibold text-slate-800">
              <UserCheck
                className="h-3.5 w-3.5 text-blue-600"
                aria-hidden="true"
              />
              <span>Rekan Pengganti: {request.handoverUserName}</span>
            </div>
            <p className="leading-relaxed text-slate-600">
              {request.handoverNotes}
            </p>
          </div>

          {/* Kontak Darurat & Lampiran */}
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Kontak Selama Cuti &amp; Lampiran
            </p>
            <div className="space-y-1.5 text-slate-700">
              <p className="flex items-start gap-2">
                <MapPin
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400"
                  aria-hidden="true"
                />
                <span>{request.leaveAddress}</span>
              </p>
              <p className="flex items-center gap-2">
                <Phone
                  className="h-3.5 w-3.5 shrink-0 text-slate-400"
                  aria-hidden="true"
                />
                <span>{request.emergencyPhone}</span>
              </p>
            </div>

            {request.attachmentName ? (
              <div className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2.5">
                <span className="flex min-w-0 items-center gap-1.5 font-semibold text-sky-800">
                  <Paperclip className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span className="truncate">{request.attachmentName}</span>
                </span>
                <button
                  type="button"
                  onClick={() => onPreviewAttachment?.(request.attachmentName)}
                  className="shrink-0 text-[11px] font-semibold text-blue-700 underline hover:text-blue-900"
                >
                  Pratinjau
                </button>
              </div>
            ) : (
              <p className="text-slate-400">
                Lampiran dokumen: Tidak diperlukan
              </p>
            )}
          </div>

          {/* Timeline Persetujuan 2 Jalur */}
          <div className="space-y-3 border-t border-slate-200 pt-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Timeline Persetujuan (
              {isLeaderApplicant
                ? "Jalur 2: Langsung HRD"
                : "Jalur 1: Berjenjang 2 Tahap"}
              )
            </p>

            <ol className="space-y-3 border-l-2 border-slate-200 pl-4">
              {/* Step 1: Pengajuan */}
              <li className="relative">
                <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-4 ring-white" />
                <p className="font-semibold text-slate-800">
                  Diajukan — {request.applicantName}
                </p>
                <p className="text-[11px] text-slate-500">
                  {formatIndonesianDate(request.submissionDate)}
                </p>
              </li>

              {/* Step 2: Ketua Divisi (Hanya Jalur 1 / Karyawan) */}
              {!isLeaderApplicant && (
                <li className="relative">
                  <span
                    className={`absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full ring-4 ring-white ${
                      request.rejectedByRole === "Ketua Divisi"
                        ? "bg-rose-500"
                        : request.leaderApproverName
                          ? "bg-emerald-500"
                          : "bg-amber-400"
                    }`}
                  />
                  <p className="font-semibold text-slate-800">
                    Verifikasi Ketua Divisi{" "}
                    {request.leaderApproverName
                      ? `— ${request.leaderApproverName}`
                      : "(Menunggu)"}
                  </p>
                  {request.leaderApprovedAt ? (
                    <p className="text-[11px] text-slate-500">
                      {request.leaderApprovedAt}
                      {request.leaderNotes ? ` • "${request.leaderNotes}"` : ""}
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-400">
                      Menunggu tindakan Ketua Divisi {request.divisionName}
                    </p>
                  )}
                </li>
              )}

              {/* Step Final: HRD */}
              <li className="relative">
                <span
                  className={`absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full ring-4 ring-white ${
                    request.rejectedByRole === "HRD"
                      ? "bg-rose-500"
                      : request.status === "Approved"
                        ? "bg-emerald-500"
                        : "bg-slate-300"
                  }`}
                />
                <p className="font-semibold text-slate-800">
                  Persetujuan Final HRD{" "}
                  {request.hrdApproverName
                    ? `— ${request.hrdApproverName}`
                    : "(Menunggu)"}
                </p>
                {request.hrdApprovedAt ? (
                  <p className="text-[11px] text-slate-500">
                    {request.hrdApprovedAt}
                    {request.hrdNotes ? ` • "${request.hrdNotes}"` : ""}
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-400">
                    {request.status === "Rejected"
                      ? "Dihentikan karena ditolak pada tahap sebelumnya"
                      : "Menunggu persetujuan final HRD"}
                  </p>
                )}
              </li>
            </ol>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50/70 px-5 py-3.5">
          {canTakeAction ? (
            <>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenReject?.(request);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-600 hover:text-white"
              >
                <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                Tolak Pengajuan
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenApprove?.(request);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700"
              >
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                Setujui Pengajuan
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Tutup
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}
