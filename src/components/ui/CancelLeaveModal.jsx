"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AlertCircle, Loader2, RotateCcw, X } from "lucide-react";
import { formatIndonesianDateRange } from "@/lib/date-utils";

/**
 * Modal Konfirmasi Pembatalan Pengajuan Cuti (Modul 5 — khusus status `Pending`).
 * Menggunakan native `<dialog className="otium-modal" closedby="any">` dengan `showModal()`,
 * `autoFocus` pada tombol aman ("Kembali") untuk konfirmasi destruktif, fallback light-dismiss
 * koordinat pointer untuk browser tanpa `closedBy`, dan validasi textarea pasca-interaksi
 * (`.otium-field-input`, `aria-invalid`, `aria-describedby` kondisional).
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

  // Reset form setiap kali modal dibuka untuk pengajuan baru
  useEffect(() => {
    if (isOpen) {
      setReason("");
      setFieldError("");
    }
  }, [isOpen, request?.id]);

  // Sinkronisasi native <dialog> top-layer via showModal() / close()
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

  // Fallback light-dismiss (pointerdown + pointerup di luar kotak dialog) untuk browser tanpa `closedBy`
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
        <div className="w-full overflow-hidden rounded-xl border border-stone-200 bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 border-b border-stone-200 bg-[#faf9f6] px-5 py-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-rose-700">
                Konfirmasi Pembatalan
              </p>
              <h2
                id={titleId}
                className="mt-0.5 text-base font-bold tracking-tight text-slate-900"
              >
                Batalkan Pengajuan Cuti?
              </h2>
              <p className="mt-1 text-xs text-slate-600">
                <span className="font-semibold text-slate-800">
                  {request.leaveTypeName}
                </span>{" "}
                &bull;{" "}
                {formatIndonesianDateRange(
                  request.startDate,
                  request.endDate,
                  request.isHalfDay
                )}{" "}
                <span className="tabular-nums">
                  ({Number(request.totalDays).toFixed(1)} Hari)
                </span>
              </p>
            </div>

            <button
              type="button"
              onClick={() => !isSubmitting && onClose()}
              disabled={isSubmitting}
              aria-label="Tutup modal pembatalan"
              className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-stone-200 bg-white text-slate-500 transition-colors duration-150 hover:bg-stone-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="p-5">
            {/* Info Dampak Kuota (Auto-Refund) */}
            <div
              className={`flex items-start gap-2.5 rounded-lg border p-3 text-xs leading-relaxed ${
                request.quotaDeducted
                  ? "border-emerald-200 bg-emerald-50/80 text-emerald-900"
                  : "border-stone-200 bg-[#f8f7f4] text-slate-700"
              }`}
            >
              <RotateCcw
                className={`mt-0.5 h-4 w-4 shrink-0 ${
                  request.quotaDeducted ? "text-emerald-700" : "text-slate-500"
                }`}
                aria-hidden="true"
              />
              <p>
                {request.quotaDeducted ? (
                  <>
                    Kuota sebesar{" "}
                    <strong className="tabular-nums">
                      {Number(request.totalDays).toFixed(1)} Hari
                    </strong>{" "}
                    akan dikembalikan otomatis (<em>Auto-Refund</em>) ke saldo
                    Cuti Tahunan Anda.
                  </>
                ) : (
                  "Pengajuan ini tidak memotong kuota Cuti Tahunan Anda."
                )}
              </p>
            </div>

            <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-4">
              <div>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <label
                    htmlFor={reasonId}
                    className="text-xs font-semibold text-slate-800"
                  >
                    Alasan Pembatalan <span className="text-rose-700">*</span>
                  </label>
                  <span className="text-[11px] tabular-nums text-slate-500">
                    {reason.trim().length}/500
                  </span>
                </div>
                <p id={reasonHelpId} className="mb-1.5 text-[11px] text-slate-500">
                  Wajib diisi minimal 5 karakter sebagai catatan audit pembatalan.
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
                  className="otium-field-input w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-slate-900 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-slate-900 disabled:bg-stone-100"
                />

                {activeError && (
                  <p
                    id={reasonErrorId}
                    role="alert"
                    className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-rose-700"
                  >
                    <AlertCircle
                      className="h-3.5 w-3.5 shrink-0"
                      aria-hidden="true"
                    />
                    <span>{activeError}</span>
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-stone-200 pt-4">
                <button
                  type="button"
                  autoFocus
                  disabled={isSubmitting}
                  onClick={() => onClose()}
                  className="cursor-pointer rounded-lg border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-colors duration-150 hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Kembali
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-rose-700 px-4 py-2 text-xs font-semibold text-white transition-colors duration-150 hover:bg-rose-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting && (
                    <Loader2
                      className="h-3.5 w-3.5 animate-spin"
                      aria-hidden="true"
                    />
                  )}
                  {isSubmitting ? "Memproses..." : "Ya, Batalkan Cuti"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </dialog>
  );
}
