"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  AlertCircle,
  ExternalLink,
  FileDown,
  Loader2,
  MapPin,
  Paperclip,
  Phone,
  RotateCcw,
  UserCheck,
  X,
} from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import {
  formatIndonesianDate,
  formatIndonesianDateRange,
} from "@/lib/date-utils";

/**
 * Slide-Over Drawer Kanan Detail Pengajuan & Timeline Persetujuan 2 Jalur.
 * Menggunakan native `<dialog className="otium-drawer" closedby="any">` + `showModal()`,
 * memuat data terbaru & histori audit `leave_approvals` via `GET /api/leaves/[id]`,
 * menyediakan tautan pratinjau lampiran nyata (`/uploads/...`) dan cetak Surat Cuti Resmi PDF.
 */
export default function LeaveDetailDrawer({
  request,
  isOpen,
  onClose,
  onOpenCancel,
}) {
  const dialogRef = useRef(null);
  const titleId = useId();

  const [detailData, setDetailData] = useState(request || null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState("");

  // Sinkronisasi native <dialog> top-layer
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

  // Fetch detail terbaru + timeline `leave_approvals` dari GET /api/leaves/[id]
  useEffect(() => {
    if (!isOpen || !request?.id) return undefined;

    const controller = new AbortController();
    setDetailData(request);
    setDetailError("");
    setIsLoadingDetail(true);

    async function fetchDetail() {
      try {
        const res = await fetch(`/api/leaves/${request.id}`, {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          setDetailError(
            data.error || "Gagal menyegarkan detail pengajuan dari server."
          );
          return;
        }
        if (data.request) {
          setDetailData(data.request);
        }
      } catch (err) {
        if (err?.name !== "AbortError") {
          setDetailError("Koneksi terputus saat memuat detail terbaru.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingDetail(false);
        }
      }
    }

    fetchDetail();
    return () => controller.abort();
  }, [isOpen, request]);

  // Fallback light-dismiss untuk browser tanpa dukungan `closedBy`
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
      if (pressedOutside && isOutside(event)) {
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
  }, [isOpen]);

  function handleDialogClose() {
    if (dialogRef.current) {
      dialogRef.current.returnValue = "";
    }
    if (isOpen) {
      onClose();
    }
  }

  const active = detailData || request;

  return (
    <dialog
      ref={dialogRef}
      closedby="any"
      aria-labelledby={titleId}
      onClose={handleDialogClose}
      className="otium-drawer"
    >
      {active && (
        <div className="flex h-full w-full flex-col border-l border-stone-200 bg-white shadow-2xl">
          {/* Header Editorial */}
          <div className="flex items-start justify-between gap-3 border-b border-stone-200 bg-[#faf9f6] px-5 py-4">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                Detail Pengajuan &bull; #{active.id}
              </p>
              <h2
                id={titleId}
                className="mt-0.5 text-base font-bold tracking-tight text-slate-900"
              >
                {active.leaveTypeName}{" "}
                <span className="font-semibold tabular-nums text-slate-600">
                  ({Number(active.totalDays).toFixed(1)} Hari)
                </span>
              </h2>
              <p className="mt-0.5 text-xs text-slate-600">
                {formatIndonesianDateRange(
                  active.startDate,
                  active.endDate,
                  active.isHalfDay
                )}
                {active.isHalfDay ? " • Setengah Hari (0.5)" : ""}
              </p>
            </div>

            <button
              type="button"
              autoFocus
              onClick={onClose}
              aria-label="Tutup panel detail pengajuan"
              className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-stone-200 bg-white text-slate-500 transition-colors duration-150 hover:bg-stone-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {/* Body Scrollable */}
          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5 text-xs">
            {/* Status & Tanggal Diajukan */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3.5">
              <div className="flex items-center gap-2">
                <StatusBadge
                  status={active.status}
                  rejectedByRole={active.rejectedByRole}
                />
                {isLoadingDetail && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                    <Loader2
                      className="h-3 w-3 animate-spin"
                      aria-hidden="true"
                    />
                    Menyegarkan…
                  </span>
                )}
              </div>
              <span className="text-slate-500">
                Diajukan {formatIndonesianDate(active.submissionDate)}
              </span>
            </div>

            {detailError && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900"
              >
                <AlertCircle
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700"
                  aria-hidden="true"
                />
                <span>{detailError}</span>
              </div>
            )}

            {/* Status Kuota */}
            <div className="flex items-center justify-between gap-2 rounded-lg border border-stone-200 bg-[#f8f7f4] px-3.5 py-2.5">
              <span className="font-medium text-slate-600">
                Dampak Kuota Cuti Tahunan
              </span>
              <span className="inline-flex items-center gap-1 font-semibold tabular-nums text-slate-900">
                {active.quotaDeducted ? (
                  <>Memotong {Number(active.totalDays).toFixed(1)} Hari</>
                ) : active.status === "Cancelled" ||
                  active.status === "Rejected" ? (
                  <>
                    <RotateCcw
                      className="h-3 w-3 text-emerald-700"
                      aria-hidden="true"
                    />
                    Tidak Memotong / Sudah Refund
                  </>
                ) : (
                  "Tidak Memotong Kuota"
                )}
              </span>
            </div>

            {/* Alasan Penolakan (Jika Rejected) */}
            {active.status === "Rejected" && active.rejectionReason && (
              <div className="rounded-lg border border-rose-200 bg-rose-50/90 p-3.5 text-rose-900">
                <p className="font-semibold">
                  Alasan Penolakan ({active.rejectedByRole || "Approver"})
                </p>
                <p className="mt-1 leading-relaxed text-rose-800">
                  {active.rejectionReason}
                </p>
              </div>
            )}

            {/* Alasan Pembatalan (Jika Cancelled) */}
            {active.status === "Cancelled" && active.cancellationReason && (
              <div className="rounded-lg border border-stone-200 bg-[#f8f7f4] p-3.5 text-slate-800">
                <p className="font-semibold text-slate-900">
                  Alasan Pembatalan Pemohon
                </p>
                <p className="mt-1 leading-relaxed text-slate-700">
                  {active.cancellationReason}
                </p>
                {active.cancelledAt && (
                  <p className="mt-1.5 text-[11px] text-slate-500">
                    Dibatalkan pada {active.cancelledAt}
                  </p>
                )}
              </div>
            )}

            {/* Alasan Cuti */}
            <section className="space-y-1">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Alasan Cuti
              </h3>
              <p className="leading-relaxed text-slate-800">
                {active.reason || "-"}
              </p>
            </section>

            {/* Serah Terima Tugas (Handover) */}
            <section className="space-y-2 rounded-lg border border-stone-200 bg-[#faf9f6] p-3.5">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Serah Terima Tugas (Handover)
              </h3>
              <p className="flex items-center gap-1.5 font-semibold text-slate-900">
                <UserCheck
                  className="h-3.5 w-3.5 text-blue-700"
                  aria-hidden="true"
                />
                <span>{active.handoverUserName || "-"}</span>
              </p>
              <p className="leading-relaxed text-slate-700">
                {active.handoverNotes || "-"}
              </p>
            </section>

            {/* Kontak Selama Cuti */}
            <section className="space-y-1.5">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Kontak Selama Cuti
              </h3>
              <p className="flex items-start gap-2 text-slate-700">
                <MapPin
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400"
                  aria-hidden="true"
                />
                <span>{active.leaveAddress || "-"}</span>
              </p>
              <p className="flex items-center gap-2 text-slate-700">
                <Phone
                  className="h-3.5 w-3.5 shrink-0 text-slate-400"
                  aria-hidden="true"
                />
                <span className="tabular-nums">
                  {active.emergencyPhone || "-"}
                </span>
              </p>
            </section>

            {/* Lampiran Asli (Jika Ada) */}
            {active.attachmentUrl && (
              <section className="space-y-1.5">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Dokumen Lampiran
                </h3>
                <div className="flex items-center justify-between gap-2 rounded-lg border border-stone-200 bg-white px-3.5 py-2.5">
                  <span className="inline-flex min-w-0 items-center gap-2 font-medium text-slate-800">
                    <Paperclip
                      className="h-3.5 w-3.5 shrink-0 text-slate-400"
                      aria-hidden="true"
                    />
                    <span className="truncate">
                      {active.attachmentName || "Lampiran Pendukung"}
                    </span>
                  </span>
                  <a
                    href={active.attachmentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex shrink-0 cursor-pointer items-center gap-1 font-semibold text-blue-700 transition-colors hover:text-blue-800 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
                  >
                    <span>Buka File</span>
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </a>
                </div>
              </section>
            )}

            {/* Timeline Persetujuan Berjenjang (2 Jalur) */}
            <section className="border-t border-stone-200 pt-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Timeline Persetujuan
                </h3>
                <span className="text-[10px] font-medium text-slate-500">
                  {active.applicantRole === "Ketua Divisi"
                    ? "Jalur Ketua Divisi → HRD"
                    : "Jalur Karyawan → Ketua Divisi → HRD"}
                </span>
              </div>

              <ol className="space-y-0">
                {(active.timeline || []).map((step, idx, arr) => {
                  const isLast = idx === arr.length - 1;
                  const dotColor =
                    step.state === "done"
                      ? "bg-emerald-600 ring-emerald-100"
                      : step.state === "rejected"
                        ? "bg-rose-600 ring-rose-100"
                        : step.state === "cancelled"
                          ? "bg-slate-500 ring-stone-200"
                          : step.state === "active"
                            ? "bg-amber-500 ring-amber-100"
                            : "bg-stone-300 ring-stone-100";

                  return (
                    <li key={`${step.stage}-${idx}`} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <span
                          className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ring-4 ${dotColor}`}
                          aria-hidden="true"
                        />
                        {!isLast && (
                          <span
                            className="my-1 w-px flex-1 bg-stone-200"
                            aria-hidden="true"
                          />
                        )}
                      </div>
                      <div className={isLast ? "pb-1" : "pb-4"}>
                        <p className="font-semibold text-slate-900">
                          {step.stage}
                        </p>
                        <p className="text-slate-600">
                          {step.actor} &bull;{" "}
                          <span className="tabular-nums">{step.time}</span>
                        </p>
                        {step.notes && (
                          <p className="mt-1.5 rounded-lg border border-stone-200 bg-[#faf9f6] px-2.5 py-1.5 italic text-slate-700">
                            &ldquo;{step.notes}&rdquo;
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          </div>

          {/* Footer Aksi Kontekstual */}
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-stone-200 bg-[#faf9f6] px-5 py-3.5">
            {active.status === "Pending" && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenCancel?.(active);
                }}
                className="cursor-pointer rounded-lg border border-rose-300 bg-white px-3.5 py-2 text-xs font-semibold text-rose-700 transition-colors duration-150 hover:bg-rose-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
              >
                Batalkan Pengajuan
              </button>
            )}

            {active.status === "Approved" && (
              <a
                href={`/api/leaves/${active.id}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white transition-colors duration-150 hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
              >
                <FileDown className="h-3.5 w-3.5" aria-hidden="true" />
                Cetak Surat Cuti (PDF)
              </a>
            )}

            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors duration-150 hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}
