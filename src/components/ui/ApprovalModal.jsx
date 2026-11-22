"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AlertCircle, Info, Loader2, RotateCcw, X } from "lucide-react";
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
 * Smart Modal Konfirmasi Approve (catatan opsional) & Reject (alasan wajib >= 5 karakter + Auto-Refund)
 * bergaya Swiss Archival menggunakan native `<dialog className="otium-modal" closedby="any">`.
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

  useEffect(() => {
    if (isOpen) {
      setNotes("");
      setTouched(false);
      setErrorMsg("");
      setIsSubmitting(false);
    }
  }, [isOpen, actionType, requestSummary?.id]);

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
        <div className="w-full max-w-lg overflow-hidden rounded-[2px] border border-[var(--ink)] bg-[var(--paper-pure)] text-[var(--ink)] shadow-2xl">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 border-b border-[var(--rule)] bg-[var(--paper)] px-5 py-4">
            <div>
              <span
                className={`panel-eyebrow ${
                  isApprove
                    ? "!text-[var(--spruce)]"
                    : "!text-[var(--terracotta)]"
                }`}
              >
                {isApprove ? "Otorisasi Paraf" : "Penolakan Pengajuan"} &bull;{" "}
                {approverRole}
              </span>
              <h3
                id={titleId}
                className="font-serif text-2xl font-semibold leading-tight text-[var(--ink)]"
              >
                {isApprove
                  ? isLeader
                    ? "Paraf Verifikasi Tahap 1"
                    : "Paraf Persetujuan Final HRD"
                  : `Tolak Pengajuan (${approverRole})`}
              </h3>
              <p className="mt-0.5 text-xs text-[var(--ink-soft)]">
                Pastikan detail jadwal &amp; serah terima tugas sudah sesuai.
              </p>
            </div>

            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              disabled={isSubmitting}
              aria-label="Tutup modal konfirmasi"
              className="btn btn-icon shrink-0"
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
            <div className="space-y-1.5 border border-[var(--rule)] bg-[var(--paper)] p-3.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[var(--ink-muted)]">Pemohon</span>
                <span className="text-right font-semibold text-[var(--ink)]">
                  {requestSummary.applicantName} ({requestSummary.applicantRole}{" "}
                  &bull; {requestSummary.divisionName})
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[var(--ink-muted)]">
                  Jenis &amp; Durasi
                </span>
                <span className="mono font-semibold text-[var(--ink)]">
                  {requestSummary.leaveTypeName} &mdash;{" "}
                  {Number(requestSummary.totalDays).toFixed(1)} hr
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[var(--ink-muted)]">Periode Cuti</span>
                <span className="mono font-medium text-[var(--ink-soft)]">
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
              <div className="notice notice-info">
                <Info aria-hidden="true" />
                <p className="m-0 leading-relaxed">
                  {isLeader ? (
                    <>
                      Status berubah menjadi{" "}
                      <strong>Approved by Leader</strong> dan pengajuan otomatis
                      diteruskan ke antrean{" "}
                      <strong>Persetujuan Final HRD</strong>.
                    </>
                  ) : (
                    <>
                      Status berubah menjadi <strong>Approved (Final)</strong>.{" "}
                      {requestSummary.deductsAnnualQuota
                        ? "Pemotongan kuota cuti tahunan bersifat permanen dan Surat PDF diterbitkan."
                        : "Jenis cuti ini tidak memotong kuota cuti tahunan."}
                    </>
                  )}
                </p>
              </div>
            ) : (
              <div className="notice notice-danger">
                <RotateCcw aria-hidden="true" />
                <p className="m-0 leading-relaxed">
                  Status berubah menjadi{" "}
                  <strong>Ditolak ({approverRole})</strong> dengan cap DITOLAK.{" "}
                  {willAutoRefund ? (
                    <>
                      Saldo kuota sebesar{" "}
                      <strong className="mono">
                        +{Number(requestSummary.totalDays).toFixed(1)} Hari
                      </strong>{" "}
                      akan <strong>dikembalikan otomatis (Auto-Refund)</strong>.
                    </>
                  ) : (
                    "Jenis cuti ini tidak memotong kuota cuti tahunan."
                  )}
                </p>
              </div>
            )}

            {/* Quick-Pick Chips + Textarea */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label
                  htmlFor={notesInputId}
                  className="font-semibold text-[var(--ink-soft)]"
                >
                  {isApprove ? (
                    "Catatan Persetujuan (Opsional)"
                  ) : (
                    <>
                      Alasan Penolakan{" "}
                      <span
                        className="text-[var(--terracotta)]"
                        aria-hidden="true"
                      >
                        *
                      </span>
                      <span className="visually-hidden">(wajib diisi)</span>
                    </>
                  )}
                </label>
                <span className="text-[11px] text-[var(--ink-muted)]">
                  Saran cepat:
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
                    className="btn btn-sm !min-h-[26px] !text-[11px]"
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
                    ? "Tuliskan catatan singkat untuk pemohon atau HRD (opsional)..."
                    : "Tuliskan alasan penolakan minimal 5 karakter secara jelas..."
                }
                className="otium-field-input textarea"
              />

              <div className="flex items-center justify-between gap-2 text-[11px] text-[var(--ink-muted)]">
                <span>
                  {!isApprove
                    ? `Minimal ${MIN_REJECT_REASON_LENGTH} karakter.`
                    : "Opsional — tercatat di riwayat verifikasi."}
                </span>
                <span className="mono">{notes.length}/500</span>
              </div>

              {isInvalid && (
                <p
                  id={notesErrorId}
                  role="alert"
                  className="flex items-start gap-1.5 text-xs font-medium text-[var(--terracotta)]"
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
            <div className="flex items-center justify-end gap-2 border-t border-[var(--rule)] pt-4">
              <button
                type="button"
                autoFocus
                onClick={() => dialogRef.current?.close()}
                disabled={isSubmitting}
                className="btn btn-sm"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`btn btn-sm ${
                  isApprove ? "btn-primary" : "btn-danger"
                }`}
              >
                {isSubmitting && (
                  <Loader2
                    className="h-3.5 w-3.5 animate-spin"
                    aria-hidden="true"
                  />
                )}
                <span>
                  {isSubmitting
                    ? "Memproses..."
                    : isApprove
                      ? isLeader
                        ? "Paraf & Teruskan"
                        : "Bubuhkan Paraf Final"
                      : "Tolak Pengajuan"}
                </span>
              </button>
            </div>
          </form>
        </div>
      )}
    </dialog>
  );
}
