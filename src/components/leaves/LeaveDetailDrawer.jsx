"use client";

import { useEffect } from "react";
import {
  FileDown,
  Paperclip,
  Phone,
  MapPin,
  UserCheck,
  X,
} from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import {
  formatIndonesianDate,
  formatIndonesianDateRange,
} from "@/lib/date-utils";

// Slide-Over Drawer kanan untuk melihat detail pengajuan & Timeline Approval 2 Jalur
export default function LeaveDetailDrawer({
  request,
  isOpen,
  onClose,
  onOpenCancel,
  onDownloadPdf,
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
        aria-labelledby="leave-drawer-title"
        className="relative z-50 flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <h3
              id="leave-drawer-title"
              className="text-base font-bold text-slate-900"
            >
              {request.leaveTypeName} ({Number(request.totalDays).toFixed(1)}{" "}
              Hari)
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              {formatIndonesianDateRange(
                request.startDate,
                request.endDate,
                request.isHalfDay
              )}
              {request.isHalfDay ? " • Setengah Hari" : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup panel detail"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5 text-xs">
          {/* Status & Tanggal Diajukan */}
          <div className="flex items-center justify-between gap-2">
            <StatusBadge
              status={request.status}
              rejectedByRole={request.rejectedByRole}
            />
            <span className="text-slate-400">
              Diajukan {formatIndonesianDate(request.submissionDate)}
            </span>
          </div>

          {/* Alasan Penolakan (Jika Rejected) */}
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

          {/* Alasan Pembatalan (Jika Cancelled) */}
          {request.status === "Cancelled" && request.cancellationReason && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-slate-700">
              <p className="font-semibold text-slate-800">Alasan Pembatalan</p>
              <p className="mt-1 leading-relaxed text-slate-600">
                {request.cancellationReason}
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

          {/* Handover */}
          <div className="space-y-2 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Serah Terima Tugas (Handover)
            </p>
            <p className="flex items-center gap-1.5 font-semibold text-slate-800">
              <UserCheck
                className="h-3.5 w-3.5 text-blue-600"
                aria-hidden="true"
              />
              {request.handoverUserName || "-"}
            </p>
            <p className="leading-relaxed text-slate-600">
              {request.handoverNotes}
            </p>
          </div>

          {/* Kontak Selama Cuti */}
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Kontak Selama Cuti
            </p>
            <p className="flex items-start gap-1.5 text-slate-600">
              <MapPin
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400"
                aria-hidden="true"
              />
              <span>{request.leaveAddress || "-"}</span>
            </p>
            <p className="flex items-center gap-1.5 text-slate-600">
              <Phone
                className="h-3.5 w-3.5 shrink-0 text-slate-400"
                aria-hidden="true"
              />
              <span>{request.emergencyPhone || "-"}</span>
            </p>
          </div>

          {/* Lampiran (Jika Ada) */}
          {request.attachmentName && (
            <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5">
              <span className="inline-flex min-w-0 items-center gap-2 font-medium text-slate-700">
                <Paperclip
                  className="h-3.5 w-3.5 shrink-0 text-slate-400"
                  aria-hidden="true"
                />
                <span className="truncate">{request.attachmentName}</span>
              </span>
              <button
                type="button"
                onClick={() => onDownloadPdf?.(request, "attachment")}
                className="shrink-0 font-semibold text-blue-600 hover:underline"
              >
                Pratinjau
              </button>
            </div>
          )}

          {/* Timeline Persetujuan Berjenjang (2 Jalur) */}
          <div className="border-t border-slate-100 pt-4">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Timeline Persetujuan
            </p>
            <div className="space-y-0">
              {(request.timeline || []).map((step, idx, arr) => {
                const isLast = idx === arr.length - 1;
                const dotColor =
                  step.state === "done"
                    ? "bg-emerald-500 ring-emerald-100"
                    : step.state === "rejected"
                      ? "bg-rose-500 ring-rose-100"
                      : step.state === "active"
                        ? "bg-amber-500 ring-amber-100"
                        : "bg-slate-300 ring-slate-100";

                return (
                  <div key={`${step.stage}-${idx}`} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span
                        className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ring-4 ${dotColor}`}
                      />
                      {!isLast && (
                        <span className="my-1 w-px flex-1 bg-slate-200" />
                      )}
                    </div>
                    <div className={isLast ? "pb-1" : "pb-4"}>
                      <p className="font-semibold text-slate-800">
                        {step.stage}
                      </p>
                      <p className="text-slate-500">
                        {step.actor} • {step.time}
                      </p>
                      {step.notes && (
                        <p className="mt-1.5 rounded-lg border border-slate-200/80 bg-slate-50 px-2.5 py-1.5 italic text-slate-600">
                          &ldquo;{step.notes}&rdquo;
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Aksi Kontekstual */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50/70 px-5 py-3.5">
          {request.status === "Pending" && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenCancel(request);
              }}
              className="rounded-xl border border-rose-200 bg-white px-3.5 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
            >
              Batalkan Pengajuan
            </button>
          )}

          {request.status === "Approved" && (
            <button
              type="button"
              onClick={() => onDownloadPdf?.(request, "pdf")}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
            >
              <FileDown className="h-3.5 w-3.5" aria-hidden="true" />
              Unduh Surat Cuti (PDF)
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
          >
            Tutup
          </button>
        </div>
      </aside>
    </div>
  );
}
