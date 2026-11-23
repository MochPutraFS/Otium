"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  FileDown,
  Paperclip,
  RefreshCw,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import EmptyState from "@/components/ui/EmptyState";
import CancelLeaveModal from "@/components/ui/CancelLeaveModal";
import LeaveDetailDrawer from "@/components/leaves/LeaveDetailDrawer";
import {
  formatIndonesianDate,
  formatIndonesianDateRange,
} from "@/lib/date-utils";
import { cancelLeaveRequestAction } from "@/actions/leave-request-actions";

const STATUS_TABS = [
  { key: "ALL", label: "Semua" },
  { key: "WAITING", label: "Menunggu" },
  { key: "Approved", label: "Disetujui" },
  { key: "Rejected", label: "Ditolak" },
  { key: "Cancelled", label: "Dibatalkan" },
];

function SortIndicator({ columnKey, sortConfig }) {
  if (sortConfig.key !== columnKey) {
    return (
      <ArrowUpDown
        className="h-3 w-3 shrink-0 opacity-45"
        aria-hidden="true"
      />
    );
  }
  return sortConfig.direction === "ascending" ? (
    <ArrowUp className="h-3 w-3 shrink-0" aria-hidden="true" />
  ) : (
    <ArrowDown className="h-3 w-3 shrink-0" aria-hidden="true" />
  );
}

/**
 * Halaman Riwayat Pengajuan & Pembatalan Cuti (/leaves) bergaya Swiss Archival (100% UI-Only).
 * - Desktop (md+): Sortable Swiss Ledger Table dengan React state + aria-sort
 * - Mobile (< md): Mobile Ledger Cards (.ledger-card)
 * - Drawer Detail bergaya Routing Slip + Stempel Tinta & Modal Pembatalan Atomik
 */
export default function LeaveHistoryClient({
  initialUserProfile,
  initialRequests = [],
  initialCounts = {
    ALL: 0,
    WAITING: 0,
    Pending: 0,
    "Approved by Leader": 0,
    Approved: 0,
    Rejected: 0,
    Cancelled: 0,
  },
  leaveTypes = [],
}) {
  const router = useRouter();
  const tableCaptionId = useId();
  const searchInputId = useId();
  const dateFromId = useId();
  const dateToId = useId();
  const tabRefs = useRef([]);

  const [userProfile, setUserProfile] = useState(initialUserProfile);
  const [requests, setRequests] = useState(initialRequests);
  const [counts, setCounts] = useState(initialCounts);

  const [activeTab, setActiveTab] = useState("ALL");
  const [leaveTypeFilter, setLeaveTypeFilter] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState({
    key: "submissionDate",
    direction: "descending",
  });
  const [sortStatusText, setSortStatusText] = useState("");

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelServerError, setCancelServerError] = useState("");

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toast, setToast] = useState(null);

  const isLeaderRole = userProfile?.role === "Ketua Divisi";

  useEffect(() => {
    setUserProfile(initialUserProfile);
  }, [initialUserProfile]);

  useEffect(() => {
    setRequests(initialRequests);
  }, [initialRequests]);

  useEffect(() => {
    setCounts(initialCounts);
  }, [initialCounts]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function showToast(message, tone = "success") {
    setToast({ message, tone });
  }

  async function refreshFromServer({ silent = false } = {}) {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/leaves", {
        method: "GET",
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        if (!silent) {
          showToast(
            data.error || "Gagal menyinkronkan riwayat cuti dari server.",
            "error"
          );
        }
        return;
      }

      if (data.userProfile) setUserProfile(data.userProfile);
      if (Array.isArray(data.requests)) setRequests(data.requests);
      if (data.counts) setCounts(data.counts);

      if (!silent) {
        showToast("Riwayat cuti berhasil disinkronkan dari PostgreSQL.");
      }
    } catch {
      if (!silent) {
        showToast(
          "Koneksi jaringan bermasalah saat memuat ulang riwayat cuti.",
          "error"
        );
      }
    } finally {
      setIsRefreshing(false);
    }
  }

  function handleSortColumn(key, label) {
    setSortConfig((prev) => {
      const nextDirection =
        prev.key === key && prev.direction === "descending"
          ? "ascending"
          : "descending";
      setSortStatusText(
        `Diurutkan berdasarkan ${label} (${
          nextDirection === "ascending" ? "naik" : "turun"
        }).`
      );
      return { key, direction: nextDirection };
    });
  }

  const hasActiveFilters =
    activeTab !== "ALL" ||
    leaveTypeFilter !== "ALL" ||
    Boolean(dateFrom) ||
    Boolean(dateTo) ||
    Boolean(searchQuery.trim());

  const dateRangeInvalid = Boolean(dateFrom && dateTo && dateTo < dateFrom);

  const filteredRequests = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const list = requests.filter((req) => {
      if (
        activeTab === "WAITING" &&
        !["Pending", "Approved by Leader"].includes(req.status)
      ) {
        return false;
      }
      if (!["ALL", "WAITING"].includes(activeTab) && req.status !== activeTab) {
        return false;
      }
      if (
        leaveTypeFilter !== "ALL" &&
        String(req.leaveTypeId) !== String(leaveTypeFilter)
      ) {
        return false;
      }
      if (dateFrom && !dateRangeInvalid && req.endDate < dateFrom) {
        return false;
      }
      if (dateTo && !dateRangeInvalid && req.startDate > dateTo) {
        return false;
      }
      if (q) {
        const haystack = [
          req.leaveTypeName,
          req.reason,
          req.handoverUserName,
          req.handoverNotes,
          req.status,
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    const dir = sortConfig.direction === "ascending" ? 1 : -1;

    return [...list].sort((a, b) => {
      if (sortConfig.key === "totalDays") {
        return (Number(a.totalDays) - Number(b.totalDays)) * dir || (b.id - a.id);
      }
      if (sortConfig.key === "leaveTypeName") {
        return (
          String(a.leaveTypeName || "").localeCompare(
            String(b.leaveTypeName || "")
          ) * dir
        );
      }
      if (sortConfig.key === "status") {
        return (
          String(a.status || "").localeCompare(String(b.status || "")) * dir
        );
      }
      if (sortConfig.key === "startDate") {
        return (
          String(a.startDate || "").localeCompare(String(b.startDate || "")) *
            dir || (b.id - a.id) * dir
        );
      }
      return (
        String(a.submissionDate || "").localeCompare(
          String(b.submissionDate || "")
        ) * dir || (b.id - a.id) * dir
      );
    });
  }, [
    requests,
    activeTab,
    leaveTypeFilter,
    dateFrom,
    dateTo,
    dateRangeInvalid,
    searchQuery,
    sortConfig,
  ]);

  function getSubStatusText(request) {
    if (request.status === "Pending") {
      return isLeaderRole ? "Menunggu Final HRD" : "Menunggu Ketua Divisi";
    }
    if (request.status === "Approved by Leader") {
      return "Menunggu Final HRD";
    }
    return "";
  }

  function handleResetFilters() {
    setActiveTab("ALL");
    setLeaveTypeFilter("ALL");
    setDateFrom("");
    setDateTo("");
    setSearchQuery("");
    setSortConfig({ key: "submissionDate", direction: "descending" });
  }

  function handleTabKeyDown(event, index) {
    const total = STATUS_TABS.length;
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
      const nextTab = STATUS_TABS[nextIndex];
      setActiveTab(nextTab.key);
      tabRefs.current[nextIndex]?.focus();
    }
  }

  async function handleConfirmCancel(requestId, cancellationReason) {
    setIsCancelling(true);
    setCancelServerError("");

    try {
      const result = await cancelLeaveRequestAction(
        requestId,
        cancellationReason
      );

      if (!result?.ok) {
        const errMsg =
          result?.error ||
          "Gagal membatalkan pengajuan cuti. Silakan coba lagi.";
        setCancelServerError(errMsg);
        showToast(errMsg, "error");
        return;
      }

      setCancelTarget(null);
      setSelectedRequest(null);

      await refreshFromServer({ silent: true });
      router.refresh();

      const refunded = Number(result.refundedDays || 0);
      showToast(
        refunded > 0
          ? `Pengajuan dibatalkan. Kuota ${refunded.toFixed(1)} Hari dikembalikan otomatis ke saldo Anda.`
          : "Pengajuan cuti berhasil dibatalkan."
      );
    } catch {
      const errMsg = "Terjadi kesalahan jaringan saat membatalkan pengajuan.";
      setCancelServerError(errMsg);
      showToast(errMsg, "error");
    } finally {
      setIsCancelling(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="visually-hidden" role="status" aria-live="polite">
        {sortStatusText}
      </div>

      {/* Header Editorial & Ringkasan Kuota */}
      <header className="flex flex-col justify-between gap-4 border-b border-[var(--rule-strong)] pb-4 sm:flex-row sm:items-end">
        <div>
          <span className="panel-eyebrow">
            Arsip Transaksi Cuti Pribadi
            {userProfile?.divisionName ? ` • ${userProfile.divisionName}` : ""}
          </span>
          <h2 className="mt-1 font-serif text-[28px] font-semibold leading-tight text-[var(--ink)]">
            Riwayat Cuti Saya
          </h2>
          <p className="mt-1.5 text-xs text-[var(--ink-soft)]">
            Sisa Kuota Cuti Tahunan:{" "}
            <strong className="mono font-semibold text-[var(--spruce)]">
              {Number(userProfile?.remainingLeaveQuota ?? 0).toFixed(1)} Hari
            </strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
            <span>Sinkronkan</span>
          </button>

          <Link href="/leaves/new" className="btn btn-primary btn-sm">
            <CalendarPlus className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Ajukan Cuti Baru</span>
          </Link>
        </div>
      </header>

      {/* Panel Ledger Riwayat: Tabs + Filter Toolbar + Table/Mobile Cards */}
      <section
        aria-label="Filter dan daftar riwayat cuti"
        className="panel overflow-hidden"
      >
        {/* Tab Status Cepat (Single Row) */}
        <div className="border-b border-[var(--rule)] bg-[var(--paper)] px-4 pt-2.5 sm:px-5">
          <div
            role="tablist"
            aria-label="Filter berdasarkan status pengajuan cuti"
            className="flex flex-nowrap items-center gap-5 overflow-x-auto"
          >
            {STATUS_TABS.map((tab, index) => {
              const isActive = activeTab === tab.key;
              const tabCount = counts?.[tab.key] ?? 0;

              return (
                <button
                  key={tab.key}
                  ref={(el) => {
                    tabRefs.current[index] = el;
                  }}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => setActiveTab(tab.key)}
                  onKeyDown={(e) => handleTabKeyDown(e, index)}
                  className={`otium-tab mono inline-flex shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap pb-3 pt-1 text-xs font-semibold uppercase tracking-[0.04em] transition-colors duration-150 ${
                    isActive
                      ? "text-[var(--spruce)]"
                      : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`border px-1.5 py-0 text-[10px] ${
                      isActive
                        ? "border-[var(--spruce-border)] bg-[var(--spruce-tint)] text-[var(--spruce)]"
                        : "border-[var(--rule)] bg-[var(--paper-pure)] text-[var(--ink-muted)]"
                    }`}
                  >
                    {tabCount}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Toolbar Filter Arsip */}
        <div className="toolbar grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-12">
          <div className="relative lg:col-span-4">
            <label htmlFor={searchInputId} className="visually-hidden">
              Cari alasan atau rekan pengganti
            </label>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--ink-muted)]"
              aria-hidden="true"
            />
            <input
              id={searchInputId}
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari alasan / rekan handover..."
              className="input !py-1.5 !pl-8 !pr-3 !text-xs"
            />
          </div>

          <div className="lg:col-span-3">
            <select
              aria-label="Filter jenis cuti"
              value={leaveTypeFilter}
              onChange={(e) => setLeaveTypeFilter(e.target.value)}
              className="select cursor-pointer !py-1.5 !text-xs"
            >
              <option value="ALL">Semua Jenis Cuti</option>
              {leaveTypes.map((lt) => (
                <option key={lt.id} value={lt.id}>
                  {lt.name}
                  {!lt.isActive ? " (Nonaktif)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 sm:col-span-2 lg:col-span-5">
            <div className="flex-1">
              <label htmlFor={dateFromId} className="visually-hidden">
                Dari tanggal cuti
              </label>
              <input
                id={dateFromId}
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                aria-label="Filter dari tanggal"
                className="input mono !py-1.5 !text-xs"
              />
            </div>
            <span className="text-xs text-[var(--ink-muted)]" aria-hidden="true">
              &ndash;
            </span>
            <div className="flex-1">
              <label htmlFor={dateToId} className="visually-hidden">
                Sampai tanggal cuti
              </label>
              <input
                id={dateToId}
                type="date"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(e) => setDateTo(e.target.value)}
                aria-label="Filter sampai tanggal"
                className="input mono !py-1.5 !text-xs"
              />
            </div>
          </div>
        </div>

        {/* Status Filter & Reset */}
        {(dateRangeInvalid || hasActiveFilters) && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--rule)] bg-[var(--paper-pure)] px-5 py-2.5 text-xs">
            {dateRangeInvalid ? (
              <p
                role="alert"
                className="inline-flex items-center gap-1.5 font-medium text-[var(--terracotta)]"
              >
                <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>
                  Tanggal akhir tidak boleh lebih awal dari tanggal awal.
                </span>
              </p>
            ) : (
              <p className="mono text-[11px] text-[var(--ink-muted)]">
                Menampilkan{" "}
                <strong className="font-semibold text-[var(--ink)]">
                  {filteredRequests.length}
                </strong>{" "}
                dari {requests.length} pengajuan
              </p>
            )}

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="btn btn-sm !min-h-[26px]"
              >
                <RotateCcw className="h-3 w-3" aria-hidden="true" />
                <span>Reset Filter</span>
              </button>
            )}
          </div>
        )}

        {/* Konten Utama: EmptyState atau Sortable Table (Desktop) + Mobile Cards */}
        {filteredRequests.length === 0 ? (
          <div className="panel-body">
            <EmptyState
              icon={<CalendarDays className="h-5 w-5" aria-hidden="true" />}
              title={
                hasActiveFilters
                  ? "Tidak ada pengajuan yang cocok"
                  : "Belum ada riwayat pengajuan cuti"
              }
              description={
                hasActiveFilters
                  ? "Coba ubah tab status, jenis cuti, rentang tanggal, atau kata kunci pencarian Anda."
                  : "Pengajuan cuti yang Anda kirim akan tercatat secara otomatis di halaman ini beserta status persetujuannya."
              }
              actionLabel={hasActiveFilters ? undefined : "Ajukan Cuti Baru"}
              actionHref={hasActiveFilters ? undefined : "/leaves/new"}
            />
          </div>
        ) : (
          <>
            {/* DESKTOP: Sortable Swiss Ledger Table */}
            <div
              tabIndex={0}
              role="region"
              aria-labelledby={tableCaptionId}
              className="sheet-wrap hidden md:block"
            >
              <table className="ledger text-left">
                <caption id={tableCaptionId} className="visually-hidden">
                  Daftar riwayat pengajuan cuti pribadi yang dapat diurutkan
                </caption>
                <thead>
                  <tr>
                    <th scope="col" className="row-idx">
                      #
                    </th>
                    <th
                      scope="col"
                      aria-sort={
                        sortConfig.key === "leaveTypeName"
                          ? sortConfig.direction
                          : undefined
                      }
                    >
                      <button
                        type="button"
                        onClick={() =>
                          handleSortColumn("leaveTypeName", "Jenis Cuti")
                        }
                      >
                        <span>Jenis Cuti</span>
                        <SortIndicator
                          columnKey="leaveTypeName"
                          sortConfig={sortConfig}
                        />
                      </button>
                    </th>
                    <th
                      scope="col"
                      aria-sort={
                        sortConfig.key === "startDate"
                          ? sortConfig.direction
                          : undefined
                      }
                    >
                      <button
                        type="button"
                        onClick={() =>
                          handleSortColumn("startDate", "Periode Cuti")
                        }
                      >
                        <span>Periode</span>
                        <SortIndicator
                          columnKey="startDate"
                          sortConfig={sortConfig}
                        />
                      </button>
                    </th>
                    <th
                      scope="col"
                      aria-sort={
                        sortConfig.key === "totalDays"
                          ? sortConfig.direction
                          : undefined
                      }
                    >
                      <button
                        type="button"
                        onClick={() => handleSortColumn("totalDays", "Durasi")}
                      >
                        <span>Durasi</span>
                        <SortIndicator
                          columnKey="totalDays"
                          sortConfig={sortConfig}
                        />
                      </button>
                    </th>
                    <th
                      scope="col"
                      aria-sort={
                        sortConfig.key === "submissionDate"
                          ? sortConfig.direction
                          : undefined
                      }
                    >
                      <button
                        type="button"
                        onClick={() =>
                          handleSortColumn("submissionDate", "Tanggal Diajukan")
                        }
                      >
                        <span>Diajukan</span>
                        <SortIndicator
                          columnKey="submissionDate"
                          sortConfig={sortConfig}
                        />
                      </button>
                    </th>
                    <th
                      scope="col"
                      aria-sort={
                        sortConfig.key === "status"
                          ? sortConfig.direction
                          : undefined
                      }
                    >
                      <button
                        type="button"
                        onClick={() => handleSortColumn("status", "Status")}
                      >
                        <span>Status</span>
                        <SortIndicator
                          columnKey="status"
                          sortConfig={sortConfig}
                        />
                      </button>
                    </th>
                    <th scope="col" className="text-right">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map((req, idx) => {
                    const subStatus = getSubStatusText(req);
                    return (
                      <tr
                        key={req.id}
                        onClick={() => setSelectedRequest(req)}
                        className="cursor-pointer"
                      >
                        <td className="row-idx">
                          {String(idx + 1).padStart(2, "0")}
                        </td>
                        <th scope="row" className="font-normal">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-[var(--ink)]">
                              {req.leaveTypeName}
                            </span>
                            {req.isHalfDay && (
                              <span className="tag tag-leader !py-0 !text-[10px]">
                                0.5 Hr
                              </span>
                            )}
                            {req.attachmentUrl && (
                              <span
                                title="Memiliki dokumen lampiran"
                                className="tag !py-0 !text-[10px]"
                              >
                                <Paperclip
                                  className="h-3 w-3"
                                  aria-hidden="true"
                                />
                                <span>Lampiran</span>
                              </span>
                            )}
                          </div>
                          {req.handoverUserName && (
                            <p className="mt-0.5 text-[11px] text-[var(--ink-muted)]">
                              Handover: {req.handoverUserName}
                            </p>
                          )}
                        </th>
                        <td className="mono whitespace-nowrap text-xs text-[var(--ink-soft)]">
                          {formatIndonesianDateRange(
                            req.startDate,
                            req.endDate,
                            req.isHalfDay
                          )}
                        </td>
                        <td className="mono whitespace-nowrap text-xs font-semibold text-[var(--ink)]">
                          {Number(req.totalDays).toFixed(1)} hr
                        </td>
                        <td className="mono whitespace-nowrap text-xs text-[var(--ink-muted)]">
                          {formatIndonesianDate(req.submissionDate)}
                        </td>
                        <td>
                          <div className="inline-flex flex-col items-start gap-1">
                            <StatusBadge
                              status={req.status}
                              rejectedByRole={req.rejectedByRole}
                            />
                            {subStatus && (
                              <span className="text-[11px] text-[var(--ink-muted)]">
                                {subStatus}
                              </span>
                            )}
                          </div>
                        </td>
                        <td
                          className="whitespace-nowrap text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="inline-flex items-center gap-1.5">
                            {req.status === "Pending" && (
                              <button
                                type="button"
                                onClick={() => {
                                  setCancelServerError("");
                                  setCancelTarget(req);
                                }}
                                className="btn btn-danger-ghost btn-sm"
                              >
                                Batalkan
                              </button>
                            )}

                            {req.status === "Approved" && (
                              <a
                                href={`/api/leaves/${req.id}/pdf`}
                                target="_blank"
                                rel="noopener noreferrer"
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
                              onClick={() => setSelectedRequest(req)}
                              className="btn btn-sm"
                            >
                              Detail
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* MOBILE (< md): Mobile Ledger Cards */}
            <div className="flex flex-col gap-3 bg-[var(--alabaster)] p-3.5 md:hidden">
              {filteredRequests.map((req, idx) => {
                const subStatus = getSubStatusText(req);
                return (
                  <article key={req.id} className="ledger-card">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="mono text-[10.5px] font-semibold text-[var(--ink-muted)]">
                            #{String(idx + 1).padStart(2, "0")}
                          </span>
                          <h3 className="text-sm font-semibold text-[var(--ink)]">
                            {req.leaveTypeName}
                          </h3>
                          {req.isHalfDay && (
                            <span className="tag tag-leader !py-0 !text-[10px]">
                              0.5 Hr
                            </span>
                          )}
                        </div>
                        <p className="mono mt-1 text-xs text-[var(--ink-soft)]">
                          {formatIndonesianDateRange(
                            req.startDate,
                            req.endDate,
                            req.isHalfDay
                          )}{" "}
                          ({Number(req.totalDays).toFixed(1)} hr)
                        </p>
                      </div>
                      <StatusBadge
                        status={req.status}
                        rejectedByRole={req.rejectedByRole}
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--rule)] pt-2 text-[11px] text-[var(--ink-muted)]">
                      <span>
                        Diajukan: {formatIndonesianDate(req.submissionDate)}
                      </span>
                      {subStatus && <span>{subStatus}</span>}
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-1.5 pt-1">
                      {req.status === "Pending" && (
                        <button
                          type="button"
                          onClick={() => {
                            setCancelServerError("");
                            setCancelTarget(req);
                          }}
                          className="btn btn-danger-ghost btn-sm"
                        >
                          Batalkan
                        </button>
                      )}
                      {req.status === "Approved" && (
                        <a
                          href={`/api/leaves/${req.id}/pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-primary btn-sm"
                        >
                          <FileDown className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>PDF</span>
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => setSelectedRequest(req)}
                        className="btn btn-sm"
                      >
                        Detail
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </section>

      {/* Slide-Over Drawer Detail & Routing Slip */}
      <LeaveDetailDrawer
        request={selectedRequest}
        isOpen={Boolean(selectedRequest)}
        onClose={() => setSelectedRequest(null)}
        onOpenCancel={(req) => {
          setCancelServerError("");
          setCancelTarget(req);
        }}
      />

      {/* Modal Pembatalan Cuti (khusus Pending) */}
      <CancelLeaveModal
        isOpen={Boolean(cancelTarget)}
        request={cancelTarget}
        isSubmitting={isCancelling}
        serverError={cancelServerError}
        onClose={() => {
          if (!isCancelling) {
            setCancelTarget(null);
            setCancelServerError("");
          }
        }}
        onConfirm={handleConfirmCancel}
      />

      {/* Toast Umpan Balik Swiss Archival */}
      {toast && (
        <div
          role={toast.tone === "error" ? "alert" : "status"}
          aria-live={toast.tone === "error" ? "assertive" : "polite"}
          className={`fixed bottom-5 right-5 z-50 flex max-w-md items-center gap-2.5 rounded-[2px] border px-4 py-3 font-mono text-xs shadow-xl ${
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
          <span className="leading-snug">{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Tutup notifikasi"
            className="ml-1 flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-[2px] opacity-80 hover:opacity-100"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
