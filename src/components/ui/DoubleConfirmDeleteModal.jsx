"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Loader2,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";

/**
 * Modal Konfirmasi 2 Tahap (Double Confirmation) khusus penghapusan Divisi oleh Admin.
 * Menggunakan native <dialog className="otium-modal">, checkbox `.otium-checkbox`,
 * dan memfokuskan tombol aman (Batal) saat terbuka.
 * Menjamin akun anggota tidak terhapus (division_id dilepas menjadi NULL).
 */
export default function DoubleConfirmDeleteModal({
  isOpen,
  division,
  members = [],
  isDeleting = false,
  errorMessage = "",
  onClose,
  onConfirmDelete,
}) {
  const dialogRef = useRef(null);
  const titleId = useId();
  const [step, setStep] = useState(1);
  const [isAcknowledged, setIsAcknowledged] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setIsAcknowledged(false);
    }
  }, [isOpen, division?.id]);

  // Sinkronisasi native <dialog>
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && division) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.close();
      dialog.returnValue = "";
    }
  }, [isOpen, division]);

  // Event cancel/close & Safari light-dismiss fallback
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !isOpen || !division) return undefined;

    function handleCancel(event) {
      if (isDeleting) {
        event.preventDefault();
      }
    }

    function handleClose() {
      dialog.returnValue = "";
      if (!isDeleting) {
        onClose?.();
      }
    }

    dialog.addEventListener("cancel", handleCancel);
    dialog.addEventListener("close", handleClose);

    let cleanupPointer = null;
    if (
      typeof HTMLDialogElement !== "undefined" &&
      !("closedBy" in HTMLDialogElement.prototype)
    ) {
      let pressedOutside = false;
      const isOutside = (e) => {
        const rect = dialog.getBoundingClientRect();
        return (
          e.clientX < rect.left ||
          e.clientX > rect.right ||
          e.clientY < rect.top ||
          e.clientY > rect.bottom
        );
      };
      const onPointerDown = (e) => {
        pressedOutside = isOutside(e);
      };
      const onPointerUp = (e) => {
        if (!isDeleting && pressedOutside && isOutside(e)) {
          dialog.close();
        }
        pressedOutside = false;
      };
      dialog.addEventListener("pointerdown", onPointerDown);
      dialog.addEventListener("pointerup", onPointerUp);
      cleanupPointer = () => {
        dialog.removeEventListener("pointerdown", onPointerDown);
        dialog.removeEventListener("pointerup", onPointerUp);
      };
    }

    return () => {
      dialog.removeEventListener("cancel", handleCancel);
      dialog.removeEventListener("close", handleClose);
      cleanupPointer?.();
    };
  }, [isOpen, division, isDeleting, onClose]);

  const memberCount = members.length;

  return (
    <dialog
      ref={dialogRef}
      closedby={isDeleting ? "none" : "any"}
      aria-labelledby={titleId}
      className="otium-modal w-full max-w-lg"
    >
      {division && (
        <div className="flex max-h-[calc(100dvh-2rem)] w-full flex-col overflow-hidden rounded-xl border border-stone-300 bg-white shadow-2xl">
          {/* Header Modal */}
          <div
            className={`flex items-start justify-between gap-3 border-b px-5 py-4 ${
              step === 2
                ? "border-rose-200 bg-rose-50"
                : "border-stone-200 bg-[#F4F2EC]"
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${
                  step === 2
                    ? "border-rose-300 bg-rose-100 text-rose-800"
                    : "border-amber-300 bg-amber-50 text-amber-800"
                }`}
              >
                <AlertTriangle className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <span
                  className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.08em] ${
                    step === 2
                      ? "bg-rose-700 text-white"
                      : "bg-amber-200/80 text-amber-950"
                  }`}
                >
                  Konfirmasi Tahap {step} dari 2
                </span>
                <h2
                  id={titleId}
                  className="mt-1 text-base font-bold tracking-tight text-slate-900"
                >
                  {step === 1
                    ? `Hapus Divisi "${division.name}"?`
                    : "Konfirmasi Akhir Penghapusan Divisi"}
                </h2>
              </div>
            </div>

            <button
              type="button"
              disabled={isDeleting}
              onClick={() => onClose?.()}
              aria-label="Tutup modal konfirmasi hapus divisi"
              className="cursor-pointer rounded-lg p-1.5 text-slate-600 transition-colors duration-150 hover:bg-stone-200/80 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {/* Body Modal */}
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5 text-sm text-slate-700">
            {errorMessage && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-lg border border-rose-300 bg-rose-50 px-3.5 py-3 text-xs font-medium text-rose-950"
              >
                <AlertCircle
                  className="mt-0.5 h-4 w-4 shrink-0 text-rose-700"
                  aria-hidden="true"
                />
                <span>{errorMessage}</span>
              </div>
            )}

            {step === 1 ? (
              <>
                <p className="leading-relaxed">
                  Anda akan menghapus divisi{" "}
                  <strong className="font-semibold text-slate-900">
                    {division.name}
                  </strong>{" "}
                  yang saat ini menaungi{" "}
                  <strong className="font-semibold text-slate-900">
                    {memberCount} anggota
                  </strong>
                  .
                </p>

                {/* Jaminan keamanan akun anggota */}
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3.5 text-xs text-emerald-950">
                  <div className="flex items-start gap-2.5">
                    <ShieldCheck
                      className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700"
                      aria-hidden="true"
                    />
                    <div className="space-y-1">
                      <p className="font-semibold">
                        Jaminan Keutuhan Akun Anggota (ON DELETE SET NULL)
                      </p>
                      <ul className="list-disc space-y-0.5 pl-4 text-emerald-900">
                        <li>
                          Seluruh {memberCount} akun anggota{" "}
                          <strong>TIDAK AKAN TERHAPUS</strong> dari sistem.
                        </li>
                        <li>
                          Atribut divisi mereka akan dilepas otomatis menjadi
                          kosong (<code>division_id = NULL</code>) dan dapat
                          di-assign ulang ke divisi lain kapan saja.
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {memberCount > 0 && (
                  <div className="rounded-xl border border-stone-200 bg-[#F4F2EC]/60 p-3.5">
                    <p className="text-xs font-semibold text-slate-700">
                      Anggota yang akan dilepas dari divisi ini:
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {members.slice(0, 8).map((member) => (
                        <span
                          key={member.id}
                          className="inline-flex items-center rounded-md border border-stone-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-800"
                        >
                          {member.fullName}
                          {member.id === division.leaderId ? " (Ketua)" : ""}
                        </span>
                      ))}
                      {memberCount > 8 && (
                        <span className="inline-flex items-center rounded-md bg-stone-200 px-2.5 py-1 text-xs font-semibold text-slate-800">
                          +{memberCount - 8} lainnya
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs leading-relaxed text-rose-950">
                  <p className="font-bold uppercase tracking-[0.08em] text-rose-800">
                    Peringatan Konfirmasi Kedua (Double Confirmation)
                  </p>
                  <p className="mt-1.5">
                    Penghapusan divisi{" "}
                    <strong className="text-rose-950">{division.name}</strong>{" "}
                    bersifat permanen. Seluruh{" "}
                    <strong>{memberCount} anggota</strong> akan kehilangan
                    relasi divisinya (<code>division_id = NULL</code>),
                    sementara akun mereka tetap aktif di sistem.
                  </p>
                </div>

                <label className="otium-checkbox-label flex cursor-pointer items-start gap-3 rounded-xl border border-stone-300 bg-[#F4F2EC]/60 p-3.5 transition-colors duration-150 hover:bg-[#F4F2EC]">
                  <input
                    type="checkbox"
                    checked={isAcknowledged}
                    disabled={isDeleting}
                    onChange={(e) => setIsAcknowledged(e.target.checked)}
                    className="otium-checkbox mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
                  />
                  <span className="text-xs font-medium leading-relaxed text-slate-900">
                    Saya memahami dampak penghapusan divisi{" "}
                    <strong>{division.name}</strong> dan mengonfirmasi
                    penghapusan tahap ke-2 secara sadar.
                  </span>
                </label>
              </>
            )}
          </div>

          {/* Footer Modal */}
          <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-stone-200 bg-[#F4F2EC]/70 px-5 py-3.5">
            {step === 1 ? (
              <>
                <button
                  type="button"
                  autoFocus
                  disabled={isDeleting}
                  onClick={() => onClose?.()}
                  className="cursor-pointer rounded-lg border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 transition-colors duration-150 hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setStep(2)}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-colors duration-150 hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Lanjut ke Konfirmasi Akhir
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => {
                    setStep(1);
                    setIsAcknowledged(false);
                  }}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 transition-colors duration-150 hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                  Kembali
                </button>
                <button
                  type="button"
                  disabled={!isAcknowledged || isDeleting}
                  onClick={() => {
                    if (!isAcknowledged || isDeleting) return;
                    onConfirmDelete?.(division);
                  }}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-rose-700 px-4 py-2 text-xs font-semibold text-white transition-colors duration-150 hover:bg-rose-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700 disabled:cursor-not-allowed disabled:bg-rose-300"
                >
                  {isDeleting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  {isDeleting ? "Menghapus..." : "Hapus Divisi Permanen"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </dialog>
  );
}
