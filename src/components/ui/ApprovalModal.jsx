"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Info,
  RotateCcw,
  X,
  XCircle,
} from "lucide-react";
import { formatIndonesianDateRange } from "@/lib/date-utils";

const QUICK_NOTES_APPROVE = [
  "Jadwal tim aman, handover sudah dikonfirmasi.",
  "Disetujui sesuai kebijakan perusahaan.",
  "Selamat beristirahat, pastikan kontak darurat aktif.",
];

const QUICK_NOTES_REJECT = [
  "Jadwal sprint/operasional tim sedang padat pada tanggal tersebut.",
  "Catatan serah terima tugas (handover) belum cukup rinci.",
  "Lampiran dokumen pendukung kurang jelas atau belum sesuai.",
];

// Smart Modal Konfirmasi Approve (notes opsional) & Reject (notes wajib + Auto-Refund info)
export default function ApprovalModal({
  isOpen,
  actionType = "Approve",
  approverRole = "Ketua Divisi",
  requestSummary,
  onClose,
  onSubmit,
}) {
  const [notes, setNotes] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isApprove = actionType === "Approve";
  const isLeader = approverRole === "Ketua Divisi";

  useEffect(() => {
    if (isOpen) {
      setNotes("");
      setErrorMsg("");
      setIsSubmitting(false);
    }
  }, [isOpen, actionType, requestSummary?.id]);

  useEffect(() => {
    if (!isOpen) return undefined;
    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !requestSummary) return null;

  const willAutoRefund =
    !isApprove &&
    Boolean(requestSummary.deductsAnnualQuota) &&
    Boolean(requestSummary.quotaDeducted);

  const quickChips = isApprove ? QUICK_NOTES_APPROVE : QUICK_NOTES_REJECT;

  async function handleConfirm(event) {
    event.preventDefault();
    const trimmed = notes.trim();
    if (!isApprove && !trimmed) {
      setErrorMsg(
        "Alasan penolakan wajib diisi agar pemohon mengetahui dasar keputusan."
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(trimmed);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/50 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Box */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="approval-modal-title"
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                isApprove
                  ? "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200"
                  : "bg-rose-50 text-rose-600 ring-1 ring-rose-200"
              }`}
            >
              {isApprove ? (
                <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
              ) : (
                <XCircle className="h-5 w-5" aria-hidden="true" />
              )}
            </div>
            <div>
              <h3
                id="approval-modal-title"
                className="text-sm font-bold text-slate-900"
              >
                {isApprove
                  ? isLeader
                    ? "Setujui Verifikasi Tahap 1"
                    : "Persetujuan Final HRD"
                  : `Tolak Pengajuan (${approverRole})`}
              </h3>
              <p className="text-xs text-slate-500">
                Pastikan detail jadwal &amp; serah terima sudah sesuai.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal konfirmasi"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleConfirm} className="space-y-4 p-5 text-xs">
          {/* Ringkasan Pemohon */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500">Pemohon</span>
              <span className="font-semibold text-slate-900">
                {requestSummary.applicantName} ({requestSummary.applicantRole} •{" "}
                {requestSummary.divisionName})
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500">Jenis &amp; Durasi</span>
              <span className="font-semibold text-slate-900">
                {requestSummary.leaveTypeName} —{" "}
                {Number(requestSummary.totalDays).toFixed(1)} Hari Kerja
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500">Periode Cuti</span>
              <span className="font-medium text-slate-700">
                {formatIndonesianDateRange(
                  requestSummary.startDate,
                  requestSummary.endDate,
                  requestSummary.isHalfDay
                )}
              </span>
            </div>
          </div>

          {/* Kotak Info Dampak Status & Kuota */}
          {isApprove ? (
            <div className="flex items-start gap-2.5 rounded-xl border border-sky-200 bg-sky-50 p-3.5 text-sky-900">
              <Info
                className="mt-0.5 h-4 w-4 shrink-0 text-sky-600"
                aria-hidden="true"
              />
              <p className="leading-relaxed">
                {isLeader ? (
                  <>
                    Status akan berubah menjadi{" "}
                    <strong>Approved by Leader</strong> dan pengajuan otomatis
                    diteruskan ke antrean <strong>Persetujuan Final HRD</strong>
                    .
                  </>
                ) : (
                  <>
                    Status akan berubah menjadi <strong>Approved (Final)</strong>
                    .{" "}
                    {requestSummary.deductsAnnualQuota
                      ? "Pemotongan kuota cuti tahunan bersifat permanen."
                      : "Jenis cuti ini tidak memotong kuota cuti tahunan."}
                  </>
                )}
              </p>
            </div>
          ) : (
            <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-rose-900">
              <RotateCcw
                className="mt-0.5 h-4 w-4 shrink-0 text-rose-600"
                aria-hidden="true"
              />
              <p className="leading-relaxed">
                Status akan berubah menjadi{" "}
                <strong>Ditolak ({approverRole})</strong>.{" "}
                {willAutoRefund ? (
                  <>
                    Saldo kuota sebesar{" "}
                    <strong>
                      +{Number(requestSummary.totalDays).toFixed(1)} Hari
                    </strong>{" "}
                    akan <strong>dikembalikan otomatis (Auto-Refund)</strong> ke
                    saldo pemohon.
                  </>
                ) : (
                  "Jenis cuti ini tidak memotong kuota cuti tahunan sehingga saldo tidak berubah."
                )}
              </p>
            </div>
          )}

          {/* Quick-Pick Chips + Textarea */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label
                htmlFor="approval-notes-input"
                className="font-semibold text-slate-800"
              >
                {isApprove
                  ? "Catatan Persetujuan (Opsional)"
                  : "Alasan Penolakan (WAJIB *)"}
              </label>
              <span className="text-[11px] text-slate-400">
                Saran cepat (1 klik):
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {quickChips.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => {
                    setNotes(chip);
                    setErrorMsg("");
                  }}
                  className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                >
                  {chip}
                </button>
              ))}
            </div>

            <textarea
              id="approval-notes-input"
              rows={3}
              value={notes}
              onChange={(event) => {
                setNotes(event.target.value);
                if (errorMsg) setErrorMsg("");
              }}
              placeholder={
                isApprove
                  ? "Tuliskan catatan singkat untuk pemohon atau HRD (boleh dikosongkan)..."
                  : "Tuliskan alasan penolakan secara jelas..."
              }
              className={`w-full rounded-xl border bg-white p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                errorMsg
                  ? "border-rose-400 focus:ring-rose-200"
                  : "border-slate-200 focus:border-blue-500 focus:ring-blue-100"
              }`}
            />

            {errorMsg && (
              <p className="flex items-center gap-1.5 text-xs font-medium text-rose-600">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>{errorMsg}</span>
              </p>
            )}
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-sm transition disabled:opacity-50 ${
                isApprove
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-rose-600 hover:bg-rose-700"
              }`}
            >
              {isSubmitting
                ? "Memproses..."
                : isApprove
                  ? "Konfirmasi Setujui"
                  : "Konfirmasi Tolak"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
