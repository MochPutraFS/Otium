"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  FileDown,
  RefreshCw,
  RotateCcw,
  Search,
  Zap,
} from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import EmptyState from "@/components/ui/EmptyState";
import ApprovalModal from "@/components/ui/ApprovalModal";
import VerificationCard from "@/components/approvals/VerificationCard";
import HrdBulkApprovalBar from "@/components/approvals/HrdBulkApprovalBar";
import HrdBulkConfirmModal from "@/components/approvals/HrdBulkConfirmModal";
import ApprovalDetailDrawer from "@/components/approvals/ApprovalDetailDrawer";
import { formatIndonesianDateRange } from "@/lib/date-utils";
import {
  bulkApproveByHrdAction,
  verifyByHrdAction,
} from "@/actions/approval-actions";

const WORKSPACE_TABS = [
  { key: "queue", label: "Menunggu Final Approval" },
  { key: "all", label: "Seluruh Pengajuan Perusahaan" },
];

function isPendingFinalHrd(req) {
  return (
    (req.applicantRole === "Karyawan" && req.status === "Approved by Leader") ||
    (req.applicantRole === "Ketua Divisi" && req.status === "Pending")
  );
}

/**
 * Workspace Modul 6B: Persetujuan Final & Multi-Approve — Khusus HRD (/approvals/hrd).
 * 100% UI-Only Swiss Archival dengan Segmented Toggle (Kartu Paraf vs Tabel Ringkas),
 * checkbox Pilih Semua, Floating Bulk Action Bar, dan Swiss Ledger Table.
 */
export default function HrdApprovalClient({
  initialHrdProfile,
  initialRequests = [],
  initialCounts = {
    pendingFinal: 0,
    jalur1: 0,
    jalur2: 0,
    approved: 0,
    total: 0,
  },
  divisions = [],
  leaveTypes = [],
}) {
  const router = useRouter();
  const tableCaptionId = useId();
  const queueTableCaptionId = useId();
  const searchInputId = useId();
  const queueTabId = useId();
  const allTabId = useId();
  const tabRefs = useRef([]);

  const [hrdProfile, setHrdProfile] = useState(initialHrdProfile);
  const [allRequests, setAllRequests] = useState(initialRequests);
  const [counts, setCounts] = useState(initialCounts);

  const [activeTab, setActiveTab] = useState("queue"); // "queue" | "all"
  const [queueViewMode, setQueueViewMode] = useState("cards"); // "cards" | "table"
  const [searchQuery, setSearchQuery] = useState("");
  const [jalurFilter, setJalurFilter] = useState("ALL");
  const [divisionFilter, setDivisionFilter] = useState("ALL");
  const [leaveTypeFilter, setLeaveTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkNotes, setBulkNotes] = useState("");
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

  const [detailTarget, setDetailTarget] = useState(null);
  const [modalState, setModalState] = useState({
    isOpen: false,
    actionType: "Approve",
    request: null,
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    setHrdProfile(initialHrdProfile);
  }, [initialHrdProfile]);

  useEffect(() => {
    setAllRequests(initialRequests);
  }, [initialRequests]);

  useEffect(() => {
    setCounts(initialCounts);
  }, [initialCounts]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function showToast(message, tone = "success") {
    setToast({ message, tone });
  }

  async function refreshFromServer({ silent = false } = {}) {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/approvals/hrd", {
        method: "GET",
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        if (!silent) {
          showToast(
            data.error || "Gagal menyinkronkan data persetujuan HRD.",
            "error"
          );
        }
        return;
      }

      if (data.hrdProfile) setHrdProfile(data.hrdProfile);
      if (Array.isArray(data.requests)) setAllRequests(data.requests);
      if (data.counts) setCounts(data.counts);

      if (!silent) {
        showToast(
          "Data antrean & pengajuan perusahaan disinkronkan dari PostgreSQL."
        );
      }
    } catch {
      if (!silent) {
        showToast(
          "Koneksi terputus saat menyegarkan antrean Persetujuan Final HRD.",
          "error"
        );
      }
    } finally {
      setIsRefreshing(false);
    }
  }

  const hrdQueue = useMemo(
    () => allRequests.filter(isPendingFinalHrd),
    [allRequests]
  );

  const filteredQueue = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return hrdQueue.filter((req) => {
      if (
        q &&
        !req.applicantName.toLowerCase().includes(q) &&
        !req.divisionName.toLowerCase().includes(q) &&
        !req.handoverUserName.toLowerCase().includes(q) &&
        !req.reason.toLowerCase().includes(q)
      ) {
        return false;
      }
      if (jalurFilter === "J1" && req.applicantRole !== "Karyawan") return false;
      if (jalurFilter === "J2" && req.applicantRole !== "Ketua Divisi") {
        return false;
      }
      if (
        divisionFilter !== "ALL" &&
        String(req.divisionId) !== String(divisionFilter)
      ) {
        return false;
      }
      if (
        leaveTypeFilter !== "ALL" &&
        String(req.leaveTypeId) !== String(leaveTypeFilter)
      ) {
        return false;
      }
      return true;
    });
  }, [hrdQueue, searchQuery, jalurFilter, divisionFilter, leaveTypeFilter]);

  const filteredAllRequests = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allRequests.filter((req) => {
      if (
        q &&
        !req.applicantName.toLowerCase().includes(q) &&
        !req.divisionName.toLowerCase().includes(q) &&
        !req.handoverUserName.toLowerCase().includes(q) &&
        !req.reason.toLowerCase().includes(q)
      ) {
        return false;
      }
      if (
        divisionFilter !== "ALL" &&
        String(req.divisionId) !== String(divisionFilter)
      ) {
        return false;
      }
      if (
        leaveTypeFilter !== "ALL" &&
        String(req.leaveTypeId) !== String(leaveTypeFilter)
      ) {
        return false;
      }
      if (statusFilter !== "ALL" && req.status !== statusFilter) return false;
      return true;
    });
  }, [allRequests, searchQuery, divisionFilter, leaveTypeFilter, statusFilter]);

  const hasActiveFilter =
    searchQuery.trim() !== "" ||
    divisionFilter !== "ALL" ||
    leaveTypeFilter !== "ALL" ||
    (activeTab === "queue" && jalurFilter !== "ALL") ||
    (activeTab === "all" && statusFilter !== "ALL");

  function handleResetFilters() {
    setSearchQuery("");
    setJalurFilter("ALL");
    setDivisionFilter("ALL");
    setLeaveTypeFilter("ALL");
    setStatusFilter("ALL");
  }

  const visibleSelectedRequests = useMemo(
    () => filteredQueue.filter((req) => selectedIds.includes(req.id)),
    [filteredQueue, selectedIds]
  );

  const visibleSelectedIds = useMemo(
    () => visibleSelectedRequests.map((req) => req.id),
    [visibleSelectedRequests]
  );

  const allVisibleSelected =
    filteredQueue.length > 0 &&
    visibleSelectedIds.length === filteredQueue.length;

  function handleToggleSelect(id, checked) {
    setSelectedIds((prev) => {
      if (checked) return prev.includes(id) ? prev : [...prev, id];
      return prev.filter((item) => item !== id);
    });
  }

  function handleToggleSelectAll(checked) {
    if (checked) {
      setSelectedIds(filteredQueue.map((req) => req.id));
    } else {
      setSelectedIds([]);
    }
  }

  function handleTabKeyDown(event, index) {
    const total = WORKSPACE_TABS.length;
    let nextIndex = null;

    if (event.key === "ArrowRight") {
      nextIndex = (index + 1) % total;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (index - 1 + total) % total;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = total - 1;
    }

    if (nextIndex !== null) {
      event.preventDefault();
      setActiveTab(WORKSPACE_TABS[nextIndex].key);
      setSelectedIds([]);
      tabRefs.current[nextIndex]?.focus();
    }
  }

  function handleOpenModal(request, actionType) {
    setModalState({ isOpen: true, actionType, request });
  }

  function handleCloseModal() {
    setModalState((prev) => ({ ...prev, isOpen: false }));
  }

  async function handleSubmitSingleDecision(notes) {
    const target = modalState.request;
    if (!target) {
      return { ok: false, error: "Pengajuan target tidak ditemukan." };
    }

    const result = await verifyByHrdAction(
      target.id,
      modalState.actionType,
      notes
    );

    if (!result?.ok) {
      showToast(
        result?.error || "Gagal memproses keputusan final HRD.",
        "error"
      );
      return result;
    }

    if (detailTarget?.id === target.id) {
      setDetailTarget(null);
    }
    setSelectedIds((prev) => prev.filter((id) => id !== target.id));

    const isApprove = modalState.actionType === "Approve";
    const refundSuffix =
      !isApprove && Number(result.refundedDays || 0) > 0
        ? ` (+${Number(result.refundedDays).toFixed(1)} Hr Auto-Refund)`
        : "";

    showToast(
      isApprove
        ? `Pengajuan ${result.applicantName} resmi disetujui Final HRD. Surat Cuti PDF siap diunduh.`
        : `Pengajuan ${result.applicantName} ditolak oleh HRD${refundSuffix}.`
    );

    await refreshFromServer({ silent: true });
    router.refresh();
    return result;
  }

  async function handleConfirmBulkApprove(finalNotes) {
    if (visibleSelectedIds.length === 0) {
      return {
        ok: false,
        error: "Tidak ada pengajuan terpilih untuk disetujui.",
      };
    }

    const result = await bulkApproveByHrdAction(visibleSelectedIds, finalNotes);
    if (!result?.ok) {
      showToast(
        result?.error || "Gagal mengeksekusi Multi-Approve HRD.",
        "error"
      );
      return result;
    }

    setSelectedIds([]);
    setBulkNotes("");
    setDetailTarget(null);
    showToast(
      `${result.approvedCount} pengajuan berhasil disetujui final sekaligus (Multi-Approve Atomik HRD).`
    );

    await refreshFromServer({ silent: true });
    router.refresh();
    return result;
  }

  return (
    <div className="space-y-5 pb-16">
      {/* Header Arsip */}
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--rule-strong)] pb-4">
        <div>
          <span className="panel-eyebrow">
            Otorisasi Tahap Final &bull; Multi-Approve HRD
          </span>
          <h2 className="mt-1 font-serif text-[28px] font-semibold leading-tight text-[var(--ink)]">
            Persetujuan Final Cuti Karyawan
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-[var(--ink-soft)]">
            Final Approver:{" "}
            <strong className="font-semibold text-[var(--ink)]">
              {hrdProfile?.fullName || "HRD"}
            </strong>{" "}
            &mdash; Menangani Jalur 1 (Karyawan <em>Approved by Leader</em>)
            &amp; Jalur 2 (Ketua Divisi langsung) dengan Multi-Approve atomik.
          </p>
        </div>

        <button
          type="button"
          onClick={() => refreshFromServer({ silent: false })}
          disabled={isRefreshing}
          className="btn btn-sm"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
          <span>{isRefreshing ? "Menyinkronkan..." : "Sinkronkan"}</span>
        </button>
      </header>

      {/* Metric Strip (4 Sel Arsip) */}
      <div
        className="metric-strip"
        role="region"
        aria-label="Ringkasan Antrean Final HRD"
      >
        <div className="metric-cell">
          <div className="metric-label">Menunggu Final HRD</div>
          <div className="metric-val text-[var(--ochre)]">
            {String(counts.pendingFinal).padStart(2, "0")}
          </div>
          <div className="metric-note">Siap review &amp; multi-approve</div>
        </div>

        <div className="metric-cell">
          <div className="metric-label">Jalur 1 (Karyawan)</div>
          <div className="metric-val text-[var(--slate-blue)]">
            {String(counts.jalur1).padStart(2, "0")}
          </div>
          <div className="metric-note">Lolos verifikasi Ketua Divisi</div>
        </div>

        <div className="metric-cell">
          <div className="metric-label">Jalur 2 (Ketua Divisi)</div>
          <div className="metric-val text-[var(--ochre)]">
            {String(counts.jalur2).padStart(2, "0")}
          </div>
          <div className="metric-note">Pengajuan langsung Ketua Divisi</div>
        </div>

        <div className="metric-cell">
          <div className="metric-label">Total Perusahaan</div>
          <div className="metric-val">
            {String(counts.total).padStart(2, "0")}
          </div>
          <div className="metric-note mono text-[11px] text-[var(--spruce)]">
            {counts.approved} disetujui final (PDF aktif)
          </div>
        </div>
      </div>

      {/* Main Workspace Panel */}
      <section className="panel overflow-hidden">
        {/* Tabs + Segmented View Toggle (Kartu Paraf vs Tabel Ringkas) */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--rule)] bg-[var(--paper)] px-5 pt-3">
          <div
            role="tablist"
            aria-label="Tampilan daftar persetujuan HRD"
            className="flex flex-nowrap items-center gap-6 overflow-x-auto"
          >
            {WORKSPACE_TABS.map((tab, index) => {
              const isSelected = activeTab === tab.key;
              const badgeCount =
                tab.key === "queue" ? hrdQueue.length : allRequests.length;
              const tabId = tab.key === "queue" ? queueTabId : allTabId;

              return (
                <button
                  key={tab.key}
                  ref={(el) => {
                    tabRefs.current[index] = el;
                  }}
                  id={tabId}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  tabIndex={isSelected ? 0 : -1}
                  onClick={() => {
                    setActiveTab(tab.key);
                    setSelectedIds([]);
                  }}
                  onKeyDown={(event) => handleTabKeyDown(event, index)}
                  className={`otium-tab mono inline-flex shrink-0 cursor-pointer items-center gap-2 pb-3 pt-1 text-xs font-semibold uppercase tracking-[0.04em] transition-colors ${
                    isSelected
                      ? "text-[var(--spruce)]"
                      : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`border px-1.5 py-0 text-[10px] ${
                      isSelected
                        ? "border-[var(--spruce-border)] bg-[var(--spruce-tint)] text-[var(--spruce)]"
                        : "border-[var(--rule)] bg-[var(--paper-pure)] text-[var(--ink-muted)]"
                    }`}
                  >
                    {badgeCount}
                  </span>
                </button>
              );
            })}
          </div>

          {activeTab === "queue" && (
            <div className="pb-2.5">
              <div
                className="seg-group"
                role="group"
                aria-label="Mode tampilan antrean HRD"
              >
                <button
                  type="button"
                  className="seg-btn"
                  aria-pressed={queueViewMode === "cards"}
                  onClick={() => setQueueViewMode("cards")}
                >
                  Kartu Paraf
                </button>
                <button
                  type="button"
                  className="seg-btn"
                  aria-pressed={queueViewMode === "table"}
                  onClick={() => setQueueViewMode("table")}
                >
                  Tabel Ringkas
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Filter Toolbar */}
        <div className="toolbar">
          <div className="relative w-full sm:w-56">
            <label htmlFor={searchInputId} className="visually-hidden">
              Cari pemohon, divisi, handover, atau alasan cuti
            </label>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--ink-muted)]"
              aria-hidden="true"
            />
            <input
              id={searchInputId}
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Cari pemohon / divisi..."
              className="input !py-1.5 !pl-8 !pr-3 !text-xs"
            />
          </div>

          {activeTab === "queue" && (
            <select
              value={jalurFilter}
              onChange={(event) => setJalurFilter(event.target.value)}
              aria-label="Filter jalur persetujuan"
              className="select !w-auto cursor-pointer !py-1.5 !text-xs"
            >
              <option value="ALL">Semua Jalur</option>
              <option value="J1">Jalur 1: Karyawan</option>
              <option value="J2">Jalur 2: Ketua Divisi</option>
            </select>
          )}

          <select
            value={divisionFilter}
            onChange={(event) => setDivisionFilter(event.target.value)}
            aria-label="Filter divisi"
            className="select !w-auto cursor-pointer !py-1.5 !text-xs"
          >
            <option value="ALL">Semua Divisi</option>
            {divisions.map((div) => (
              <option key={div.id} value={div.id}>
                {div.name}
              </option>
            ))}
          </select>

          <select
            value={leaveTypeFilter}
            onChange={(event) => setLeaveTypeFilter(event.target.value)}
            aria-label="Filter jenis cuti"
            className="select !w-auto cursor-pointer !py-1.5 !text-xs"
          >
            <option value="ALL">Semua Jenis Cuti</option>
            {leaveTypes.map((lt) => (
              <option key={lt.id} value={lt.id}>
                {lt.name}
              </option>
            ))}
          </select>

          {activeTab === "all" && (
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label="Filter status pengajuan"
              className="select !w-auto cursor-pointer !py-1.5 !text-xs"
            >
              <option value="ALL">Semua Status</option>
              <option value="Pending">Pending</option>
              <option value="Approved by Leader">Approved by Leader</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          )}

          {hasActiveFilter && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="btn btn-sm !min-h-[30px]"
            >
              <RotateCcw className="h-3 w-3" aria-hidden="true" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Sticky Select-All & Floating Bulk Bar (Khusus Tab Antrean Final HRD) */}
        {activeTab === "queue" && (
          <HrdBulkApprovalBar
            totalVisibleCount={filteredQueue.length}
            selectedCount={visibleSelectedIds.length}
            allSelected={allVisibleSelected}
            bulkNotes={bulkNotes}
            isSubmitting={isBulkModalOpen}
            onToggleSelectAll={handleToggleSelectAll}
            onBulkNotesChange={setBulkNotes}
            onRequestBulkApprove={() => {
              if (visibleSelectedIds.length > 0) {
                setIsBulkModalOpen(true);
              }
            }}
          />
        )}

        {/* Tab Panel 1: Antrean Final HRD (Kartu Paraf vs Tabel Ringkas) */}
        {activeTab === "queue" ? (
          <div role="tabpanel" aria-labelledby={queueTabId}>
            {filteredQueue.length === 0 ? (
              <div className="panel-body">
                <EmptyState
                  title="Antrean Final HRD Kosong"
                  description={
                    hasActiveFilter
                      ? "Tidak ada pengajuan dalam antrean final yang cocok dengan kombinasi filter saat ini."
                      : "Seluruh pengajuan Karyawan (Approved by Leader) dan Ketua Divisi (Pending) telah selesai diproses."
                  }
                />
              </div>
            ) : queueViewMode === "cards" ? (
              <div className="panel-body space-y-4">
                {filteredQueue.map((request) => (
                  <VerificationCard
                    key={request.id}
                    request={request}
                    mode="hrd"
                    isSelected={visibleSelectedIds.includes(request.id)}
                    onToggleSelect={handleToggleSelect}
                    onOpenDetail={(req) => setDetailTarget(req)}
                    onOpenApprove={(req) => handleOpenModal(req, "Approve")}
                    onOpenReject={(req) => handleOpenModal(req, "Reject")}
                  />
                ))}
              </div>
            ) : (
              /* Mode Tabel Ringkas untuk Antrean HRD */
              <div
                tabIndex={0}
                role="region"
                aria-labelledby={queueTableCaptionId}
                className="otium-responsive-table-wrap"
              >
                <table className="ledger otium-responsive-table text-left">
                  <caption id={queueTableCaptionId} className="visually-hidden">
                    Tabel ringkas antrean persetujuan final HRD
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col" className="row-idx">
                        Pilih
                      </th>
                      <th scope="col">Pemohon &amp; Divisi</th>
                      <th scope="col">Jenis &amp; Periode</th>
                      <th scope="col">Durasi</th>
                      <th scope="col">Verifikasi Atasan</th>
                      <th scope="col" className="text-right">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredQueue.map((request) => {
                      const checked = visibleSelectedIds.includes(request.id);
                      const isDirectLeader =
                        request.applicantRole === "Ketua Divisi";
                      return (
                        <tr
                          key={request.id}
                          className={checked ? "bg-[var(--spruce-tint)]" : ""}
                        >
                          <td data-label="Pilih" className="row-idx">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) =>
                                handleToggleSelect(request.id, e.target.checked)
                              }
                              aria-label={`Pilih pengajuan ${request.applicantName}`}
                              className="otium-checkbox h-4 w-4 cursor-pointer"
                            />
                          </td>
                          <th scope="row" className="font-normal">
                            <p className="font-semibold text-[var(--ink)]">
                              {request.applicantName}
                            </p>
                            <p className="text-[11px] text-[var(--ink-muted)]">
                              {request.applicantRole} &bull;{" "}
                              {request.divisionName}
                            </p>
                          </th>
                          <td data-label="Jenis & Periode">
                            <p className="font-medium text-[var(--ink)]">
                              {request.leaveTypeName}
                            </p>
                            <p className="mono text-[11px] text-[var(--ink-soft)]">
                              {formatIndonesianDateRange(
                                request.startDate,
                                request.endDate,
                                request.isHalfDay
                              )}
                            </p>
                          </td>
                          <td
                            data-label="Durasi"
                            className="mono whitespace-nowrap text-xs font-semibold text-[var(--ink)]"
                          >
                            {Number(request.totalDays).toFixed(1)} hr
                          </td>
                          <td data-label="Verifikasi Atasan">
                            {isDirectLeader ? (
                              <span className="tag tag-pending">
                                <Zap className="h-3 w-3" aria-hidden="true" />
                                <span>Jalur 2 (Langsung HRD)</span>
                              </span>
                            ) : (
                              <div>
                                <p className="text-xs font-semibold text-[var(--ink)]">
                                  {request.leaderApproverName || "Ketua Divisi"}
                                </p>
                                <p className="mono text-[10.5px] text-[var(--ink-muted)]">
                                  {request.leaderApprovedAt || "Tahap 1"}
                                </p>
                              </div>
                            )}
                          </td>
                          <td data-label="Aksi" className="text-right">
                            <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setDetailTarget(request)}
                                className="btn btn-sm"
                              >
                                Detail
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleOpenModal(request, "Reject")
                                }
                                className="btn btn-danger-ghost btn-sm"
                              >
                                Tolak
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleOpenModal(request, "Approve")
                                }
                                className="btn btn-primary btn-sm"
                              >
                                Setujui
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          /* Tab Panel 2: Seluruh Pengajuan Perusahaan (Swiss Ledger Table) */
          <div role="tabpanel" aria-labelledby={allTabId}>
            {filteredAllRequests.length === 0 ? (
              <div className="panel-body">
                <EmptyState
                  title="Tidak Ada Data Pengajuan"
                  description="Coba ubah kata kunci pencarian atau filter divisi, jenis cuti, dan status untuk melihat data lainnya."
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
                    Daftar seluruh pengajuan cuti karyawan perusahaan di semua
                    divisi dan status
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col" className="row-idx">
                        #
                      </th>
                      <th scope="col">Pemohon &amp; Divisi</th>
                      <th scope="col">Jenis &amp; Periode</th>
                      <th scope="col">Durasi</th>
                      <th scope="col">Verifikasi Atasan</th>
                      <th scope="col">Status</th>
                      <th scope="col" className="text-right">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAllRequests.map((request, idx) => {
                      const isDirectLeader =
                        request.applicantRole === "Ketua Divisi";
                      const canDownloadPdf = request.status === "Approved";

                      return (
                        <tr key={request.id}>
                          <td data-label="No" className="row-idx">
                            {String(idx + 1).padStart(2, "0")}
                          </td>
                          <th scope="row" className="font-normal">
                            <p className="font-semibold text-[var(--ink)]">
                              {request.applicantName}
                            </p>
                            <p className="text-[11px] text-[var(--ink-muted)]">
                              {request.applicantRole} &bull;{" "}
                              {request.divisionName}
                            </p>
                          </th>
                          <td data-label="Jenis & Periode">
                            <p className="font-medium text-[var(--ink)]">
                              {request.leaveTypeName}
                            </p>
                            <p className="mono text-[11px] text-[var(--ink-soft)]">
                              {formatIndonesianDateRange(
                                request.startDate,
                                request.endDate,
                                request.isHalfDay
                              )}
                            </p>
                          </td>
                          <td
                            data-label="Durasi"
                            className="mono whitespace-nowrap text-xs font-semibold text-[var(--ink)]"
                          >
                            {Number(request.totalDays).toFixed(1)} hr
                          </td>
                          <td data-label="Verifikasi Atasan">
                            {isDirectLeader ? (
                              <span className="tag tag-pending">
                                <Zap className="h-3 w-3" aria-hidden="true" />
                                <span>Jalur 2 (Langsung)</span>
                              </span>
                            ) : request.leaderApproverName ? (
                              <div>
                                <p className="text-xs font-medium text-[var(--ink)]">
                                  {request.leaderApproverName}
                                </p>
                                <p className="mono text-[10.5px] text-[var(--ink-muted)]">
                                  {request.leaderApprovedAt || "Tahap 1"}
                                </p>
                              </div>
                            ) : (
                              <span className="text-[11px] text-[var(--ink-muted)]">
                                Menunggu Ketua Divisi
                              </span>
                            )}
                          </td>
                          <td data-label="Status">
                            <StatusBadge
                              status={request.status}
                              rejectedByRole={request.rejectedByRole}
                            />
                          </td>
                          <td data-label="Aksi" className="text-right">
                            <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                              {canDownloadPdf && (
                                <a
                                  href={`/api/leaves/${request.id}/pdf`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  aria-label={`Cetak Surat Cuti PDF untuk ${request.applicantName}`}
                                  className="btn btn-primary btn-sm"
                                >
                                  <FileDown
                                    className="h-3.5 w-3.5"
                                    aria-hidden="true"
                                  />
                                  <span>PDF</span>
                                </a>
                              )}
                              <button
                                type="button"
                                onClick={() => setDetailTarget(request)}
                                className="btn btn-sm"
                              >
                                <Eye
                                  className="h-3.5 w-3.5"
                                  aria-hidden="true"
                                />
                                <span>Detail</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Slide-Over Detail Drawer */}
      <ApprovalDetailDrawer
        request={detailTarget}
        isOpen={Boolean(detailTarget)}
        canTakeAction={
          Boolean(detailTarget) && isPendingFinalHrd(detailTarget)
        }
        onClose={() => setDetailTarget(null)}
        onOpenApprove={(req) => handleOpenModal(req, "Approve")}
        onOpenReject={(req) => handleOpenModal(req, "Reject")}
      />

      {/* Smart Modal Persetujuan / Penolakan Tunggal HRD */}
      <ApprovalModal
        isOpen={modalState.isOpen}
        actionType={modalState.actionType}
        approverRole="HRD"
        requestSummary={modalState.request}
        onClose={handleCloseModal}
        onSubmit={handleSubmitSingleDecision}
      />

      {/* Modal Konfirmasi Multi-Approve HRD */}
      <HrdBulkConfirmModal
        isOpen={isBulkModalOpen}
        selectedRequests={visibleSelectedRequests}
        initialNotes={bulkNotes}
        onClose={() => setIsBulkModalOpen(false)}
        onConfirm={handleConfirmBulkApprove}
      />

      {/* Toast Umpan Balik Swiss Archival */}
      {toast && (
        <div
          role={toast.tone === "error" ? "alert" : "status"}
          aria-live={toast.tone === "error" ? "assertive" : "polite"}
          className={`fixed bottom-20 right-5 z-50 flex max-w-md items-center gap-2.5 rounded-[2px] border px-4 py-3 font-mono text-xs shadow-xl ${
            toast.tone === "error"
              ? "border-[var(--terracotta)] bg-[var(--terracotta-btn)] text-[var(--spruce-btn-ink)]"
              : "border-[var(--ink)] bg-[var(--ink)] text-[var(--paper-pure)]"
          }`}
        >
          {toast.tone === "error" ? (
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          )}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
