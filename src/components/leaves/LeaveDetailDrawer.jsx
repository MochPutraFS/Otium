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

function renderInkStamp(status) {
  if (status === "Approved") {
    return (
      <div
        className="ink-stamp ink-stamp-approved"
        aria-label="Stempel: Disetujui"
      >
        DISETUJUI
      </div>
    );
  }
  if (status === "Rejected") {
    return (
      <div
        className="ink-stamp ink-stamp-rejected"
        aria-label="Stempel: Ditolak"
      >
        DITOLAK
      </div>
    );
  }
  if (status === "Cancelled") {
    return (
      <div
        className="ink-stamp ink-stamp-cancelled"
        aria-label="Stempel: Dibatalkan"
      >
        DIBATALKAN
      </div>
    );
  }
  return null;
}

/**
 * Slide-Over Drawer Kanan Detail Pengajuan bergaya Swiss Archival Routing Slip + Ink Stamp.
 * Menggunakan native `<dialog className="otium-drawer" closedby="any">`, memuat data terbaru
 * via `GET /api/leaves/[id]`, menampilkan Logo Otium asli, lampiran, dan cetak PDF.
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

  // Petakan tahapan routing slip dari timeline API
  const timeline = active?.timeline || [];
  const isDirectToHrd = active?.applicantRole === "Ketua Divisi";

  return (
    <dialog
      ref={dialogRef}
      closedby="any"
      aria-labelledby={titleId}
      onClose={handleDialogClose}
      className="otium-drawer"
    >
      {active && (
        <div className="flex h-full w-full flex-col border-l border-[var(--ink)] bg-[var(--paper-pure)] text-[var(--ink)] shadow-2xl">
          {/* Header Arsip dengan Logo Otium Asli */}
          <div className="flex items-start justify-between gap-3 border-b border-[var(--rule-strong)] bg-[var(--paper)] px-5 py-4">
            <div className="flex min-w-0 items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[2px] border border-[var(--rule-strong)] bg-[var(--paper-pure)] p-1.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/otium-logo.svg"
                  alt="Logo Otium"
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="min-w-0">
                <span className="panel-eyebrow !mb-0">
                  OTIUM / ARSIP #{String(active.id).padStart(4, "0")}
                </span>
                <h2
                  id={titleId}
                  className="mt-0.5 font-serif text-2xl font-semibold leading-tight text-[var(--ink)]"
                >
                  {active.leaveTypeName}{" "}
                  <span className="mono text-sm font-medium text-[var(--ink-soft)]">
                    ({Number(active.totalDays).toFixed(1)} hr)
                  </span>
                </h2>
                <p className="mono mt-0.5 text-[11px] text-[var(--ink-muted)]">
                  {formatIndonesianDateRange(
                    active.startDate,
                    active.endDate,
                    active.isHalfDay
                  )}
                  {active.isHalfDay ? " • Setengah Hari (0.5)" : ""}
                </p>
              </div>
            </div>

            <button
              type="button"
              autoFocus
              onClick={onClose}
              aria-label="Tutup panel detail pengajuan"
              className="btn btn-icon shrink-0"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {/* Body Scrollable */}
          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5 text-xs">
            {/* Status & Tanggal Diajukan */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--rule)] pb-3.5">
              <div className="flex items-center gap-2">
                <StatusBadge
                  status={active.status}
                  rejectedByRole={active.rejectedByRole}
                />
                {isLoadingDetail && (
                  <span className="mono inline-flex items-center gap-1 text-[11px] text-[var(--ink-muted)]">
                    <Loader2
                      className="h-3 w-3 animate-spin"
                      aria-hidden="true"
                    />
                    Menyegarkan…
                  </span>
                )}
              </div>
              <span className="mono text-[11px] text-[var(--ink-muted)]">
                Diajukan {formatIndonesianDate(active.submissionDate)}
              </span>
            </div>

            {detailError && (
              <div role="alert" className="notice notice-warn">
                <AlertCircle aria-hidden="true" />
                <span>{detailError}</span>
              </div>
            )}

            {/* KARTU ROUTING SLIP + STEMPEL TINTA */}
            <article className="slip">
              {renderInkStamp(active.status)}
              <div className="slip-head">
                <div>
                  <span className="panel-eyebrow !mb-0">
                    Lembar Edaran Persetujuan
                  </span>
                  <p className="text-xs font-semibold text-[var(--ink)]">
                    {isDirectToHrd
                      ? "Jalur Ketua Divisi → Final HRD"
                      : "Jalur Karyawan → Ketua Divisi → Final HRD"}
                  </p>
                </div>
              </div>

              <div className="slip-meta">
                <span>
                  <strong className="text-[var(--ink)]">Dampak Kuota:</strong>{" "}
                  {active.quotaDeducted ? (
                    <span className="mono font-semibold text-[var(--ochre)]">
                      Memotong {Number(active.totalDays).toFixed(1)} hr
                    </span>
                  ) : active.status === "Cancelled" ||
                    active.status === "Rejected" ? (
                    <span className="inline-flex items-center gap-1 font-medium text-[var(--spruce)]">
                      <RotateCcw className="h-3 w-3" aria-hidden="true" />
                      Tidak Memotong / Sudah Refund
                    </span>
                  ) : (
                    <span>Tidak Memotong Kuota</span>
                  )}
                </span>
              </div>

              {timeline.length > 0 && (
                <div
                  className="grid grid-cols-1 divide-y divide-[var(--rule)]"
                  role="list"
                  aria-label="Urutan paraf persetujuan"
                >
                  {timeline.map((step, idx) => {
                    const boxStateClass =
                      step.state === "active"
                        ? "is-action"
                        : step.state === "rejected"
                          ? "is-rejected"
                          : step.state === "cancelled"
                            ? "is-skipped"
                            : "";
                    const symbol =
                      step.state === "done"
                        ? "✓"
                        : step.state === "rejected"
                          ? "✕"
                          : step.state === "cancelled"
                            ? "—"
                            : "○";

                    return (
                      <div
                        key={`${step.stage}-${idx}`}
                        role="listitem"
                        className={`slip-box !min-h-0 !border-r-0 ${boxStateClass}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="mono text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ink-muted)]">
                            {String(idx + 1).padStart(2, "0")} &bull;{" "}
                            {step.stage}
                          </span>
                          <span className="mono text-[10.5px] text-[var(--ink-muted)]">
                            {step.time}
                          </span>
                        </div>
                        <div className="text-[13px] font-semibold text-[var(--ink)]">
                          {symbol} {step.actor}
                        </div>
                        {step.notes && (
                          <p className="mt-1 border-l-2 border-[var(--rule-strong)] pl-2.5 italic text-[var(--ink-soft)]">
                            &ldquo;{step.notes}&rdquo;
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </article>

            {/* Alasan Penolakan (Jika Rejected) */}
            {active.status === "Rejected" && active.rejectionReason && (
              <div className="notice notice-danger">
                <AlertCircle aria-hidden="true" />
                <div>
                  <p className="m-0 font-semibold">
                    Alasan Penolakan ({active.rejectedByRole || "Approver"})
                  </p>
                  <p className="mt-0.5 leading-relaxed">
                    {active.rejectionReason}
                  </p>
                </div>
              </div>
            )}

            {/* Alasan Pembatalan (Jika Cancelled) */}
            {active.status === "Cancelled" && active.cancellationReason && (
              <div className="notice notice-info">
                <RotateCcw aria-hidden="true" />
                <div>
                  <p className="m-0 font-semibold">
                    Alasan Pembatalan Pemohon
                  </p>
                  <p className="mt-0.5 leading-relaxed">
                    {active.cancellationReason}
                  </p>
                  {active.cancelledAt && (
                    <p className="mono mt-1 text-[10.5px]">
                      Dibatalkan pada {active.cancelledAt}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Alasan Cuti */}
            <section className="space-y-1">
              <h3 className="panel-eyebrow">Alasan Cuti</h3>
              <p className="leading-relaxed text-[var(--ink)]">
                {active.reason || "-"}
              </p>
            </section>

            {/* Serah Terima Tugas (Handover) */}
            <section className="space-y-1.5 border border-[var(--rule)] bg-[var(--paper)] p-3.5">
              <h3 className="panel-eyebrow">Serah Terima Tugas (Handover)</h3>
              <p className="flex items-center gap-1.5 font-semibold text-[var(--ink)]">
                <UserCheck
                  className="h-3.5 w-3.5 text-[var(--spruce)]"
                  aria-hidden="true"
                />
                <span>{active.handoverUserName || "-"}</span>
              </p>
              <p className="leading-relaxed text-[var(--ink-soft)]">
                {active.handoverNotes || "-"}
              </p>
            </section>

            {/* Kontak Selama Cuti */}
            <section className="space-y-1.5">
              <h3 className="panel-eyebrow">Kontak Selama Cuti</h3>
              <p className="flex items-start gap-2 text-[var(--ink-soft)]">
                <MapPin
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--ink-muted)]"
                  aria-hidden="true"
                />
                <span>{active.leaveAddress || "-"}</span>
              </p>
              <p className="flex items-center gap-2 text-[var(--ink-soft)]">
                <Phone
                  className="h-3.5 w-3.5 shrink-0 text-[var(--ink-muted)]"
                  aria-hidden="true"
                />
                <span className="mono">{active.emergencyPhone || "-"}</span>
              </p>
            </section>

            {/* Lampiran Asli (Jika Ada) */}
            {active.attachmentUrl && (
              <section className="space-y-1.5">
                <h3 className="panel-eyebrow">Dokumen Lampiran</h3>
                <div className="file-chip">
                  <span className="inline-flex min-w-0 items-center gap-2 font-medium">
                    <Paperclip
                      className="h-3.5 w-3.5 shrink-0"
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
                    className="mono inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold underline"
                  >
                    <span>Buka</span>
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </a>
                </div>
              </section>
            )}
          </div>

          {/* Footer Aksi Kontekstual */}
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--rule)] bg-[var(--alabaster)] px-5 py-3.5">
            {active.status === "Pending" && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenCancel?.(active);
                }}
                className="btn btn-danger-ghost btn-sm"
              >
                Batalkan Pengajuan
              </button>
            )}

            {active.status === "Approved" && (
              <a
                href={`/api/leaves/${active.id}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary btn-sm"
              >
                <FileDown className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Cetak Surat Cuti (PDF)</span>
              </a>
            )}

            <button type="button" onClick={onClose} className="btn btn-sm">
              Tutup
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}
