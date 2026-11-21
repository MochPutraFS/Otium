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

/**
 * Slide-Over Drawer kanan untuk inspeksi detail pengajuan pada Portal Ketua Divisi & HRD.
 * Menggunakan native `<dialog className="otium-drawer" closedby="any">` + `showModal()`,
 * fallback light-dismiss untuk browser tanpa `closedBy`, fetch live `GET /api/leaves/[id]`
 * untuk ID numerik PostgreSQL (dengan fallback aman bagi data preview), pratinjau lampiran nyata
 * (`/uploads/...`), dan unduh Surat Cuti Resmi PDF untuk status `Approved`.
 */
export default function ApprovalDetailDrawer({
  request,
  isOpen,
  canTakeAction = false,
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

  // Fetch detail terbaru + audit timeline `leave_approvals` dari GET /api/leaves/[id] (hanya ID numerik DB)
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

  // Fallback light-dismiss wajib untuk browser tanpa dukungan `closedby` (mis. Safari)
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
      className="otium-drawer"
    >
      {active && (
        <aside className="flex h-full w-full flex-col border-l border-stone-200 bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 border-b border-stone-200 bg-[#F4F2EC]/70 px-5 py-4">
            <div className="flex items-start gap-3 min-w-0">
              {active.applicantAvatar ? (
                <img
                  src={active.applicantAvatar}
                  alt={`Foto profil ${active.applicantName}`}
                  className="h-10 w-10 shrink-0 rounded-full border border-stone-200 object-cover bg-white"
                />
              ) : (
                <div
                  aria-hidden="true"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-stone-200 bg-white text-xs font-bold text-slate-800"
                >
                  {active.applicantInitials || "KR"}
                </div>
              )}

              <div className="min-w-0">
                <h3
                  id={titleId}
                  className="truncate text-sm font-bold tracking-tight text-slate-900"
                >
                  {active.applicantName}
                </h3>
                <p className="mt-0.5 text-xs text-slate-600">
                  {active.applicantRole} • {active.divisionName || "-"}
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-900 tabular-nums">
                  {active.leaveTypeName} ({Number(active.totalDays).toFixed(1)}{" "}
                  Hari) •{" "}
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
              onClick={() => dialogRef.current?.close()}
              aria-label="Tutup panel detail pengajuan"
              className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-stone-300 bg-white text-slate-600 transition-colors hover:border-slate-900 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5 text-xs">
            {/* Loading / Error sinkronisasi live */}
            {isLoadingDetail && (
              <div className="flex items-center gap-2 rounded-lg border border-stone-200 bg-[#F4F2EC]/60 px-3 py-2 text-[11px] text-slate-600">
                <Loader2
                  className="h-3.5 w-3.5 animate-spin text-slate-700"
                  aria-hidden="true"
                />
                <span>Menyegarkan detail &amp; riwayat audit terbaru...</span>
              </div>
            )}

            {detailError && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900"
              >
                <AlertCircle
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700"
                  aria-hidden="true"
                />
                <span>{detailError}</span>
              </div>
            )}

            {/* Status & Tanggal Diajukan */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <StatusBadge
                status={active.status}
                rejectedByRole={active.rejectedByRole}
              />
              <span className="text-[11px] text-slate-500">
                Diajukan {formatIndonesianDate(active.submissionDate)}
              </span>
            </div>

            {/* Info Kuota Pemohon */}
            <div className="rounded-lg border border-stone-200 bg-[#F4F2EC]/60 p-3.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-600">
                  Status Kuota Tahunan Pemohon
                </span>
                <span className="font-bold text-slate-900 tabular-nums">
                  {active.deductsAnnualQuota
                    ? `Sisa ${Number(active.remainingQuota ?? 0).toFixed(1)} Hari`
                    : "Tidak Memotong Kuota"}
                </span>
              </div>
              {active.deductsAnnualQuota && (
                <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                  {active.quotaDeducted
                    ? `Kuota sebesar ${Number(active.totalDays).toFixed(1)} hari sedang ditahan (Hold) untuk pengajuan ini.`
                    : "Kuota telah dikembalikan otomatis (Auto-Refund) ke saldo pemohon."}
                </p>
              )}
            </div>

            {/* Alasan Penolakan (jika Rejected) */}
            {active.status === "Rejected" && active.rejectionReason && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3.5 text-rose-900">
                <p className="font-semibold">
                  Alasan Penolakan ({active.rejectedByRole || "Approver"})
                </p>
                <p className="mt-1 leading-relaxed text-rose-800">
                  {active.rejectionReason}
                </p>
              </div>
            )}

            {/* Alasan Pembatalan (jika Cancelled) */}
            {active.status === "Cancelled" && active.cancellationReason && (
              <div className="rounded-lg border border-stone-300 bg-[#F4F2EC] p-3.5 text-slate-800">
                <p className="font-semibold text-slate-900">
                  Alasan Pembatalan Pemohon
                </p>
                <p className="mt-1 leading-relaxed text-slate-700">
                  {active.cancellationReason}
                </p>
              </div>
            )}

            {/* Alasan Cuti */}
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Alasan Cuti
              </p>
              <p className="leading-relaxed text-slate-800">{active.reason}</p>
            </div>

            {/* Serah Terima Tugas (Handover) */}
            <div className="space-y-2 rounded-lg border border-stone-200 bg-[#F4F2EC]/50 p-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Serah Terima Tugas (Handover)
              </p>
              <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                <UserCheck
                  className="h-3.5 w-3.5 shrink-0 text-slate-700"
                  aria-hidden="true"
                />
                <span>Rekan Pengganti: {active.handoverUserName || "-"}</span>
              </div>
              <p className="leading-relaxed text-slate-700">
                {active.handoverNotes || "-"}
              </p>
            </div>

            {/* Kontak Darurat & Lampiran */}
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Kontak Selama Cuti &amp; Lampiran
              </p>
              <div className="space-y-1.5 text-slate-700">
                <p className="flex items-start gap-2">
                  <MapPin
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500"
                    aria-hidden="true"
                  />
                  <span>{active.leaveAddress || "-"}</span>
                </p>
                <p className="flex items-center gap-2">
                  <Phone
                    className="h-3.5 w-3.5 shrink-0 text-slate-500"
                    aria-hidden="true"
                  />
                  <span>{active.emergencyPhone || "-"}</span>
                </p>
              </div>

              {hasRealAttachmentUrl ? (
                <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2.5">
                  <span className="flex min-w-0 items-center gap-1.5 font-semibold text-sky-900">
                    <Paperclip
                      className="h-3.5 w-3.5 shrink-0"
                      aria-hidden="true"
                    />
                    <span className="truncate">
                      {active.attachmentName || "Lampiran Dokumen"}
                    </span>
                  </span>
                  <a
                    href={active.attachmentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex shrink-0 cursor-pointer items-center gap-1 text-[11px] font-semibold text-sky-900 underline underline-offset-2 transition-colors hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                  >
                    <span>Buka Lampiran</span>
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </a>
                </div>
              ) : active.attachmentName ? (
                <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2.5">
                  <span className="flex min-w-0 items-center gap-1.5 font-semibold text-sky-900">
                    <Paperclip
                      className="h-3.5 w-3.5 shrink-0"
                      aria-hidden="true"
                    />
                    <span className="truncate">{active.attachmentName}</span>
                  </span>
                  {onPreviewAttachment && (
                    <button
                      type="button"
                      onClick={() => onPreviewAttachment(active.attachmentName)}
                      className="shrink-0 cursor-pointer text-[11px] font-semibold text-sky-900 underline underline-offset-2 hover:text-slate-900"
                    >
                      Pratinjau
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-[11px] text-slate-500">
                  Lampiran dokumen: Tidak ada / tidak diperlukan
                </p>
              )}
            </div>

            {/* Timeline Persetujuan 2 Jalur */}
            <div className="space-y-3 border-t border-stone-200 pt-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Timeline Persetujuan (
                {isLeaderApplicant
                  ? "Jalur 2: Langsung HRD"
                  : "Jalur 1: Berjenjang 2 Tahap"}
                )
              </p>

              {Array.isArray(active.timeline) && active.timeline.length > 0 ? (
                <ol className="space-y-3 border-l-2 border-stone-200 pl-4">
                  {active.timeline.map((item, idx) => {
                    const dotColor =
                      item.state === "done"
                        ? "bg-emerald-600"
                        : item.state === "rejected"
                          ? "bg-rose-600"
                          : item.state === "active"
                            ? "bg-amber-500"
                            : item.state === "cancelled"
                              ? "bg-slate-500"
                              : "bg-stone-300";

                    return (
                      <li key={`${item.stage}-${idx}`} className="relative">
                        <span
                          className={`absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full ring-4 ring-white ${dotColor}`}
                          aria-hidden="true"
                        />
                        <p className="font-semibold text-slate-900">
                          {item.stage} — {item.actor}
                        </p>
                        <p className="text-[11px] text-slate-600">
                          {item.time}
                        </p>
                        {item.notes && (
                          <p className="mt-1 rounded-md border border-stone-200 bg-[#F4F2EC]/60 px-2.5 py-1.5 text-[11px] text-slate-700">
                            &ldquo;{item.notes}&rdquo;
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <ol className="space-y-3 border-l-2 border-stone-200 pl-4">
                  {/* Step 1: Pengajuan */}
                  <li className="relative">
                    <span
                      className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-emerald-600 ring-4 ring-white"
                      aria-hidden="true"
                    />
                    <p className="font-semibold text-slate-900">
                      Diajukan — {active.applicantName}
                    </p>
                    <p className="text-[11px] text-slate-600">
                      {formatIndonesianDate(active.submissionDate)}
                    </p>
                  </li>

                  {/* Step 2: Ketua Divisi (Hanya Jalur 1 / Karyawan) */}
                  {!isLeaderApplicant && (
                    <li className="relative">
                      <span
                        className={`absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full ring-4 ring-white ${
                          active.rejectedByRole === "Ketua Divisi"
                            ? "bg-rose-600"
                            : active.leaderApproverName
                              ? "bg-emerald-600"
                              : active.status === "Pending"
                                ? "bg-amber-500"
                                : "bg-stone-300"
                        }`}
                        aria-hidden="true"
                      />
                      <p className="font-semibold text-slate-900">
                        Verifikasi Ketua Divisi{" "}
                        {active.leaderApproverName
                          ? `— ${active.leaderApproverName}`
                          : "(Menunggu)"}
                      </p>
                      {active.leaderApprovedAt ? (
                        <p className="text-[11px] text-slate-600">
                          {active.leaderApprovedAt}
                          {active.leaderNotes ? ` • "${active.leaderNotes}"` : ""}
                        </p>
                      ) : (
                        <p className="text-[11px] text-slate-500">
                          Menunggu tindakan Ketua Divisi {active.divisionName}
                        </p>
                      )}
                    </li>
                  )}

                  {/* Step Final: HRD */}
                  <li className="relative">
                    <span
                      className={`absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full ring-4 ring-white ${
                        active.rejectedByRole === "HRD"
                          ? "bg-rose-600"
                          : active.status === "Approved"
                            ? "bg-emerald-600"
                            : "bg-stone-300"
                      }`}
                      aria-hidden="true"
                    />
                    <p className="font-semibold text-slate-900">
                      Persetujuan Final HRD{" "}
                      {active.hrdApproverName
                        ? `— ${active.hrdApproverName}`
                        : "(Menunggu)"}
                    </p>
                    {active.hrdApprovedAt ? (
                      <p className="text-[11px] text-slate-600">
                        {active.hrdApprovedAt}
                        {active.hrdNotes ? ` • "${active.hrdNotes}"` : ""}
                      </p>
                    ) : (
                      <p className="text-[11px] text-slate-500">
                        {active.status === "Rejected"
                          ? "Dihentikan karena ditolak pada tahap sebelumnya"
                          : active.status === "Cancelled"
                            ? "Dibatalkan oleh pemohon"
                            : "Menunggu persetujuan final HRD"}
                      </p>
                    )}
                  </li>
                </ol>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-200 bg-[#F4F2EC]/70 px-5 py-3.5">
            {active.status === "Approved" && Number.isInteger(Number(active.id)) ? (
              <a
                href={`/api/leaves/${active.id}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 transition-colors hover:border-slate-900 hover:bg-[#F4F2EC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
              >
                <FileDown className="h-3.5 w-3.5" aria-hidden="true" />
                Surat Cuti PDF
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
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-800 transition-colors hover:border-rose-700 hover:bg-rose-700 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-700"
                  >
                    <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                    Tolak
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      dialogRef.current?.close();
                      onOpenApprove?.(active);
                    }}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Setujui
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => dialogRef.current?.close()}
                  className="cursor-pointer rounded-lg border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-900 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
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
