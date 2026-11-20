"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";

// Modal konfirmasi 2 tahap (Double Confirmation) khusus penghapusan Divisi oleh Admin.
// Menjamin akun anggota tidak terhapus (division_id dilepas menjadi NULL).
export default function DoubleConfirmDeleteModal({
  isOpen,
  division,
  members = [],
  onClose,
  onConfirmDelete,
}) {
  const [step, setStep] = useState(1);
  const [isAcknowledged, setIsAcknowledged] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setIsAcknowledged(false);
    }
  }, [isOpen, division?.id]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose?.();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !division) return null;

  const memberCount = members.length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="double-confirm-title"
    >
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header Modal */}
        <div
          className={`flex items-start justify-between gap-3 border-b px-5 py-4 ${
            step === 2
              ? "border-rose-200 bg-rose-50/70"
              : "border-slate-200 bg-slate-50/70"
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ${
                step === 2
                  ? "bg-rose-100 text-rose-700 ring-rose-200"
                  : "bg-amber-100 text-amber-700 ring-amber-200"
              }`}
            >
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
                  step === 2
                    ? "bg-rose-600 text-white"
                    : "bg-amber-200/80 text-amber-900"
                }`}
              >
                Konfirmasi Tahap {step} dari 2
              </span>
              <h3
                id="double-confirm-title"
                className="mt-1 text-base font-bold text-slate-900"
              >
                {step === 1
                  ? `Hapus Divisi "${division.name}"?`
                  : "Konfirmasi Akhir Penghapusan Divisi"}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal"
            className="cursor-pointer rounded-lg p-1.5 text-slate-400 transition-colors duration-200 hover:bg-slate-200/70 hover:text-slate-700"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Body Modal */}
        <div className="space-y-4 px-5 py-5 text-sm text-slate-700">
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
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3.5 text-xs text-emerald-900">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck
                    className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
                    aria-hidden="true"
                  />
                  <div className="space-y-1">
                    <p className="font-semibold">
                      Jaminan Keutuhan Akun Anggota (ON DELETE SET NULL)
                    </p>
                    <ul className="list-disc space-y-0.5 pl-4 text-emerald-800">
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
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold text-slate-600">
                    Anggota yang akan dilepas dari divisi ini:
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {members.slice(0, 8).map((member) => (
                      <span
                        key={member.id}
                        className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700"
                      >
                        {member.fullName}
                        {member.role === "Ketua Divisi" ? " (Ketua)" : ""}
                      </span>
                    ))}
                    {memberCount > 8 && (
                      <span className="inline-flex items-center rounded-lg bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        +{memberCount - 8} lainnya
                      </span>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs leading-relaxed text-rose-900">
                <p className="font-bold uppercase tracking-wide text-rose-700">
                  Peringatan Konfirmasi Kedua (Double Confirmation)
                </p>
                <p className="mt-1.5">
                  Penghapusan divisi{" "}
                  <strong className="text-rose-950">{division.name}</strong>{" "}
                  bersifat permanen. Seluruh{" "}
                  <strong>{memberCount} anggota</strong> akan kehilangan relasi
                  divisinya (<code>division_id = NULL</code>), sementara akun
                  mereka tetap aktif di sistem.
                </p>
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5 transition-colors duration-200 hover:bg-slate-100/80">
                <input
                  type="checkbox"
                  checked={isAcknowledged}
                  onChange={(e) => setIsAcknowledged(e.target.checked)}
                  className="mt-0.5 h-4 w-4 cursor-pointer rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                />
                <span className="text-xs font-medium leading-relaxed text-slate-800">
                  Saya memahami dampak penghapusan divisi{" "}
                  <strong>{division.name}</strong> dan mengonfirmasi penghapusan
                  tahap ke-2 secara sadar.
                </span>
              </label>
            </>
          )}
        </div>

        {/* Footer Modal */}
        <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-slate-200 bg-slate-50/70 px-5 py-3.5">
          {step === 1 ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-colors duration-200 hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition-colors duration-200 hover:bg-amber-700"
              >
                Lanjut ke Konfirmasi Akhir
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setIsAcknowledged(false);
                }}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-colors duration-200 hover:bg-slate-100"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                Kembali
              </button>
              <button
                type="button"
                disabled={!isAcknowledged}
                onClick={() => {
                  if (!isAcknowledged) return;
                  onConfirmDelete?.(division);
                }}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition-colors duration-200 hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-rose-300"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                Hapus Divisi Permanen
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
