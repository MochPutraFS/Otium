"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Eye,
  FileDown,
  Layers,
  RefreshCw,
  RotateCcw,
  Search,
  UserCheck,
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

// Cek apakah sebuah pengajuan memenuhi syarat Antrean Final HRD (Jalur 1 & Jalur 2)
function isPendingFinalHrd(req) {
  return (
    (req.applicantRole === "Karyawan" && req.status === "Approved by Leader") ||
    (req.applicantRole === "Ketua Divisi" && req.status === "Pending")
  );
}

/**
 * Workspace Hybrid Modul 6B: Persetujuan Final & Multi-Approve — Khusus HRD (/approvals/hrd).
 * - Mode Pure Production: data live PostgreSQL, Server Action atomik `verifyByHrdAction` &
 *   `bulkApproveByHrdAction`, sinkronisasi `GET /api/approvals/hrd`, serta cetak Surat Cuti PDF.
 * - Bahasa Desain Warm Alabaster (`#F4F2EC`) — Swiss Editorial Minimalism.
 * - Standar Platform Web Modern: `.otium-tab` keyboard nav, native `<dialog>` modal & drawer,
 *   indeterminate Select-All checkbox, dan `.otium-responsive-table` berbasis `@container`.
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
  const searchInputId = useId();
  const queueTabId = useId();
  const allTabId = useId();
  const tabRefs = useRef([]);

  const [hrdProfile, setHrdProfile] = useState(initialHrdProfile);
  const [allRequests, setAllRequests] = useState(initialRequests);
  const [counts, setCounts] = useState(initialCounts);

  const [activeTab, setActiveTab] = useState("queue"); // "queue" | "all"
  const [searchQuery, setSearchQuery] = useState("");
  const [jalurFilter, setJalurFilter] = useState("ALL"); // "ALL" | "J1" | "J2"
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
  const [toast, setToast] = useState(null); // { message, tone: "success" | "error" }

  // Sinkronisasi props ketika Server Component menjalankan revalidatePath / router.refresh()
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
        showToast("Data antrean & pengajuan perusahaan disinkronkan dari PostgreSQL.");
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

  // Hanya hitung ID yang masih tampil pada antrean terfilter
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
      return { ok: false, error: "Tidak ada pengajuan terpilih untuk disetujui." };
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
    <div className="space-y-6">
      {/* Page Header — Warm Alabaster Swiss Editorial */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Modul 6B • Persetujuan Final &amp; Multi-Approve HRD
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Persetujuan Final Cuti Karyawan
          </h1>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">
            Final Approver:{" "}
            <strong className="font-semibold text-slate-900">
              {hrdProfile?.fullName || "HRD"}
            </strong>{" "}
            — Menangani Jalur 1 (Karyawan <em>Approved by Leader</em>) &amp;
            Jalur 2 (Ketua Divisi langsung) dengan Multi-Approve atomik serta
            cetak Surat Cuti Resmi PDF.
          </p>
        </div>

        <button
          type="button"
          onClick={() => refreshFromServer({ silent: false })}
          disabled={isRefreshing}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 transition-colors duration-150 hover:border-slate-900 hover:bg-[#F4F2EC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
          <span>{isRefreshing ? "Menyinkronkan..." : "Sinkronkan"}</span>
        </button>
      </header>

      {/* Mini KPI Strip — Editorial Hairline */}
      <section
        aria-label="Ringkasan Antrean Final HRD"
        className="grid grid-cols-2 gap-3 lg:grid-cols-4"
      >
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Menunggu Final HRD
            </span>
            <Clock className="h-4 w-4 text-amber-600" aria-hidden="true" />
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
            {counts.pendingFinal}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Siap diputuskan tunggal / massal
          </p>
        </div>

        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Jalur 1 (Karyawan)
            </span>
            <UserCheck className="h-4 w-4 text-sky-700" aria-hidden="true" />
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
            {counts.jalur1}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Lolos verifikasi Ketua Divisi
          </p>
        </div>

        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Jalur 2 (Ketua Divisi)
            </span>
            <Zap className="h-4 w-4 text-amber-700" aria-hidden="true" />
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
            {counts.jalur2}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Pengajuan langsung Ketua Divisi
          </p>
        </div>

        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Total Perusahaan
            </span>
            <Layers className="h-4 w-4 text-slate-700" aria-hidden="true" />
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
            {counts.total}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500 tabular-nums">
            {counts.approved} disetujui final (PDF aktif)
          </p>
        </div>
      </section>

      {/* Main Hybrid Workspace Card */}
      <section className="overflow-hidden rounded-xl border border-stone-200 bg-white">
        {/* Tabs (.otium-tab) & Filter Bar */}
        <div className="flex flex-col gap-3 border-b border-stone-200 px-4 pt-3 pb-3 xl:flex-row xl:items-end xl:justify-between">
          <div
            role="tablist"
            aria-label="Tampilan daftar persetujuan HRD"
            className="flex items-center gap-1 overflow-x-auto border-b border-stone-200 xl:border-b-0"
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
                  className={`otium-tab inline-flex shrink-0 cursor-pointer items-center gap-2 px-3.5 py-2.5 text-xs font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-inset ${
                    isSelected
                      ? "text-slate-900"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${
                      isSelected
                        ? "bg-slate-900 text-white"
                        : "bg-[#F4F2EC] text-slate-600"
                    }`}
                  >
                    {badgeCount}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <label htmlFor={searchInputId} className="visually-hidden">
                Cari pemohon, divisi, handover, atau alasan cuti
              </label>
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                id={searchInputId}
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Cari pemohon / divisi..."
                className="w-48 rounded-lg border border-stone-300 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 transition-colors focus-visible:border-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
              />
            </div>

            {activeTab === "queue" && (
              <select
                value={jalurFilter}
                onChange={(event) => setJalurFilter(event.target.value)}
                aria-label="Filter jalur persetujuan"
                className="cursor-pointer rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 transition-colors hover:border-stone-400 focus-visible:border-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
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
              className="cursor-pointer rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 transition-colors hover:border-stone-400 focus-visible:border-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
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
              className="cursor-pointer rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 transition-colors hover:border-stone-400 focus-visible:border-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
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
                className="cursor-pointer rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 transition-colors hover:border-stone-400 focus-visible:border-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
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
                className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-stone-300 bg-[#F4F2EC] px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-900 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
              >
                <RotateCcw className="h-3 w-3" aria-hidden="true" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Sticky Bulk Multi-Approve Bar (Khusus Tab Antrean Final HRD) */}
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

        {/* Tab Panel 1: Antrean Final HRD (Compact Cards + Multi-Approve Checkbox) */}
        {activeTab === "queue" ? (
          <div
            role="tabpanel"
            aria-labelledby={queueTabId}
            className="p-4 sm:p-5"
          >
            {filteredQueue.length === 0 ? (
              <EmptyState
                title="Antrean Final HRD Kosong"
                description={
                  hasActiveFilter
                    ? "Tidak ada pengajuan dalam antrean final yang cocok dengan kombinasi filter saat ini."
                    : "Seluruh pengajuan Karyawan (Approved by Leader) dan Ketua Divisi (Pending) telah selesai diproses."
                }
              />
            ) : (
              <div className="space-y-3">
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
            )}
          </div>
        ) : (
          /* Tab Panel 2: Seluruh Pengajuan Perusahaan (Responsive Table + 1-Klik Surat Cuti PDF) */
          <div role="tabpanel" aria-labelledby={allTabId}>
            {filteredAllRequests.length === 0 ? (
              <div className="p-5">
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
                className="otium-responsive-table-wrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-900"
              >
                <table className="otium-responsive-table text-left text-xs">
                  <caption id={tableCaptionId} className="visually-hidden">
                    Daftar seluruh pengajuan cuti karyawan perusahaan di semua
                    divisi dan status
                  </caption>
                  <thead>
                    <tr className="border-b border-stone-200 bg-[#F4F2EC]/80 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                      <th scope="col" className="px-4 py-3">
                        Pemohon &amp; Divisi
                      </th>
                      <th scope="col" className="px-3 py-3">
                        Jenis &amp; Periode
                      </th>
                      <th scope="col" className="px-3 py-3">
                        Durasi
                      </th>
                      <th scope="col" className="px-3 py-3">
                        Verifikasi Atasan
                      </th>
                      <th scope="col" className="px-3 py-3">
                        Status
                      </th>
                      <th scope="col" className="px-4 py-3 text-right">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 bg-white">
                    {filteredAllRequests.map((request) => {
                      const isDirectLeader =
                        request.applicantRole === "Ketua Divisi";
                      const canDownloadPdf = request.status === "Approved";

                      return (
                        <tr
                          key={request.id}
                          className="transition-colors duration-150 hover:bg-[#F4F2EC]/50"
                        >
                          <th
                            scope="row"
                            className="px-4 py-3.5 font-normal text-slate-900"
                          >
                            <p className="font-semibold text-slate-900">
                              {request.applicantName}
                            </p>
                            <p className="mt-0.5 text-[11px] text-slate-500">
                              {request.applicantRole} • {request.divisionName}
                            </p>
                          </th>

                          <td
                            data-label="Jenis & Periode"
                            className="px-3 py-3.5"
                          >
                            <div>
                              <p className="font-medium text-slate-900">
                                {request.leaveTypeName}
                              </p>
                              <p className="mt-0.5 text-[11px] text-slate-600">
                                {formatIndonesianDateRange(
                                  request.startDate,
                                  request.endDate,
                                  request.isHalfDay
                                )}
                              </p>
                            </div>
                          </td>

                          <td
                            data-label="Durasi"
                            className="px-3 py-3.5 font-semibold text-slate-900 tabular-nums"
                          >
                            {Number(request.totalDays).toFixed(1)} Hari
                          </td>

                          <td
                            data-label="Verifikasi Atasan"
                            className="px-3 py-3.5 text-slate-600"
                          >
                            {isDirectLeader ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
                                <Zap className="h-3 w-3" aria-hidden="true" />
                                Jalur 2 (Langsung HRD)
                              </span>
                            ) : request.leaderApproverName ? (
                              <div>
                                <p className="font-medium text-slate-800">
                                  {request.leaderApproverName}
                                </p>
                                <p className="text-[11px] text-slate-500 tabular-nums">
                                  {request.leaderApprovedAt || "Tahap 1"}
                                </p>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-500">
                                Menunggu Ketua Divisi
                              </span>
                            )}
                          </td>

                          <td data-label="Status" className="px-3 py-3.5">
                            <StatusBadge
                              status={request.status}
                              rejectedByRole={request.rejectedByRole}
                            />
                          </td>

                          <td
                            data-label="Aksi"
                            className="px-4 py-3.5 text-right"
                          >
                            <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                              {canDownloadPdf && (
                                <a
                                  href={`/api/leaves/${request.id}/pdf`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  aria-label={`Cetak Surat Cuti PDF untuk ${request.applicantName}`}
                                  className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-800 transition-colors hover:border-emerald-700 hover:bg-emerald-700 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
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
                                className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-800 transition-colors hover:border-slate-900 hover:bg-[#F4F2EC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
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

      {/* Slide-Over Detail Drawer (Native <dialog>, Live GET /api/leaves/[id], Real Attachment & PDF) */}
      <ApprovalDetailDrawer
        request={detailTarget}
        isOpen={Boolean(detailTarget)}
        canTakeAction={detailTarget ? isPendingFinalHrd(detailTarget) : false}
        onClose={() => setDetailTarget(null)}
        onOpenApprove={(req) => handleOpenModal(req, "Approve")}
        onOpenReject={(req) => handleOpenModal(req, "Reject")}
      />

      {/* Smart Single Approval / Reject Modal */}
      <ApprovalModal
        isOpen={modalState.isOpen}
        actionType={modalState.actionType}
        approverRole="HRD"
        requestSummary={modalState.request}
        onClose={handleCloseModal}
        onSubmit={handleSubmitSingleDecision}
      />

      {/* Bulk Multi-Approve Confirmation Modal */}
      <HrdBulkConfirmModal
        isOpen={isBulkModalOpen}
        selectedRequests={visibleSelectedRequests}
        initialNotes={bulkNotes}
        onClose={() => setIsBulkModalOpen(false)}
        onConfirm={handleConfirmBulkApprove}
      />

      {/* Toast Feedback dengan aria-live="polite" */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-6 left-1/2 z-50 flex max-w-md -translate-x-1/2 items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-semibold shadow-xl ${
            toast.tone === "error"
              ? "border-rose-300 bg-rose-950 text-rose-50"
              : "border-stone-700 bg-slate-900 text-white"
          }`}
        >
          {toast.tone === "error" ? (
            <AlertCircle
              className="h-4 w-4 shrink-0 text-rose-300"
              aria-hidden="true"
            />
          ) : (
            <CheckCircle2
              className="h-4 w-4 shrink-0 text-emerald-400"
              aria-hidden="true"
            />
          )}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
