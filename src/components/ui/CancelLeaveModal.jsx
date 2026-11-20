"use client";

import { useEffect, useState } from "react";
import { AlertCircle, RotateCcw, X } from "lucide-react";
import { formatIndonesianDateRange } from "@/lib/date-utils";

// Modal konfirmasi pembatalan pengajuan cuti (khusus status Pending, alasan WAJIB)
export default function CancelLeaveModal({
  isOpen,
  request,
  onClose,
  onConfirm,
}) {
  const [reason, setReason] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setReason("");
      setErrorMsg("");
      setIsSubmitting(false);
    }
  }, [isOpen, request?.id]);

  useEffect(() => {
    if (!isOpen) return undefined;
    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !request) return null;

  async function handleSubmit(event) {
    event.preventDefault();
    const trimmed = reason.trim();
    if (trimmed.length < 5) {
      setErrorMsg("Alasan pembatalan wajib diisi (minimal 5 karakter).");
      return;
    }

    setErrorMsg("");
    setIsSubmitting(true);
    try {
      await onConfirm(request.id, trimmed);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-leave-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3
              id="cancel-leave-title"
              className="text-base font-bold text-slate-900"
            >
              Batalkan Pengajuan Cuti?
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              {request.leaveTypeName} •{" "}
              {formatIndonesianDateRange(
                request.startDate,
                request.endDate,
                request.isHalfDay
              )}{" "}
              ({Number(request.totalDays).toFixed(1)} Hari)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal pembatalan"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Info dampak kuota */}
        <div
          className={`mt-4 flex items-start gap-2.5 rounded-xl border p-3 text-xs ${
            request.quotaDeducted
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-slate-200 bg-slate-50 text-slate-600"
          }`}
        >
          <RotateCcw className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>
            {request.quotaDeducted
              ? `Kuota sebesar ${Number(request.totalDays).toFixed(1)} Hari akan dikembalikan otomatis (Auto-Refund) ke saldo Cuti Tahunan Anda.`
              : "Pengajuan ini tidak memotong kuota Cuti Tahunan Anda."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label
              htmlFor="cancellation-reason"
              className="mb-1.5 block text-xs font-semibold text-slate-700"
            >
              Alasan Pembatalan <span className="text-rose-600">*</span>
            </label>
            <textarea
              id="cancellation-reason"
              rows={3}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (errorMsg) setErrorMsg("");
              }}
              placeholder="Tuliskan alasan pembatalan secara singkat..."
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            {errorMsg && (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-rose-600">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {errorMsg}
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Kembali
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "Memproses..." : "Batalkan Pengajuan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
