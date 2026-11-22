"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AlertCircle, CheckCheck, Info, Loader2, X } from "lucide-react";
import { formatIndonesianDateRange } from "@/lib/date-utils";

const BULK_QUICK_NOTES = [
  "Disetujui massal (Multi-Approve) HRD sesuai kebijakan perusahaan.",
  "Seluruh jadwal & handover telah diverifikasi, disetujui final.",
];

/**
 * Modal Konfirmasi Multi-Approve HRD (Bulk Approval Atomik) bergaya Swiss Archival.
 * Menggunakan native `<dialog className="otium-modal" closedby="any">`.
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
        <div className="w-full max-w-xl overflow-hidden rounded-[2px] border border-[var(--ink)] bg-[var(--paper-pure)] text-[var(--ink)] shadow-2xl">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 border-b border-[var(--rule)] bg-[var(--paper)] px-5 py-4">
            <div>
              <span className="panel-eyebrow">Otorisasi Kolektif HRD</span>
              <h2
                id={titleId}
                className="font-serif text-2xl font-semibold leading-tight text-[var(--ink)]"
              >
                Konfirmasi Multi-Approve ({selectedRequests.length} Pengajuan)
              </h2>
              <p className="mono mt-1 text-[11px] text-[var(--ink-muted)]">
                Total {totalDaysSum.toFixed(1)} Hari Kerja &bull; Jalur 1:{" "}
                {jalur1Count} &bull; Jalur 2: {jalur2Count}
              </p>
            </div>

            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              disabled={isSubmitting}
              aria-label="Tutup modal konfirmasi Multi-Approve"
              className="btn btn-icon shrink-0"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <form
            onSubmit={handleSubmit}
            noValidate
            className="space-y-4 p-5 text-xs"
          >
            {/* Ringkasan Atomisitas */}
            <div className="notice notice-info">
              <Info aria-hidden="true" />
              <p className="m-0 leading-relaxed">
                Seluruh <strong>{selectedRequests.length} pengajuan</strong> di
                bawah akan disetujui final (<strong>Approved</strong>) dalam{" "}
                <strong>satu transaksi atomik (All-or-Nothing)</strong>, dicatat
                ke log audit <code className="mono">leave_approvals</code>, dan
                Surat Cuti PDF langsung aktif untuk pemohon.
              </p>
            </div>

            {/* Daftar Ringkas Item Terpilih */}
            <div className="max-h-52 divide-y divide-[var(--rule)] overflow-y-auto border border-[var(--rule-strong)]">
              {selectedRequests.map((req, idx) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between gap-3 bg-[var(--paper-pure)] px-3.5 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[var(--ink)]">
                      <span className="mono mr-1.5 text-[10.5px] text-[var(--ink-muted)]">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      {req.applicantName}{" "}
                      <span className="font-normal text-[var(--ink-muted)]">
                        ({req.applicantRole === "Ketua Divisi" ? "Jalur 2" : "Jalur 1"} &bull; {req.divisionName})
                      </span>
                    </p>
                    <p className="mono mt-0.5 truncate text-[11px] text-[var(--ink-soft)]">
                      {req.leaveTypeName} &mdash;{" "}
                      {formatIndonesianDateRange(
                        req.startDate,
                        req.endDate,
                        req.isHalfDay
                      )}
                    </p>
                  </div>
                  <span className="tag shrink-0">
                    {Number(req.totalDays).toFixed(1)} hr
                  </span>
                </div>
              ))}
            </div>

            {/* Catatan Massal */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label
                  htmlFor={notesInputId}
                  className="font-semibold text-[var(--ink-soft)]"
                >
                  Catatan Massal HRD (Opsional)
                </label>
                <span className="text-[11px] text-[var(--ink-muted)]">
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
                    className="btn btn-sm !min-h-[26px] !text-[11px]"
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
                className="otium-field-input textarea"
              />
              <div className="mono flex justify-end text-[11px] text-[var(--ink-muted)]">
                {notes.length}/500
              </div>
            </div>

            {errorMsg && (
              <div id={errorId} role="alert" className="notice notice-danger">
                <AlertCircle aria-hidden="true" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Footer */}
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
                className="btn btn-primary btn-sm"
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
