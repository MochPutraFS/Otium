"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  FileDown,
  Loader2,
  MapPin,
  Paperclip,
  Phone,
  UserCheck,
  X,
  XCircle,
} from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import {
  formatIndonesianDate,
  formatIndonesianDateRange,
} from "@/lib/date-utils";

function renderInkStamp(status) {
  if (status === "Approved") {
    return (
      <div className="ink-stamp ink-stamp-approved" aria-label="Stempel: Disetujui">
        DISETUJUI
      </div>
    );
  }
  if (status === "Rejected") {
    return (
      <div className="ink-stamp ink-stamp-rejected" aria-label="Stempel: Ditolak">
        DITOLAK
      </div>
    );
  }
  if (status === "Cancelled") {
    return (
      <div className="ink-stamp ink-stamp-cancelled" aria-label="Stempel: Dibatalkan">
        DIBATALKAN
      </div>
    );
  }
  return null;
}

/**
 * Slide-Over Drawer Kanan Detail Pengajuan pada Portal Ketua Divisi & HRD bergaya Swiss Archival.
 * Menggunakan native `<dialog className="otium-drawer" closedby="any">`, memuat live `GET /api/leaves/[id]`,
 * menampilkan Logo Otium asli, Routing Slip + Stempel Tinta, lampiran, dan cetak PDF.
 */
export default function ApprovalDetailDrawer({
  request,
  isOpen,
  canTakeAction = false,
  canDownloadPdf = false,
  onClose,
  onOpenApprove,
  onOpenReject,
  onPreviewAttachment,
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

  useEffect(() => {
    if (!isOpen || !request) return undefined;

    setDetailData(request);
    setDetailError("");

    const numericId = Number(request.id);
    if (!Number.isInteger(numericId) || numericId <= 0) {
      setIsLoadingDetail(false);
      return undefined;
    }

    const controller = new AbortController();
    setIsLoadingDetail(true);

    async function fetchLiveDetail() {
      try {
        const res = await fetch(`/api/leaves/${numericId}`, {
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
          setDetailData((prev) => ({
            ...prev,
            ...data.request,
          }));
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

    fetchLiveDetail();
    return () => controller.abort();
  }, [isOpen, request]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !isOpen) return undefined;
    if ("closedBy" in HTMLDialogElement.prototype) return undefined;

    function handleClick(event) {
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
  }, [isOpen]);

  const active = detailData || request;
  const isLeaderApplicant = active?.applicantRole === "Ketua Divisi";
  const hasRealAttachmentUrl = Boolean(active?.attachmentUrl);

  return (
    <dialog
      ref={dialogRef}
      closedby="any"
      aria-labelledby={titleId}
      onClose={() => onClose?.()}
      className="otium-modal-landscape"
    >
      {active && (
        <aside className="flex max-h-[calc(100dvh-2.5rem)] w-full flex-col rounded-[2px] border border-[var(--ink)] bg-[var(--paper-pure)] text-[var(--ink)] shadow-2xl">
          {/* Header Arsip dengan Logo Otium Asli */}
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--rule-strong)] bg-[var(--paper)] px-5 py-4">
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
                  OTIUM / VERIFIKASI #{String(active.id).padStart(4, "0")}
                </span>
                <h3
                  id={titleId}
                  className="mt-0.5 truncate font-serif text-2xl font-semibold leading-tight text-[var(--ink)]"
                >
                  {active.applicantName}
                </h3>
                <p className="text-xs text-[var(--ink-soft)]">
                  {active.applicantRole} &bull; {active.divisionName || "-"}
                </p>
                <p className="mono mt-1 text-[11px] font-medium text-[var(--spruce)]">
                  {active.leaveTypeName} ({Number(active.totalDays).toFixed(1)}{" "}
                  hr) &bull;{" "}
                  {formatIndonesianDateRange(
                    active.startDate,
                    active.endDate,
                    active.isHalfDay
                  )}
                </p>
              </div>
            </div>

            <button
              type="button"
              autoFocus
              onClick={() => dialogRef.current?.close()}
              aria-label="Tutup panel detail pengajuan"
              className="btn btn-icon shrink-0"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {/* Body Scrollable — Tata Letak Landscape 2 Kolom */}
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 text-xs">
            {isLoadingDetail && (
              <div className="mono mb-4 flex items-center gap-2 border border-[var(--rule)] bg-[var(--paper)] px-3 py-2 text-[11px] text-[var(--ink-muted)]">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                <span>Menyegarkan detail &amp; riwayat audit terbaru...</span>
              </div>
            )}

            {detailError && (
              <div role="alert" className="notice notice-warn mb-4">
                <AlertCircle aria-hidden="true" />
                <span>{detailError}</span>
              </div>
            )}

            {/* Status & Tanggal Diajukan */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--rule)] pb-3">
              <StatusBadge
                status={active.status}
                rejectedByRole={active.rejectedByRole}
              />
              <span className="mono text-[11px] text-[var(--ink-muted)]">
                Diajukan {formatIndonesianDate(active.submissionDate)}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
              {/* Kolom Kiri (7/12): Routing Slip + Jejak Audit + Alasan Penolakan/Pembatalan */}
              <div className="space-y-4 lg:col-span-7">
                {/* Kartu Routing Slip + Stempel Tinta */}
                <article className="slip">
                  {renderInkStamp(active.status)}
                  <div className="slip-head">
                    <div>
                      <span className="panel-eyebrow !mb-0">
                        Lembar Edaran &amp; Audit Kuota
                      </span>
                      <p className="text-xs font-semibold text-[var(--ink)]">
                        {isLeaderApplicant
                          ? "Jalur 2: Ketua Divisi → Final HRD"
                          : "Jalur 1: Karyawan → Ketua Divisi → Final HRD"}
                      </p>
                    </div>
                  </div>
                  <div className="slip-meta">
                    <span>
                      <strong className="text-[var(--ink)]">Kuota Pemohon:</strong>{" "}
                      <span className="mono font-semibold text-[var(--spruce)]">
                        {active.deductsAnnualQuota
                          ? `Sisa ${Number(active.remainingQuota ?? 0).toFixed(1)} hr`
                          : "Non-Potong Kuota"}
                      </span>
                    </span>
                    {active.deductsAnnualQuota && (
                      <span>
                        {active.quotaDeducted
                          ? `Hold ${Number(active.totalDays).toFixed(1)} hr`
                          : "Auto-Refund selesai"}
                      </span>
                    )}
                  </div>
                </article>

                {/* Alasan Penolakan (jika Rejected) */}
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

                {/* Alasan Pembatalan (jika Cancelled) */}
                {active.status === "Cancelled" && active.cancellationReason && (
                  <div className="notice notice-info">
                    <AlertCircle aria-hidden="true" />
                    <div>
                      <p className="m-0 font-semibold">
                        Alasan Pembatalan Pemohon
                      </p>
                      <p className="mt-0.5 leading-relaxed">
                        {active.cancellationReason}
                      </p>
                    </div>
                  </div>
                )}

                {/* Timeline Persetujuan */}
                <section className="space-y-2">
                  <h4 className="panel-eyebrow">Jejak Audit Persetujuan</h4>

                  {Array.isArray(active.timeline) && active.timeline.length > 0 ? (
                    <div className="divide-y divide-[var(--rule)] border border-[var(--rule)]">
                      {active.timeline.map((item, idx) => (
                        <div
                          key={`${item.stage}-${idx}`}
                          className={`slip-box !min-h-0 !border-r-0 ${
                            item.state === "active"
                              ? "is-action"
                              : item.state === "rejected"
                                ? "is-rejected"
                                : item.state === "cancelled"
                                  ? "is-skipped"
                                  : ""
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="mono text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ink-muted)]">
                              {String(idx + 1).padStart(2, "0")} &bull; {item.stage}
                            </span>
                            <span className="mono text-[10.5px] text-[var(--ink-muted)]">
                              {item.time}
                            </span>
                          </div>
                          <p className="font-semibold text-[var(--ink)]">
                            {item.actor}
                          </p>
                          {item.notes && (
                            <p className="mt-1 border-l-2 border-[var(--rule-strong)] pl-2.5 italic text-[var(--ink-soft)]">
                              &ldquo;{item.notes}&rdquo;
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="divide-y divide-[var(--rule)] border border-[var(--rule)]">
                      <div className="slip-box !min-h-0 !border-r-0">
                        <span className="mono text-[10px] uppercase text-[var(--ink-muted)]">
                          01 &bull; Pemohon
                        </span>
                        <p className="font-semibold text-[var(--ink)]">
                          {active.applicantName}
                        </p>
                        <p className="mono text-[11px] text-[var(--spruce)]">
                          ✓ {formatIndonesianDate(active.submissionDate)}
                        </p>
                      </div>

                      {!isLeaderApplicant && (
                        <div className="slip-box !min-h-0 !border-r-0">
                          <span className="mono text-[10px] uppercase text-[var(--ink-muted)]">
                            02 &bull; Ketua Divisi
                          </span>
                          <p className="font-semibold text-[var(--ink)]">
                            {active.leaderApproverName || "Menunggu Verifikasi"}
                          </p>
                          {active.leaderApprovedAt && (
                            <p className="mono text-[11px] text-[var(--ink-soft)]">
                              {active.leaderApprovedAt}
                              {active.leaderNotes ? ` • "${active.leaderNotes}"` : ""}
                            </p>
                          )}
                        </div>
                      )}

                      <div className="slip-box !min-h-0 !border-r-0">
                        <span className="mono text-[10px] uppercase text-[var(--ink-muted)]">
                          03 &bull; Final HRD
                        </span>
                        <p className="font-semibold text-[var(--ink)]">
                          {active.hrdApproverName || "Menunggu Otorisasi HRD"}
                        </p>
                        {active.hrdApprovedAt && (
                          <p className="mono text-[11px] text-[var(--ink-soft)]">
                            {active.hrdApprovedAt}
                            {active.hrdNotes ? ` • "${active.hrdNotes}"` : ""}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </section>
              </div>

              {/* Kolom Kanan (5/12): Alasan Cuti, Handover, Kontak & Lampiran */}
              <div className="space-y-4 lg:col-span-5">
                {/* Alasan Cuti */}
                <section className="space-y-1 border border-[var(--rule)] bg-[var(--paper-pure)] p-3.5">
                  <h4 className="panel-eyebrow">Alasan Cuti</h4>
                  <p className="leading-relaxed text-[var(--ink)]">
                    {active.reason || "-"}
                  </p>
                </section>

                {/* Serah Terima Tugas (Handover) */}
                <section className="space-y-1.5 border border-[var(--rule)] bg-[var(--paper)] p-3.5">
                  <h4 className="panel-eyebrow">Serah Terima Tugas (Handover)</h4>
                  <p className="flex items-center gap-1.5 font-semibold text-[var(--ink)]">
                    <UserCheck
                      className="h-3.5 w-3.5 shrink-0 text-[var(--spruce)]"
                      aria-hidden="true"
                    />
                    <span>Rekan Pengganti: {active.handoverUserName || "-"}</span>
                  </p>
                  <p className="leading-relaxed text-[var(--ink-soft)]">
                    {active.handoverNotes || "-"}
                  </p>
                </section>

                {/* Kontak Selama Cuti & Lampiran */}
                <section className="space-y-2 border border-[var(--rule)] bg-[var(--paper-pure)] p-3.5">
                  <h4 className="panel-eyebrow">Kontak Selama Cuti &amp; Lampiran</h4>
                  <div className="space-y-1.5 text-[var(--ink-soft)]">
                    <p className="flex items-start gap-2">
                      <MapPin
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--ink-muted)]"
                        aria-hidden="true"
                      />
                      <span>{active.leaveAddress || "-"}</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <Phone
                        className="h-3.5 w-3.5 shrink-0 text-[var(--ink-muted)]"
                        aria-hidden="true"
                      />
                      <span className="mono">{active.emergencyPhone || "-"}</span>
                    </p>
                  </div>

                  {hasRealAttachmentUrl ? (
                    <div className="file-chip mt-2">
                      <span className="flex min-w-0 items-center gap-1.5 font-medium">
                        <Paperclip className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span className="truncate">
                          {active.attachmentName || "Lampiran Dokumen"}
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
                  ) : active.attachmentName ? (
                    <div className="file-chip mt-2">
                      <span className="flex min-w-0 items-center gap-1.5 font-medium">
                        <Paperclip className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span className="truncate">{active.attachmentName}</span>
                      </span>
                      {onPreviewAttachment && (
                        <button
                          type="button"
                          onClick={() => onPreviewAttachment(active.attachmentName)}
                          className="mono shrink-0 cursor-pointer text-[11px] font-semibold underline"
                        >
                          Pratinjau
                        </button>
                      )}
                    </div>
                  ) : (
                    <p className="text-[11px] text-[var(--ink-muted)]">
                      Lampiran dokumen: Tidak ada / tidak diperlukan
                    </p>
                  )}
                </section>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-[var(--rule)] bg-[var(--alabaster)] px-5 py-3.5">
            {canDownloadPdf &&
            active.status === "Approved" &&
            Number.isInteger(Number(active.id)) ? (
              <a
                href={`/api/leaves/${active.id}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-sm"
              >
                <FileDown className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Surat Cuti PDF</span>
              </a>
            ) : (
              <span />
            )}

            <div className="flex items-center gap-2">
              {canTakeAction ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      dialogRef.current?.close();
                      onOpenReject?.(active);
                    }}
                    className="btn btn-danger-ghost btn-sm"
                  >
                    <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Tolak</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      dialogRef.current?.close();
                      onOpenApprove?.(active);
                    }}
                    className="btn btn-primary btn-sm"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Setujui</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => dialogRef.current?.close()}
                  className="btn btn-sm"
                >
                  Tutup
                </button>
              )}
            </div>
          </div>
        </aside>
      )}
    </dialog>
  );
}
