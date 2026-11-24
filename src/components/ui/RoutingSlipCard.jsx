"use client";

import { AlertTriangle, CheckCircle2, Eye, Paperclip, Zap } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import UserAvatar from "@/components/ui/UserAvatar";
import {
  formatIndonesianDate,
  formatIndonesianDateRange,
} from "@/lib/date-utils";

const PARAF_PATHS = [
  "M2 16 C8 4, 15 19, 24 10 C30 5, 36 16, 48 12 C56 10, 62 14, 70 11",
  "M3 15 C11 19, 14 4, 22 13 C28 18, 39 5, 49 13 C57 17, 63 8, 72 12",
  "M2 12 C10 5, 17 18, 28 9 C35 4, 44 17, 54 11 C61 8, 66 13, 73 10",
];

function ParafSvg({ seed = 0 }) {
  const path = PARAF_PATHS[Math.abs(seed) % PARAF_PATHS.length];
  return (
    <svg
      width="76"
      height="22"
      viewBox="0 0 76 22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  );
}

/**
 * Komponen Signature Routing Slip (Umlaufzettel) bergaya Swiss Archival.
 * Menampilkan header dokumen, metadata periode/handover/kuota, 3 kotak tahap
 * (01 Pemohon, 02 Ketua Divisi — otomatis dilewati untuk pemohon Ketua Divisi,
 * 03 Otorisasi HRD) dengan paraf SVG, stempel tinta, riwayat persetujuan Ketua Divisi,
 * dan tombol aksi kontekstual.
 */
export default function RoutingSlipCard({
  request,
  mode = "leader",
  isSelected = false,
  showActions = true,
  onToggleSelect,
  onOpenDetail,
  onOpenApprove,
  onOpenReject,
}) {
  const isHrd = mode === "hrd";
  const isDirectLeaderPath = request.applicantRole === "Ketua Divisi";
  const hasAttachment = Boolean(request.attachmentUrl || request.attachmentName);
  const seedBase = Number(request.id) || 1;

  // Stage 2 (Ketua Divisi) state
  let step2Cls = "";
  let step2Actor = isDirectLeaderPath
    ? "Dilewati (Ketua Divisi)"
    : request.leaderApproverName || `Ketua Divisi ${request.divisionName || ""}`.trim();
  let step2State = "";
  let step2Paraf = null;

  if (isDirectLeaderPath) {
    step2Cls = "is-skipped";
    step2State = "→ Langsung ke HRD";
    step2Paraf = <div className="slip-paraf-empty">tidak diperlukan</div>;
  } else if (request.status === "Cancelled") {
    step2Cls = "is-skipped";
    step2State = "— Dibatalkan";
    step2Paraf = <div className="slip-paraf-empty">void</div>;
  } else if (request.rejectedByRole === "Ketua Divisi") {
    step2Cls = "is-rejected";
    step2State = `✕ Ditolak${request.leaderApprovedAt ? ` • ${request.leaderApprovedAt}` : ""}`;
    step2Paraf = (
      <div className="slip-paraf-empty text-[var(--terracotta)]">
        ditolak atasan
      </div>
    );
  } else if (
    request.status === "Approved by Leader" ||
    request.status === "Approved" ||
    request.leaderApproverName
  ) {
    step2State = `✓ ${request.leaderApprovedAt || "Terverifikasi"}`;
    step2Paraf = (
      <div className="slip-paraf">
        <ParafSvg seed={seedBase + 1} />
      </div>
    );
  } else {
    const isMyTurn = mode === "leader" && request.status === "Pending";
    if (isMyTurn) step2Cls = "is-action";
    step2State = isMyTurn ? "○ Menunggu paraf Anda" : "○ Menunggu verifikasi";
    step2Paraf = (
      <div className="slip-paraf-empty">
        {isMyTurn ? "[ slot paraf Anda ]" : "[ belum diparaf ]"}
      </div>
    );
  }

  // Stage 3 (HRD Final) state
  let step3Cls = "";
  const step3Actor = request.hrdApproverName || "Otorisasi Final HRD";
  let step3State = "";
  let step3Paraf = null;

  if (request.status === "Cancelled") {
    step3Cls = "is-skipped";
    step3State = "— Dibatalkan";
    step3Paraf = <div className="slip-paraf-empty">void</div>;
  } else if (request.status === "Approved") {
    step3State = `✓ ${request.hrdApprovedAt || "Disetujui"}`;
    step3Paraf = (
      <div className="slip-paraf">
        <ParafSvg seed={seedBase + 2} />
      </div>
    );
  } else if (request.rejectedByRole === "HRD") {
    step3Cls = "is-rejected";
    step3State = `✕ Ditolak${request.hrdApprovedAt ? ` • ${request.hrdApprovedAt}` : ""}`;
    step3Paraf = (
      <div className="slip-paraf-empty text-[var(--terracotta)]">
        ditolak HRD
      </div>
    );
  } else if (request.status === "Rejected") {
    step3Cls = "is-skipped";
    step3State = "— Dihentikan";
    step3Paraf = <div className="slip-paraf-empty">tidak berlanjut</div>;
  } else {
    const isMyTurn =
      isHrd &&
      ((request.applicantRole === "Karyawan" &&
        request.status === "Approved by Leader") ||
        (isDirectLeaderPath && request.status === "Pending"));
    if (isMyTurn) step3Cls = "is-action";
    step3State = isMyTurn
      ? "○ Menunggu paraf Anda"
      : request.status === "Approved by Leader" || isDirectLeaderPath
        ? "○ Menunggu HRD"
        : "○ Menunggu tahap 02";
    step3Paraf = (
      <div className="slip-paraf-empty">
        {isMyTurn ? "[ slot otorisasi Anda ]" : "[ belum diparaf ]"}
      </div>
    );
  }

  // Archival Ink Stamp
  let inkStamp = null;
  if (request.status === "Approved") {
    inkStamp = (
      <div className="ink-stamp ink-stamp-approved" aria-label="Stempel: Disetujui">
        DISETUJUI
      </div>
    );
  } else if (request.status === "Rejected") {
    inkStamp = (
      <div className="ink-stamp ink-stamp-rejected" aria-label="Stempel: Ditolak">
        DITOLAK
      </div>
    );
  } else if (request.status === "Cancelled") {
    inkStamp = (
      <div className="ink-stamp ink-stamp-cancelled" aria-label="Stempel: Dibatalkan">
        DIBATALKAN
      </div>
    );
  }

  return (
    <article
      className={`slip transition-colors duration-150 ${
        isSelected ? "!border-[var(--spruce)] ring-1 ring-[var(--spruce)]" : ""
      }`}
    >
      {inkStamp}

      {/* Header Dokumen & Identitas Pemohon */}
      <div className="slip-head">
        <div className="flex min-w-0 items-center gap-3">
          {isHrd && typeof onToggleSelect === "function" && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(event) =>
                onToggleSelect(request.id, event.target.checked)
              }
              aria-label={`Pilih pengajuan ${request.applicantName}`}
              className="otium-checkbox h-4 w-4 shrink-0 cursor-pointer"
            />
          )}

          <UserAvatar
            src={request.applicantAvatar}
            alt={`Foto profil ${request.applicantName}`}
            initials={request.applicantInitials || "KR"}
            imgClassName="h-9 w-9 shrink-0 rounded-[2px] border border-[var(--rule-strong)] bg-[var(--paper-pure)] object-cover"
            fallbackClassName="avatar-sq !h-9 !w-9 !text-xs"
            ariaHiddenFallback
          />

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-[var(--ink)]">
                {request.applicantName}
              </h3>
              <span className="mono text-[11px] text-[var(--ink-muted)]">
                #{String(request.id).padStart(4, "0")}
              </span>
            </div>
            <p className="text-xs text-[var(--ink-soft)]">
              {request.applicantRole} &bull; {request.divisionName || "-"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {request.deductsAnnualQuota ? (
            <span className="tag tag-approved">
              Sisa Kuota: {Number(request.remainingQuota ?? 0).toFixed(1)} hr
            </span>
          ) : (
            <span className="tag">Non-Potong Kuota</span>
          )}
          <StatusBadge
            status={request.status}
            rejectedByRole={request.rejectedByRole}
          />
        </div>
      </div>

      {/* Metadata Periode, Jenis, Handover, & Lampiran */}
      <div className="slip-meta">
        <span>
          <strong className="text-[var(--ink)]">Jenis:</strong>{" "}
          {request.leaveTypeName}
          {request.isHalfDay ? " (0.5 Hr)" : ""}
        </span>
        <span>
          <strong className="text-[var(--ink)]">Periode:</strong>{" "}
          <span className="mono">
            {formatIndonesianDateRange(
              request.startDate,
              request.endDate,
              request.isHalfDay
            )}{" "}
            ({Number(request.totalDays).toFixed(1)} hr)
          </span>
        </span>
        <span>
          <strong className="text-[var(--ink)]">Handover:</strong>{" "}
          {request.handoverUserName || "-"}
        </span>
        {hasAttachment && (
          <span className="tag tag-leader !py-0 !text-[10.5px]">
            <Paperclip className="h-3 w-3" aria-hidden="true" />
            <span>Lampiran</span>
          </span>
        )}
      </div>

      {/* Inline Banner Peringatan Kapasitas Tim pada Kartu HRD (Fase 2 - 8.6) */}
      {mode === "hrd" && request.capacityWarning?.isExceeded && (
        <div
          role="alert"
          className="flex items-start gap-2 border-b border-[var(--ochre-border)] bg-[var(--ochre-tint)] px-4 py-2.5 text-xs text-[var(--ochre)]"
        >
          <AlertTriangle
            className="mt-0.5 h-4 w-4 shrink-0"
            aria-hidden="true"
          />
          <span>
            <strong>Limit Kapasitas Tim Terlampaui:</strong>{" "}
            {request.capacityWarning.message}
          </span>
        </div>
      )}

      {/* 3 Kotak Tahap Paraf (Umlaufzettel) */}
      <div className="slip-steps" role="list" aria-label="Urutan paraf persetujuan">
        <div className="slip-box" role="listitem">
          <div className="slip-step-num">
            <span>01 Pemohon</span>
          </div>
          <div className="slip-actor">{request.applicantName}</div>
          <div className="slip-state text-[var(--spruce)]">
            ✓ {formatIndonesianDate(request.submissionDate)}
          </div>
          <div className="slip-paraf">
            <ParafSvg seed={seedBase} />
          </div>
        </div>

        <div className={`slip-box ${step2Cls}`} role="listitem">
          <div className="slip-step-num">
            <span>02 Ketua Divisi</span>
          </div>
          <div className="slip-actor">{step2Actor}</div>
          <div
            className={`slip-state ${
              step2Cls === "is-rejected"
                ? "text-[var(--terracotta)]"
                : step2Cls === "is-action"
                  ? "text-[var(--ochre)]"
                  : step2Cls === "is-skipped"
                    ? "text-[var(--ink-muted)]"
                    : "text-[var(--spruce)]"
            }`}
          >
            {step2State}
          </div>
          {step2Paraf}
        </div>

        <div className={`slip-box ${step3Cls}`} role="listitem">
          <div className="slip-step-num">
            <span>03 HRD Final</span>
          </div>
          <div className="slip-actor">{step3Actor}</div>
          <div
            className={`slip-state ${
              step3Cls === "is-rejected"
                ? "text-[var(--terracotta)]"
                : step3Cls === "is-action"
                  ? "text-[var(--ochre)]"
                  : step3Cls === "is-skipped"
                    ? "text-[var(--ink-muted)]"
                    : request.status === "Approved"
                      ? "text-[var(--spruce)]"
                      : "text-[var(--ink-muted)]"
            }`}
          >
            {step3State}
          </div>
          {step3Paraf}
        </div>
      </div>

      {/* Footer: Alasan, Riwayat Ketua Divisi (khusus HRD), & Aksi */}
      <div className="slip-foot">
        {request.reason && (
          <p className="m-0 line-clamp-2 text-xs leading-relaxed text-[var(--ink-soft)]">
            <strong className="text-[var(--ink)]">Alasan:</strong>{" "}
            {request.reason}
          </p>
        )}

        {/* Riwayat Persetujuan Ketua Divisi / Jalur Langsung pada Antrean HRD */}
        {isHrd && (
          <div
            className={`notice !py-2 !text-xs ${
              isDirectLeaderPath ? "notice-warn" : "notice-info"
            }`}
          >
            {isDirectLeaderPath ? (
              <>
                <Zap aria-hidden="true" />
                <p className="m-0">
                  <strong>Jalur 2 (Langsung Ketua Divisi → HRD):</strong>{" "}
                  Pengajuan pribadi Ketua Divisi, langsung menuju otorisasi
                  final HRD.
                </p>
              </>
            ) : (
              <>
                <CheckCircle2 aria-hidden="true" />
                <p className="m-0">
                  <strong>
                    Diverifikasi {request.leaderApproverName || "Ketua Divisi"}
                  </strong>{" "}
                  <span className="mono text-[11px]">
                    ({request.leaderApprovedAt || "Tahap 1"})
                  </span>
                  {request.leaderNotes ? ` — "${request.leaderNotes}"` : ""}
                </p>
              </>
            )}
          </div>
        )}

        {showActions && (
          <div className="slip-actions border-t border-[var(--rule)] pt-2.5">
            <button
              type="button"
              onClick={() => onOpenDetail?.(request)}
              className="btn btn-sm"
            >
              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Lihat Rincian</span>
            </button>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => onOpenReject?.(request)}
                className="btn btn-danger-ghost btn-sm"
              >
                Tolak
              </button>
              <button
                type="button"
                onClick={() => onOpenApprove?.(request)}
                className="btn btn-primary btn-sm"
              >
                {isHrd ? "Paraf Final HRD" : "Paraf & Teruskan"}
              </button>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
