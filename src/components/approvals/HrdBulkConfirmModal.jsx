"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCheck,
  Info,
  Loader2,
  X,
} from "lucide-react";
import { formatIndonesianDateRange } from "@/lib/date-utils";

const BULK_QUICK_NOTES = [
  "Disetujui massal (Multi-Approve) HRD sesuai kebijakan perusahaan.",
  "Seluruh jadwal & handover telah diverifikasi, disetujui final.",
];

/**
 * Modal Konfirmasi Multi-Approve HRD (Bulk Approval Atomik).
 * Menggunakan native `<dialog className="otium-modal" closedby="any">` + `showModal()`,
 * tanpa `role="dialog"` / `aria-modal` manual, dengan fallback light-dismiss Safari
 * (`pointerdown` + `pointerup` di luar kotak dialog agar drag seleksi teks tidak menutup modal).
 */
export default function HrdBulkConfirmModal({
  isOpen,
  selectedRequests = [],
  initialNotes = "",
  onClose,
  onConfirm,
}) {
  const dialogRef = useRef(null);
  const titleId = useId();
  const notesInputId = useId();
  const errorId = useId();

  const [notes, setNotes] = useState(initialNotes);
  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNotes(initialNotes || "");
      setErrorMsg("");
      setIsSubmitting(false);
    }
  }, [isOpen, initialNotes]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && selectedRequests.length > 0) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [isOpen, selectedRequests.length]);

  // Fallback light-dismiss untuk browser tanpa dukungan `closedby` (mis. Safari)
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
    function handlePointerDown(event) {
      if (isSubmitting) return;
      pressedOutside = isOutside(event);
    }
    function handlePointerUp(event) {
      if (isSubmitting) return;
      if (pressedOutside && isOutside(event)) {
        dialog.close();
      }
      pressedOutside = false;
    }

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
    }
  }

  function handleDialogClose() {
    if (!isSubmitting) {
      onClose?.();
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (selectedRequests.length === 0 || isSubmitting) return;

    setErrorMsg("");
    setIsSubmitting(true);

    try {
      const result = await onConfirm?.(notes.trim());
      if (result && result.ok === false) {
        setErrorMsg(
          result.error || "Gagal memproses Multi-Approve HRD. Silakan coba lagi."
        );
        return;
      }
      dialogRef.current?.close();
    } catch {
      setErrorMsg("Koneksi terputus saat mengeksekusi Multi-Approve HRD.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const totalDaysSum = selectedRequests.reduce(
    (sum, item) => sum + Number(item.totalDays || 0),
    0
  );
  const jalur1Count = selectedRequests.filter(
    (r) => r.applicantRole === "Karyawan"
  ).length;
  const jalur2Count = selectedRequests.filter(
    (r) => r.applicantRole === "Ketua Divisi"
  ).length;

  return (
    <dialog
      ref={dialogRef}
      closedby="any"
      aria-labelledby={titleId}
      onCancel={handleDialogCancel}
      onClose={handleDialogClose}
      className="otium-modal"
    >
      {selectedRequests.length > 0 && (
        <div className="w-full max-w-xl overflow-hidden rounded-xl border border-stone-200 bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 border-b border-stone-200 bg-[#F4F2EC]/70 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700">
                <CheckCheck className="h-4.5 w-4.5" aria-hidden="true" />
              </div>
              <div>
                <h2
                  id={titleId}
                  className="text-sm font-bold tracking-tight text-slate-900"
                >
                  Konfirmasi Multi-Approve HRD ({selectedRequests.length}{" "}
                  Pengajuan)
                </h2>
                <p className="mt-0.5 text-xs text-slate-600 tabular-nums">
                  Total {totalDaysSum.toFixed(1)} Hari Kerja • Jalur 1:{" "}
                  {jalur1Count} • Jalur 2: {jalur2Count}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              disabled={isSubmitting}
              aria-label="Tutup modal konfirmasi Multi-Approve"
              className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-stone-300 bg-white text-slate-600 transition-colors hover:border-slate-900 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4 p-5 text-xs">
            {/* Ringkasan Atomisitas */}
            <div className="flex items-start gap-2.5 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sky-900">
              <Info
                className="mt-0.5 h-4 w-4 shrink-0 text-sky-700"
                aria-hidden="true"
              />
              <p className="leading-relaxed">
                Seluruh <strong>{selectedRequests.length} pengajuan</strong> di
                bawah akan disetujui final (<strong>Approved</strong>) dalam{" "}
                <strong>satu transaksi atomik (All-or-Nothing)</strong>,
                dicatat ke log audit <code>leave_approvals</code>, dan Surat
                Cuti PDF langsung aktif untuk pemohon.
              </p>
            </div>

            {/* Daftar Ringkas Item Terpilih */}
            <div className="max-h-52 overflow-y-auto rounded-lg border border-stone-200 divide-y divide-stone-100">
              {selectedRequests.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between gap-3 bg-white px-3.5 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">
                      {req.applicantName}{" "}
                      <span className="font-normal text-slate-500">
                        ({req.applicantRole === "Ketua Divisi" ? "Jalur 2" : "Jalur 1"} • {req.divisionName})
                      </span>
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-slate-600">
                      {req.leaveTypeName} —{" "}
                      {formatIndonesianDateRange(
                        req.startDate,
                        req.endDate,
                        req.isHalfDay
                      )}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-md border border-stone-200 bg-[#F4F2EC] px-2 py-0.5 text-[11px] font-semibold text-slate-900 tabular-nums">
                    {Number(req.totalDays).toFixed(1)} Hr
                  </span>
                </div>
              ))}
            </div>

            {/* Catatan Massal */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label
                  htmlFor={notesInputId}
                  className="font-semibold text-slate-900"
                >
                  Catatan Massal HRD (Opsional)
                </label>
                <span className="text-[11px] text-slate-500">
                  Diterapkan ke seluruh pengajuan terpilih
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {BULK_QUICK_NOTES.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setNotes(chip)}
                    className="cursor-pointer rounded-full border border-stone-200 bg-[#F4F2EC] px-2.5 py-1 text-[11px] font-medium text-slate-700 transition-colors hover:border-slate-900 hover:bg-white hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              <textarea
                id={notesInputId}
                rows={2}
                maxLength={500}
                value={notes}
                disabled={isSubmitting}
                onChange={(event) => setNotes(event.target.value)}
                aria-invalid={errorMsg ? "true" : "false"}
                aria-describedby={errorMsg ? errorId : undefined}
                placeholder='Kosongkan untuk catatan default: "Disetujui massal (Multi-Approve) HRD."'
                className="otium-field-input w-full rounded-lg border border-stone-300 bg-white p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 disabled:bg-stone-50"
              />
              <div className="flex justify-end text-[11px] text-slate-500 tabular-nums">
                {notes.length}/500
              </div>
            </div>

            {errorMsg && (
              <p
                id={errorId}
                role="alert"
                className="flex items-start gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-800"
              >
                <AlertCircle
                  className="mt-0.5 h-3.5 w-3.5 shrink-0"
                  aria-hidden="true"
                />
                <span>{errorMsg}</span>
              </p>
            )}

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 border-t border-stone-200 pt-4">
              <button
                type="button"
                autoFocus
                onClick={() => dialogRef.current?.close()}
                disabled={isSubmitting}
                className="cursor-pointer rounded-lg border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-900 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2
                      className="h-3.5 w-3.5 animate-spin"
                      aria-hidden="true"
                    />
                    <span>Memproses Batch...</span>
                  </>
                ) : (
                  <>
                    <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>
                      Konfirmasi Setujui ({selectedRequests.length})
                    </span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </dialog>
  );
}
