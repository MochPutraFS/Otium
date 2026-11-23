"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AlertCircle, Loader2, RotateCcw, X } from "lucide-react";
import { formatIndonesianDateRange } from "@/lib/date-utils";

/**
 * Modal Konfirmasi Pembatalan Pengajuan Cuti bergaya Swiss Archival (khusus status `Pending`).
 * Menggunakan native `<dialog className="otium-modal" closedby="any">` dengan `autoFocus`
 * pada tombol aman ("Kembali") serta validasi alasan 5–500 karakter.
 */
export default function CancelLeaveModal({
  isOpen,
  request,
  isSubmitting = false,
  serverError = "",
  onClose,
  onConfirm,
}) {
  const dialogRef = useRef(null);
  const textareaRef = useRef(null);

  const titleId = useId();
  const reasonId = useId();
  const reasonHelpId = useId();
  const reasonErrorId = useId();

  const [reason, setReason] = useState("");
  const [fieldError, setFieldError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setReason("");
      setFieldError("");
    }
  }, [isOpen, request?.id]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && request) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [isOpen, request]);

  // Fallback light-dismiss untuk browser tanpa `closedBy`
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !isOpen) return undefined;
    if ("closedBy" in HTMLDialogElement.prototype) return undefined;

    const isOutside = (event) => {
      const rect = dialog.getBoundingClientRect();
      return (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      );
    };

    let pressedOutside = false;
    const handlePointerDown = (event) => {
      pressedOutside = isOutside(event);
    };
    const handlePointerUp = (event) => {
      if (pressedOutside && isOutside(event) && !isSubmitting) {
        dialog.close();
      }
      pressedOutside = false;
    };

    dialog.addEventListener("pointerdown", handlePointerDown);
    dialog.addEventListener("pointerup", handlePointerUp);
    return () => {
      dialog.removeEventListener("pointerdown", handlePointerDown);
      dialog.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isOpen, isSubmitting]);

  function handleDialogCancel(event) {
    if (isSubmitting) {
      event.preventDefault();
      return;
    }
    onClose();
  }

  function handleDialogClose() {
    if (dialogRef.current) {
      dialogRef.current.returnValue = "";
    }
    if (isOpen) {
      onClose();
    }
  }

  function validateReason(value) {
    const trimmed = value.trim();
    if (trimmed.length < 5) {
      return "Alasan pembatalan wajib diisi minimal 5 karakter.";
    }
    if (trimmed.length > 500) {
      return "Alasan pembatalan maksimal 500 karakter.";
    }
    return "";
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!request || isSubmitting) return;

    const validationMsg = validateReason(reason);
    if (validationMsg) {
      setFieldError(validationMsg);
      textareaRef.current?.focus();
      return;
    }

    setFieldError("");
    await onConfirm(request.id, reason.trim());
  }

  const activeError = fieldError || serverError;
  const isInvalid = Boolean(fieldError);

  return (
    <dialog
      ref={dialogRef}
      closedby={isSubmitting ? "none" : "any"}
      aria-labelledby={titleId}
      onCancel={handleDialogCancel}
      onClose={handleDialogClose}
      className="otium-modal w-full max-w-md"
    >
      {request && (
        <div className="w-full overflow-hidden rounded-[2px] border border-[var(--ink)] bg-[var(--paper-pure)] text-[var(--ink)] shadow-2xl">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 border-b border-[var(--rule)] bg-[var(--paper)] px-5 py-4">
            <div>
              <span className="panel-eyebrow !text-[var(--terracotta)]">
                Konfirmasi Pembatalan
              </span>
              <h2
                id={titleId}
                className="font-serif text-2xl font-semibold leading-tight text-[var(--ink)]"
              >
                Batalkan Pengajuan Cuti?
              </h2>
              <p className="mt-1 text-xs text-[var(--ink-soft)]">
                <strong className="font-semibold text-[var(--ink)]">
                  {request.leaveTypeName}
                </strong>{" "}
                &bull;{" "}
                <span className="mono">
                  {formatIndonesianDateRange(
                    request.startDate,
                    request.endDate,
                    request.isHalfDay
                  )}{" "}
                  ({Number(request.totalDays).toFixed(1)} hr)
                </span>
              </p>
            </div>

            <button
              type="button"
              onClick={() => !isSubmitting && onClose()}
              disabled={isSubmitting}
              aria-label="Tutup modal pembatalan"
              className="btn btn-icon shrink-0"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="p-5">
            {/* Info Dampak Kuota (Auto-Refund) */}
            <div
              className={`notice ${
                request.quotaDeducted ? "notice-success" : "notice-info"
              }`}
            >
              <RotateCcw aria-hidden="true" />
              <p className="m-0 leading-relaxed">
                {request.quotaDeducted ? (
                  <>
                    Status masih <strong>Pending</strong>. Kuota sebesar{" "}
                    <strong className="mono">
                      {Number(request.totalDays).toFixed(1)} Hari
                    </strong>{" "}
                    akan dikembalikan otomatis (<em>Auto-Refund</em>) ke saldo
                    Cuti Tahunan Anda.
                  </>
                ) : (
                  "Pengajuan akan dibatalkan dan diberi cap DIBATALKAN. Pengajuan ini tidak memotong kuota tahunan."
                )}
              </p>
            </div>

            <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-4">
              <div>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <label
                    htmlFor={reasonId}
                    className="text-xs font-semibold text-[var(--ink-soft)]"
                  >
                    Alasan Pembatalan{" "}
                    <span className="text-[var(--terracotta)]">*</span>
                  </label>
                  <span className="mono text-[11px] text-[var(--ink-muted)]">
                    {reason.trim().length}/500
                  </span>
                </div>
                <p
                  id={reasonHelpId}
                  className="mb-1.5 text-[11px] text-[var(--ink-muted)]"
                >
                  Wajib diisi minimal 5 karakter sebagai catatan audit
                  pembatalan.
                </p>

                <textarea
                  ref={textareaRef}
                  id={reasonId}
                  name="cancellationReason"
                  rows={3}
                  required
                  minLength={5}
                  maxLength={500}
                  disabled={isSubmitting}
                  value={reason}
                  aria-invalid={isInvalid ? "true" : "false"}
                  aria-describedby={
                    activeError
                      ? `${reasonHelpId} ${reasonErrorId}`
                      : reasonHelpId
                  }
                  onChange={(e) => {
                    const next = e.target.value;
                    setReason(next);
                    if (fieldError && !validateReason(next)) {
                      setFieldError("");
                    }
                  }}
                  onBlur={() => {
                    if (reason.length > 0) {
                      setFieldError(validateReason(reason));
                    }
                  }}
                  placeholder="Contoh: Jadwal agenda keluarga berubah sehingga cuti ditunda ke bulan depan."
                  className="otium-field-input textarea"
                />

                {activeError && (
                  <p
                    id={reasonErrorId}
                    role="alert"
                    className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-[var(--terracotta)]"
                  >
                    <AlertCircle
                      className="h-3.5 w-3.5 shrink-0"
                      aria-hidden="true"
                    />
                    <span>{activeError}</span>
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-[var(--rule)] pt-4">
                <button
                  type="button"
                  autoFocus
                  disabled={isSubmitting}
                  onClick={() => onClose()}
                  className="btn btn-sm"
                >
                  Kembali
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-danger btn-sm"
                >
                  {isSubmitting && (
                    <Loader2
                      className="h-3.5 w-3.5 animate-spin"
                      aria-hidden="true"
                    />
                  )}
                  <span>
                    {isSubmitting ? "Memproses..." : "Konfirmasi Batalkan"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </dialog>
  );
}
