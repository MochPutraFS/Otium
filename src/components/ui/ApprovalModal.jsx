"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Info,
  Loader2,
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
  "Jadwal operasional tim sedang padat pada tanggal tersebut.",
  "Catatan serah terima tugas (handover) belum cukup rinci.",
  "Lampiran dokumen pendukung kurang jelas atau belum sesuai.",
];

const MIN_REJECT_REASON_LENGTH = 5;

/**
 * Smart Modal Konfirmasi Approve (catatan opsional) & Reject (alasan wajib >= 5 karakter + info Auto-Refund).
 * Menggunakan native `<dialog className="otium-modal" closedby="any">` + `showModal()`
 * dengan fallback light-dismiss untuk browser tanpa `HTMLDialogElement.prototype.closedBy`,
 * serta validasi pasca-interaksi `.otium-field-input` & sinkronisasi `aria-invalid` / `aria-describedby`.
 */
export default function ApprovalModal({
  isOpen,
  actionType = "Approve",
  approverRole = "Ketua Divisi",
  requestSummary,
  serverError = "",
  onClose,
  onSubmit,
}) {
  const dialogRef = useRef(null);
  const notesInputRef = useRef(null);
  const titleId = useId();
  const notesInputId = useId();
  const notesErrorId = useId();

  const [notes, setNotes] = useState("");
  const [touched, setTouched] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isApprove = actionType === "Approve";
  const isLeader = approverRole === "Ketua Divisi";

  // Reset state saat modal dibuka untuk target atau aksi baru
  useEffect(() => {
    if (isOpen) {
      setNotes("");
      setTouched(false);
      setErrorMsg("");
      setIsSubmitting(false);
    }
  }, [isOpen, actionType, requestSummary?.id]);

  // Sinkronisasi native <dialog> top-layer
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && requestSummary) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [isOpen, requestSummary]);

  // Fallback light-dismiss wajib untuk browser tanpa dukungan `closedby` (mis. Safari)
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !isOpen) return undefined;
    if ("closedBy" in HTMLDialogElement.prototype) return undefined;

    function handleClick(event) {
      if (isSubmitting) return;
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      const isInsideBox =
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width;
      if (!isInsideBox) {
        dialog.close();
      }
    }

    dialog.addEventListener("click", handleClick);
    return () => dialog.removeEventListener("click", handleClick);
  }, [isOpen, isSubmitting]);

  function validateNotes(value) {
    const trimmed = String(value || "").trim();
    if (!isApprove && trimmed.length < MIN_REJECT_REASON_LENGTH) {
      return `Alasan penolakan wajib diisi minimal ${MIN_REJECT_REASON_LENGTH} karakter agar pemohon memahami dasar keputusan.`;
    }
    return "";
  }

  function handleNotesChange(event) {
    const nextValue = event.target.value;
    setNotes(nextValue);
    if (touched || errorMsg) {
      setErrorMsg(validateNotes(nextValue));
    }
  }

  function handleNotesBlur() {
    setTouched(true);
    setErrorMsg(validateNotes(notes));
  }

  function handleDialogCancel(event) {
    if (isSubmitting) {
      event.preventDefault();
    }
  }

  function handleDialogClose() {
    if (!isSubmitting) {
      onClose?.();
    }
  }

  async function handleConfirm(event) {
    event.preventDefault();
    setTouched(true);
    const validationError = validateNotes(notes);
    if (validationError) {
      setErrorMsg(validationError);
      notesInputRef.current?.focus();
      return;
    }

    const trimmed = notes.trim();
    setErrorMsg("");
    setIsSubmitting(true);

    try {
      const result = await onSubmit?.(trimmed);
      // Mendukung pola kontrak { ok, error, fieldErrors } maupun void (backward-compatible HRD)
      if (result && result.ok === false) {
        const msg =
          result.fieldErrors?.notes ||
          result.error ||
          "Gagal memproses keputusan verifikasi.";
        setErrorMsg(msg);
        notesInputRef.current?.focus();
        return;
      }
      dialogRef.current?.close();
    } catch {
      setErrorMsg("Terjadi kesalahan koneksi saat mengirim keputusan.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const willAutoRefund =
    !isApprove &&
    Boolean(requestSummary?.deductsAnnualQuota) &&
    Boolean(requestSummary?.quotaDeducted);

  const quickChips = isApprove ? QUICK_NOTES_APPROVE : QUICK_NOTES_REJECT;
  const activeError = errorMsg || serverError || "";
  const isInvalid = Boolean(activeError);

  return (
    <dialog
      ref={dialogRef}
      closedby="any"
      aria-labelledby={titleId}
      onCancel={handleDialogCancel}
      onClose={handleDialogClose}
      className="otium-modal"
    >
      {requestSummary && (
        <div className="w-full max-w-lg overflow-hidden rounded-xl border border-stone-200 bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 border-b border-stone-200 bg-[#F4F2EC]/60 px-5 py-4">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
                  isApprove
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-rose-200 bg-rose-50 text-rose-700"
                }`}
              >
                {isApprove ? (
                  <CheckCircle2 className="h-4.5 w-4.5" aria-hidden="true" />
                ) : (
                  <XCircle className="h-4.5 w-4.5" aria-hidden="true" />
                )}
              </div>
              <div>
                <h3
                  id={titleId}
                  className="text-sm font-bold tracking-tight text-slate-900"
                >
                  {isApprove
                    ? isLeader
                      ? "Setujui Verifikasi Tahap 1"
                      : "Persetujuan Final HRD"
                    : `Tolak Pengajuan (${approverRole})`}
                </h3>
                <p className="mt-0.5 text-xs text-slate-600">
                  Pastikan detail jadwal &amp; serah terima tugas sudah sesuai.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              disabled={isSubmitting}
              aria-label="Tutup modal konfirmasi"
              className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-stone-300 bg-white text-slate-600 transition-colors hover:border-slate-900 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {/* Form Body */}
          <form
            onSubmit={handleConfirm}
            noValidate
            className="space-y-4 p-5 text-xs"
          >
            {/* Ringkasan Pemohon */}
            <div className="space-y-1.5 rounded-lg border border-stone-200 bg-[#F4F2EC]/50 p-3.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-600">Pemohon</span>
                <span className="text-right font-semibold text-slate-900">
                  {requestSummary.applicantName} ({requestSummary.applicantRole}{" "}
                  • {requestSummary.divisionName})
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-600">Jenis &amp; Durasi</span>
                <span className="font-semibold text-slate-900 tabular-nums">
                  {requestSummary.leaveTypeName} —{" "}
                  {Number(requestSummary.totalDays).toFixed(1)} Hari Kerja
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-600">Periode Cuti</span>
                <span className="font-medium text-slate-800">
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
              <div className="flex items-start gap-2.5 rounded-lg border border-sky-200 bg-sky-50 p-3.5 text-sky-900">
                <Info
                  className="mt-0.5 h-4 w-4 shrink-0 text-sky-700"
                  aria-hidden="true"
                />
                <p className="leading-relaxed">
                  {isLeader ? (
                    <>
                      Status berubah menjadi{" "}
                      <strong>Approved by Leader</strong> dan pengajuan otomatis
                      diteruskan ke antrean{" "}
                      <strong>Persetujuan Final HRD</strong> beserta notifikasi
                      untuk pemohon &amp; tim HRD.
                    </>
                  ) : (
                    <>
                      Status berubah menjadi <strong>Approved (Final)</strong>.{" "}
                      {requestSummary.deductsAnnualQuota
                        ? "Pemotongan kuota cuti tahunan bersifat permanen."
                        : "Jenis cuti ini tidak memotong kuota cuti tahunan."}
                    </>
                  )}
                </p>
              </div>
            ) : (
              <div className="flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 p-3.5 text-rose-900">
                <RotateCcw
                  className="mt-0.5 h-4 w-4 shrink-0 text-rose-700"
                  aria-hidden="true"
                />
                <p className="leading-relaxed">
                  Status berubah menjadi{" "}
                  <strong>Ditolak ({approverRole})</strong>.{" "}
                  {willAutoRefund ? (
                    <>
                      Saldo kuota sebesar{" "}
                      <strong>
                        +{Number(requestSummary.totalDays).toFixed(1)} Hari
                      </strong>{" "}
                      akan <strong>dikembalikan otomatis (Auto-Refund)</strong>{" "}
                      ke saldo pemohon.
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
                  htmlFor={notesInputId}
                  className="font-semibold text-slate-900"
                >
                  {isApprove ? (
                    "Catatan Persetujuan (Opsional)"
                  ) : (
                    <>
                      Alasan Penolakan{" "}
                      <span className="text-rose-700" aria-hidden="true">
                        *
                      </span>
                      <span className="visually-hidden">(wajib diisi)</span>
                    </>
                  )}
                </label>
                <span className="text-[11px] text-slate-500">
                  Saran cepat (1 klik):
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {quickChips.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => {
                      setNotes(chip);
                      setTouched(true);
                      setErrorMsg("");
                    }}
                    className="cursor-pointer rounded-full border border-stone-200 bg-[#F4F2EC] px-2.5 py-1 text-[11px] font-medium text-slate-700 transition-colors hover:border-slate-900 hover:bg-white hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              <textarea
                ref={notesInputRef}
                id={notesInputId}
                rows={3}
                maxLength={500}
                required={!isApprove}
                minLength={!isApprove ? MIN_REJECT_REASON_LENGTH : undefined}
                value={notes}
                disabled={isSubmitting}
                onChange={handleNotesChange}
                onBlur={handleNotesBlur}
                aria-invalid={isInvalid ? "true" : "false"}
                aria-describedby={isInvalid ? notesErrorId : undefined}
                placeholder={
                  isApprove
                    ? "Tuliskan catatan singkat untuk pemohon atau HRD (boleh dikosongkan)..."
                    : "Tuliskan alasan penolakan minimal 5 karakter secara jelas..."
                }
                className="otium-field-input w-full rounded-lg border border-stone-300 bg-white p-3 text-xs text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 disabled:bg-stone-50"
              />

              <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
                <span>
                  {!isApprove
                    ? `Minimal ${MIN_REJECT_REASON_LENGTH} karakter.`
                    : "Opsional — tercatat di riwayat verifikasi."}
                </span>
                <span className="tabular-nums">{notes.length}/500</span>
              </div>

              {isInvalid && (
                <p
                  id={notesErrorId}
                  role="alert"
                  className="flex items-start gap-1.5 text-xs font-medium text-rose-700"
                >
                  <AlertCircle
                    className="mt-0.5 h-3.5 w-3.5 shrink-0"
                    aria-hidden="true"
                  />
                  <span>{activeError}</span>
                </p>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2 border-t border-stone-200 pt-4">
              <button
                type="button"
                onClick={() => dialogRef.current?.close()}
                disabled={isSubmitting}
                className="cursor-pointer rounded-lg border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-900 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 ${
                  isApprove
                    ? "bg-slate-900 hover:bg-slate-800 focus-visible:ring-slate-900"
                    : "bg-rose-700 hover:bg-rose-800 focus-visible:ring-rose-700"
                }`}
              >
                {isSubmitting && (
                  <Loader2
                    className="h-3.5 w-3.5 animate-spin"
                    aria-hidden="true"
                  />
                )}
                {isSubmitting
                  ? "Memproses..."
                  : isApprove
                    ? "Konfirmasi Setujui"
                    : "Konfirmasi Tolak"}
              </button>
            </div>
          </form>
        </div>
      )}
    </dialog>
  );
}
