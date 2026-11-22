"use client";

import { useEffect, useId, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Ban,
  CalendarPlus,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Handshake,
  RefreshCw,
  X,
} from "lucide-react";
import QuotaPrecisionRuler from "@/components/ui/QuotaPrecisionRuler";
import StatusBadge from "@/components/ui/StatusBadge";
import EmptyState from "@/components/ui/EmptyState";

const STATUS_FILTER_OPTIONS = [
  "Semua",
  "Pending",
  "Approved by Leader",
  "Approved",
  "Rejected",
  "Cancelled",
];

// Stepper mini bergaya Swiss Archival untuk posisi pengajuan (Ketua Divisi -> HRD)
function MiniApprovalStepper({ status, rejectedByRole }) {
  if (status === "Cancelled") {
    return (
      <span className="mono inline-flex items-center gap-1.5 text-[11px] text-[var(--ink-muted)]">
        <Ban className="h-3.5 w-3.5" aria-hidden="true" />
        Dibatalkan
      </span>
    );
  }

  const step1State =
    status === "Approved" || status === "Approved by Leader"
      ? "done"
      : status === "Rejected" && rejectedByRole === "Ketua Divisi"
        ? "rejected"
        : status === "Rejected" && rejectedByRole === "HRD"
          ? "done"
          : "current";

  const step2State =
    status === "Approved"
      ? "done"
      : status === "Approved by Leader"
        ? "current"
        : status === "Rejected" && rejectedByRole === "HRD"
          ? "rejected"
          : "upcoming";

  function renderDot(state) {
    if (state === "done") {
      return (
        <span className="flex h-4 w-4 items-center justify-center rounded-[2px] bg-[var(--spruce)] text-[var(--spruce-btn-ink)]">
          <Check className="h-2.5 w-2.5" aria-hidden="true" />
        </span>
      );
    }
    if (state === "rejected") {
      return (
        <span className="flex h-4 w-4 items-center justify-center rounded-[2px] bg-[var(--terracotta)] text-[var(--spruce-btn-ink)]">
          <X className="h-2.5 w-2.5" aria-hidden="true" />
        </span>
      );
    }
    if (state === "current") {
      return (
        <span className="flex h-4 w-4 items-center justify-center rounded-[2px] border border-[var(--ochre-border)] bg-[var(--ochre-tint)] text-[var(--ochre)]">
          <Clock className="h-2.5 w-2.5" aria-hidden="true" />
        </span>
      );
    }
    return (
      <span className="h-3.5 w-3.5 rounded-[2px] border border-[var(--rule-strong)] bg-[var(--alabaster)]" />
    );
  }

  return (
    <div
      className="mono inline-flex items-center gap-1.5 text-[11px] text-[var(--ink-soft)]"
      aria-label="Alur verifikasi 2 tahap"
    >
      <span
        className="inline-flex items-center gap-1"
        title="Tahap 1: Ketua Divisi"
      >
        {renderDot(step1State)}
        <span>Ketua</span>
      </span>
      <span
        className={`h-px w-4 ${
          step1State === "done"
            ? "bg-[var(--spruce)]"
            : "bg-[var(--rule-strong)]"
        }`}
        aria-hidden="true"
      />
      <span
        className="inline-flex items-center gap-1"
        title="Tahap 2: Final HRD"
      >
        {renderDot(step2State)}
        <span>HRD</span>
      </span>
    </div>
  );
}

/**
 * Tampilan Dashboard Karyawan bergaya Swiss Archival (100% UI-Only Live Data).
 * Menampilkan Quota Ledger Hero + 12-Day Precision Ruler, Metric Strip,
 * Pengajuan Aktif, Handover Inbox, dan Tabel Riwayat Swiss Ledger.
 */
export default function EmployeeDashboardView({ initialData, data }) {
  const tableCaptionId = useId();
  const handoverPanelId = useId();

  const [dashboardData, setDashboardData] = useState(initialData || data);
  const [selectedStatus, setSelectedStatus] = useState("Semua");
  const [isHandoverExpanded, setIsHandoverExpanded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState("");
  const [liveStatus, setLiveStatus] = useState("");

  useEffect(() => {
    if (initialData) {
      setDashboardData(initialData);
    }
  }, [initialData]);

  const { user, stats, handoverInbox = [], recentRequests = [] } = dashboardData;

  const filteredRequests = useMemo(() => {
    if (selectedStatus === "Semua") return recentRequests;
    return recentRequests.filter((req) => req.status === selectedStatus);
  }, [recentRequests, selectedStatus]);

  const activeRequest = useMemo(() => {
    return (
      recentRequests.find(
        (req) => req.status === "Pending" || req.status === "Approved by Leader"
      ) || null
    );
  }, [recentRequests]);

  const activeCount =
    Number(stats.pendingCount || 0) + Number(stats.approvedByLeaderCount || 0);
  const firstHandover = handoverInbox[0] || null;

  async function handleRefresh() {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setRefreshError("");
    try {
      const res = await fetch("/api/dashboard", { cache: "no-store" });
      const payload = await res.json();
      if (!res.ok || !payload.ok) {
        setRefreshError(
          payload.error || "Gagal menyegarkan data dashboard dari server."
        );
        return;
      }
      setDashboardData(payload.data);
      setLiveStatus("Data Dashboard Karyawan berhasil disegarkan.");
    } catch {
      setRefreshError("Koneksi terputus saat menyegarkan data dashboard.");
    } finally {
      setIsRefreshing(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="visually-hidden" role="status" aria-live="polite">
        {liveStatus}
      </div>

      {refreshError && (
        <div role="alert" className="notice notice-danger">
          <AlertCircle aria-hidden="true" />
          <span>{refreshError}</span>
        </div>
      )}

      {/* 1. HERO: QUOTA LEDGER & 12-DAY PRECISION RULER */}
      <section className="quota-hero" aria-label="Ringkasan Saldo Kuota">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="panel-eyebrow !mb-0">
                Saldo Cuti Tahunan
                {user.divisionName ? ` • ${user.divisionName}` : ""} &bull;
                Tahun Buku {new Date().getFullYear()}
              </span>
              <StatusBadge
                status={
                  user.isEligibleAnnualLeave ? "Eligible" : "Belum Eligible"
                }
              />
            </div>

            <div className="mt-1.5 font-serif text-[42px] font-semibold leading-none text-[var(--spruce)] tabular-nums sm:text-[46px]">
              {stats.remainingQuota.toFixed(1)}{" "}
              <span className="font-sans text-[15px] font-normal text-[var(--ink-soft)]">
                dari {stats.initialQuota.toFixed(1)} hari kerja
              </span>
            </div>

            <p className="mt-2 text-xs text-[var(--ink-soft)]">
              Selamat datang,{" "}
              <strong className="font-semibold text-[var(--ink)]">
                {user.fullName}
              </strong>
              .{" "}
              {user.isEligibleAnnualLeave
                ? "Anda memenuhi syarat masa kerja ≥ 1 tahun untuk pengajuan Cuti Tahunan (min. H-3)."
                : "Masa kerja < 1 tahun: Cuti Tahunan terkunci, namun Cuti Sakit & Cuti Lainnya tetap tersedia."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="btn btn-sm"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`}
                aria-hidden="true"
              />
              <span>Segarkan</span>
            </button>
            <Link href="/leaves/new" className="btn btn-primary">
              <CalendarPlus className="h-4 w-4" aria-hidden="true" />
              <span>Ajukan Cuti Baru</span>
            </Link>
          </div>
        </div>

        {/* 12-Day Precision Ruler */}
        <QuotaPrecisionRuler
          total={stats.initialQuota}
          remaining={stats.remainingQuota}
          delta={0}
        />

        {/* 3-Cell Quota KPI Row */}
        <div className="quota-kpi-row">
          <div className="quota-kpi-cell">
            <div className="metric-label">Terpakai / Hold</div>
            <div className="mono mt-0.5 text-xl font-semibold text-[var(--ochre)]">
              {stats.usedQuota.toFixed(1)} hr
            </div>
          </div>
          <div className="quota-kpi-cell">
            <div className="metric-label">Pengajuan Aktif</div>
            <div className="mono mt-0.5 text-xl font-semibold text-[var(--ink)]">
              {String(activeCount).padStart(2, "0")}
            </div>
          </div>
          <div className="quota-kpi-cell">
            <div className="metric-label">Disetujui</div>
            <div className="mono mt-0.5 text-xl font-semibold text-[var(--spruce)]">
              {String(stats.approvedCount).padStart(2, "0")}
            </div>
          </div>
        </div>
      </section>

      {/* 2. METRIC STRIP (4 Sel Ringkas Arsip) */}
      <div className="metric-strip" role="region" aria-label="Ringkasan Metrik">
        <div className="metric-cell">
          <div className="metric-label">Total Pengajuan Saya</div>
          <div className="metric-val">
            {String(stats.totalRequests).padStart(2, "0")}
          </div>
          <div className="metric-note">
            <Link
              href="/leaves"
              className="font-mono text-[11px] font-semibold text-[var(--spruce)] hover:underline"
            >
              Buka Riwayat Cuti &rarr;
            </Link>
          </div>
        </div>

        <div className="metric-cell">
          <div className="metric-label">Cuti Sakit Diajukan</div>
          <div className="metric-val text-[var(--terracotta)]">
            {String(stats.sickLeaveCount).padStart(2, "0")}
          </div>
          <div className="metric-note mono">
            Total {stats.sickLeaveDays.toFixed(1)} hari di tahun berjalan
          </div>
        </div>

        <div className="metric-cell">
          <div className="metric-label">Status Berjalan</div>
          <div className="metric-val text-[var(--ochre)]">
            {String(stats.pendingCount + stats.approvedByLeaderCount).padStart(
              2,
              "0"
            )}
          </div>
          <div className="metric-note">
            {stats.pendingCount} Pending &bull; {stats.approvedByLeaderCount}{" "}
            Tahap HRD &bull; {stats.rejectedCount} Ditolak
          </div>
        </div>

        <div className="metric-cell">
          <div className="metric-label">Divisi &amp; Atasan</div>
          <div className="truncate font-serif text-2xl font-semibold leading-tight text-[var(--ink)]">
            {user.divisionName || "Belum Ditugaskan"}
          </div>
          <div className="metric-note truncate">
            {user.leaderName
              ? `Ketua: ${user.leaderName}`
              : "Belum ada Ketua Divisi aktif"}
          </div>
        </div>
      </div>

      {/* 3. PANEL PENGAJUAN AKTIF (Jika ada yang sedang diproses) */}
      {activeRequest && (
        <section className="panel" aria-label="Pengajuan Cuti Aktif">
          <div className="panel-head">
            <div>
              <span className="panel-eyebrow">Lembar Edaran Berjalan</span>
              <h2 className="panel-title">Pengajuan Aktif Terkini</h2>
              <p className="panel-sub">
                Lacak posisi verifikasi atasan dan persetujuan akhir HRD.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge
                status={activeRequest.status}
                rejectedByRole={activeRequest.rejectedByRole}
              />
              <Link href="/leaves" className="btn btn-sm">
                <span>Detail Riwayat</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
          </div>

          <div className="panel-body">
            <article className="slip">
              <div className="slip-meta">
                <span>
                  <strong className="text-[var(--ink)]">Jenis:</strong>{" "}
                  {activeRequest.leaveTypeName}
                  {activeRequest.isHalfDay ? " (0.5 Hari)" : ""}
                </span>
                <span>
                  <strong className="text-[var(--ink)]">Periode:</strong>{" "}
                  <span className="mono">
                    {activeRequest.periodLabel} (
                    {activeRequest.totalDays.toFixed(1)} hr)
                  </span>
                </span>
                <span>
                  <strong className="text-[var(--ink)]">Handover:</strong>{" "}
                  {activeRequest.handoverName}
                </span>
              </div>

              <div
                className="slip-steps"
                role="list"
                aria-label="Tahapan persetujuan pengajuan aktif"
              >
                <div className="slip-box" role="listitem">
                  <span className="mono text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ink-muted)]">
                    01 Pemohon
                  </span>
                  <span className="text-[13px] font-semibold text-[var(--ink)]">
                    {user.fullName}
                  </span>
                  <span className="mono mt-auto text-[11px] text-[var(--spruce)]">
                    ✓ Diajukan
                  </span>
                </div>

                <div
                  className={`slip-box ${
                    activeRequest.status === "Pending" ? "is-action" : ""
                  }`}
                  role="listitem"
                >
                  <span className="mono text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ink-muted)]">
                    02 Ketua Divisi
                  </span>
                  <span className="text-[13px] font-semibold text-[var(--ink)]">
                    {user.leaderName || "Ketua Divisi"}
                  </span>
                  <span
                    className={`mono mt-auto text-[11px] ${
                      activeRequest.status === "Approved by Leader"
                        ? "text-[var(--spruce)]"
                        : "text-[var(--ochre)]"
                    }`}
                  >
                    {activeRequest.status === "Approved by Leader"
                      ? "✓ Terverifikasi"
                      : "○ Menunggu verifikasi"}
                  </span>
                </div>

                <div
                  className={`slip-box ${
                    activeRequest.status === "Approved by Leader"
                      ? "is-action"
                      : ""
                  }`}
                  role="listitem"
                >
                  <span className="mono text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ink-muted)]">
                    03 HRD Final
                  </span>
                  <span className="text-[13px] font-semibold text-[var(--ink)]">
                    Otorisasi HRD
                  </span>
                  <span className="mono mt-auto text-[11px] text-[var(--ink-muted)]">
                    {activeRequest.status === "Approved by Leader"
                      ? "○ Menunggu paraf final"
                      : "○ Menunggu tahap 02"}
                  </span>
                </div>
              </div>
            </article>
          </div>
        </section>
      )}

      {/* 4. HANDOVER INBOX (Banner Kondisional) */}
      {handoverInbox.length === 0 ? (
        <div className="notice notice-success">
          <CheckCircle2 aria-hidden="true" />
          <span>
            Tidak ada penunjukan serah terima tugas (handover) aktif
            {user.divisionName ? (
              <>
                {" "}
                di divisi{" "}
                <strong className="font-semibold">{user.divisionName}</strong>
              </>
            ) : null}{" "}
            saat ini.
          </span>
        </div>
      ) : (
        <section className="panel" aria-label="Penunjukan Handover Aktif">
          <div className="panel-head">
            <div className="flex min-w-0 items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[2px] border border-[var(--slate-border)] bg-[var(--slate-tint)] text-[var(--slate-blue)]">
                <Handshake className="h-4 w-4" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="tag tag-leader">
                    Handover Aktif ({handoverInbox.length})
                  </span>
                  <h2 className="panel-title !text-sm">
                    Menggantikan {firstHandover.requesterName} &middot;{" "}
                    <span className="mono text-xs font-medium">
                      {firstHandover.periodLabel} (
                      {firstHandover.totalDays.toFixed(1)} hr)
                    </span>
                  </h2>
                </div>
                <p className="panel-sub truncate">
                  Tugas: &ldquo;{firstHandover.handoverNotes}&rdquo;
                  {handoverInbox.length > 1
                    ? ` (+${handoverInbox.length - 1} penunjukan lainnya)`
                    : ""}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsHandoverExpanded((prev) => !prev)}
              aria-expanded={isHandoverExpanded}
              aria-controls={handoverPanelId}
              className="btn btn-sm shrink-0"
            >
              <span>{isHandoverExpanded ? "Tutup Detail" : "Lihat Detail"}</span>
              {isHandoverExpanded ? (
                <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
              )}
            </button>
          </div>

          {isHandoverExpanded && (
            <div id={handoverPanelId} className="panel-body space-y-3">
              {handoverInbox.map((item) => (
                <article
                  key={item.id}
                  className="border border-[var(--rule)] bg-[var(--paper)] p-3.5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-[var(--ink)]">
                        {item.requesterName}{" "}
                        <span className="text-xs font-normal text-[var(--ink-muted)]">
                          ({item.divisionName})
                        </span>
                      </p>
                      <p className="mono mt-0.5 text-xs text-[var(--slate-blue)]">
                        {item.leaveTypeName} &middot; {item.periodLabel} (
                        {item.totalDays.toFixed(1)} Hari)
                      </p>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                  <p className="mt-2 border border-[var(--rule)] bg-[var(--paper-pure)] px-3 py-2 text-xs leading-relaxed text-[var(--ink-soft)]">
                    <strong className="font-semibold text-[var(--ink)]">
                      Catatan Tugas:{" "}
                    </strong>
                    {item.handoverNotes}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 5. TABEL RIWAYAT CUTI TERBARU (SWISS LEDGER) */}
      <section className="panel overflow-hidden">
        <div className="panel-head">
          <div>
            <span className="panel-eyebrow">Arsip Pengajuan Pribadi</span>
            <h2 className="panel-title">Riwayat Pengajuan Cuti Terbaru Saya</h2>
            <p className="panel-sub">
              Lacak progres verifikasi Ketua Divisi &amp; HRD secara langsung.
            </p>
          </div>
          <Link href="/leaves" className="btn btn-sm">
            <span>Lihat Semua</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>

        {/* Filter Status Toolbar */}
        <div
          className="toolbar"
          role="group"
          aria-label="Filter status riwayat pengajuan cuti"
        >
          <div className="seg-group flex-wrap">
            {STATUS_FILTER_OPTIONS.map((statusOpt) => {
              const active = statusOpt === selectedStatus;
              return (
                <button
                  key={statusOpt}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setSelectedStatus(statusOpt)}
                  className="seg-btn"
                >
                  {statusOpt}
                </button>
              );
            })}
          </div>
          <span className="mono ml-auto text-[11px] text-[var(--ink-muted)]">
            {filteredRequests.length} catatan
          </span>
        </div>

        {filteredRequests.length === 0 ? (
          <div className="panel-body">
            <EmptyState
              title="Tidak ada pengajuan dengan status ini"
              description="Coba pilih filter status lain atau ajukan permohonan cuti baru."
              actionLabel="Ajukan Cuti Baru"
              actionHref="/leaves/new"
            />
          </div>
        ) : (
          <div
            tabIndex={0}
            role="region"
            aria-labelledby={tableCaptionId}
            className="otium-responsive-table-wrap"
          >
            <table className="ledger otium-responsive-table text-left">
              <caption id={tableCaptionId} className="visually-hidden">
                Riwayat pengajuan cuti terbaru saya beserta alur persetujuan 2
                tahap
              </caption>
              <thead>
                <tr>
                  <th scope="col" className="row-idx">
                    #
                  </th>
                  <th scope="col">Jenis Cuti</th>
                  <th scope="col">Periode Tanggal</th>
                  <th scope="col">Durasi</th>
                  <th scope="col">Rekan Handover</th>
                  <th scope="col">Alur 2 Tahap</th>
                  <th scope="col" className="text-right">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((req, idx) => (
                  <tr key={req.id}>
                    <td data-label="No" className="row-idx">
                      {String(idx + 1).padStart(2, "0")}
                    </td>
                    <th scope="row" className="font-semibold text-[var(--ink)]">
                      <span>{req.leaveTypeName}</span>
                      {req.isHalfDay && (
                        <span className="tag tag-leader ml-2 !py-0 !text-[10px]">
                          0.5 Hr
                        </span>
                      )}
                    </th>
                    <td
                      data-label="Periode"
                      className="mono whitespace-nowrap text-xs text-[var(--ink-soft)]"
                    >
                      {req.periodLabel}
                    </td>
                    <td
                      data-label="Durasi"
                      className="mono whitespace-nowrap text-xs font-semibold text-[var(--ink)]"
                    >
                      {req.totalDays.toFixed(1)} hr
                    </td>
                    <td
                      data-label="Rekan Handover"
                      className="whitespace-nowrap text-xs text-[var(--ink-soft)]"
                    >
                      {req.handoverName}
                    </td>
                    <td data-label="Alur 2 Tahap" className="whitespace-nowrap">
                      <MiniApprovalStepper
                        status={req.status}
                        rejectedByRole={req.rejectedByRole}
                      />
                    </td>
                    <td
                      data-label="Status"
                      className="whitespace-nowrap text-right"
                    >
                      <StatusBadge
                        status={req.status}
                        rejectedByRole={req.rejectedByRole}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
