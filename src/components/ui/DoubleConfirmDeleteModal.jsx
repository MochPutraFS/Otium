"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Loader2,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";

/**
 * Modal Konfirmasi 2 Tahap (Double Confirmation) khusus penghapusan Divisi oleh Admin
 * bergaya Swiss Archival. Menjamin akun anggota tidak terhapus (`division_id = NULL`).
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
        <div className="flex max-h-[calc(100dvh-2rem)] w-full flex-col overflow-hidden rounded-[2px] border border-[var(--ink)] bg-[var(--paper-pure)] text-[var(--ink)] shadow-2xl">
          {/* Header Modal */}
          <div
            className={`flex items-start justify-between gap-3 border-b border-[var(--rule)] px-5 py-4 ${
              step === 2 ? "bg-[var(--terracotta-tint)]" : "bg-[var(--paper)]"
            }`}
          >
            <div>
              <span
                className={`panel-eyebrow ${
                  step === 2
                    ? "!text-[var(--terracotta)]"
                    : "!text-[var(--ochre)]"
                }`}
              >
                Konfirmasi Tahap {step} dari 2 (Double Confirmation)
              </span>
              <h2
                id={titleId}
                className="font-serif text-2xl font-semibold leading-tight text-[var(--ink)]"
              >
                {step === 1
                  ? `Hapus Divisi "${division.name}"?`
                  : "Konfirmasi Akhir Penghapusan Divisi"}
              </h2>
            </div>

            <button
              type="button"
              disabled={isDeleting}
              onClick={() => onClose?.()}
              aria-label="Tutup modal konfirmasi hapus divisi"
              className="btn btn-icon shrink-0"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {/* Body Modal */}
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5 text-xs text-[var(--ink-soft)]">
            {errorMessage && (
              <div role="alert" className="notice notice-danger">
                <AlertCircle aria-hidden="true" />
                <span>{errorMessage}</span>
              </div>
            )}

            {step === 1 ? (
              <>
                <p className="text-sm leading-relaxed text-[var(--ink)]">
                  Anda akan menghapus divisi{" "}
                  <strong className="font-semibold">{division.name}</strong>{" "}
                  yang saat ini menaungi{" "}
                  <strong className="mono font-semibold">
                    {memberCount} anggota
                  </strong>
                  .
                </p>

                {/* Jaminan keamanan akun anggota */}
                <div className="notice notice-success">
                  <ShieldCheck aria-hidden="true" />
                  <div className="space-y-1">
                    <p className="m-0 font-semibold">
                      Jaminan Keutuhan Akun Anggota (ON DELETE SET NULL)
                    </p>
                    <ul className="list-disc space-y-0.5 pl-4">
                      <li>
                        Seluruh {memberCount} akun anggota{" "}
                        <strong>TIDAK AKAN TERHAPUS</strong> dari sistem.
                      </li>
                      <li>
                        Atribut divisi dilepas otomatis menjadi{" "}
                        <code className="mono">division_id = NULL</code> dan
                        dapat ditugaskan ulang ke divisi lain kapan saja.
                      </li>
                    </ul>
                  </div>
                </div>

                {memberCount > 0 && (
                  <div className="border border-[var(--rule)] bg-[var(--paper)] p-3.5">
                    <p className="panel-eyebrow mb-2">
                      Anggota yang akan dilepas dari divisi ini:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {members.slice(0, 8).map((member) => (
                        <span key={member.id} className="tag">
                          {member.fullName}
                          {member.id === division.leaderId ? " (Ketua)" : ""}
                        </span>
                      ))}
                      {memberCount > 8 && (
                        <span className="tag tag-pending">
                          +{memberCount - 8} lainnya
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="notice notice-danger">
                  <AlertCircle aria-hidden="true" />
                  <div>
                    <p className="m-0 font-semibold uppercase tracking-[0.04em]">
                      Peringatan Konfirmasi Kedua
                    </p>
                    <p className="mt-1 leading-relaxed">
                      Penghapusan divisi <strong>{division.name}</strong>{" "}
                      bersifat permanen. Seluruh{" "}
                      <strong>{memberCount} anggota</strong> akan memiliki{" "}
                      <code className="mono">division_id = NULL</code>,
                      sementara akun mereka tetap aktif di sistem.
                    </p>
                  </div>
                </div>

                <label className="otium-checkbox-label flex cursor-pointer items-start gap-3 border border-[var(--rule-strong)] bg-[var(--paper)] p-3.5 transition-colors hover:bg-[var(--alabaster)]">
                  <input
                    type="checkbox"
                    checked={isAcknowledged}
                    disabled={isDeleting}
                    onChange={(e) => setIsAcknowledged(e.target.checked)}
                    className="otium-checkbox mt-0.5 h-4 w-4 shrink-0 cursor-pointer"
                  />
                  <span className="text-xs font-medium leading-relaxed text-[var(--ink)]">
                    Saya memahami dampak penghapusan divisi{" "}
                    <strong>{division.name}</strong> dan mengonfirmasi
                    penghapusan tahap ke-2 secara sadar.
                  </span>
                </label>
              </>
            )}
          </div>

          {/* Footer Modal */}
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--rule)] bg-[var(--alabaster)] px-5 py-3.5">
            {step === 1 ? (
              <>
                <button
                  type="button"
                  autoFocus
                  disabled={isDeleting}
                  onClick={() => onClose?.()}
                  className="btn btn-sm"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setStep(2)}
                  className="btn btn-primary btn-sm"
                >
                  <span>Lanjut ke Konfirmasi Akhir</span>
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
                  className="btn btn-sm"
                >
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Kembali</span>
                </button>
                <button
                  type="button"
                  disabled={!isAcknowledged || isDeleting}
                  onClick={() => {
                    if (!isAcknowledged || isDeleting) return;
                    onConfirmDelete?.(division);
                  }}
                  className="btn btn-danger btn-sm"
                >
                  {isDeleting ? (
                    <Loader2
                      className="h-3.5 w-3.5 animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  <span>
                    {isDeleting ? "Menghapus..." : "Hapus Divisi Permanen"}
                  </span>
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </dialog>
  );
}
