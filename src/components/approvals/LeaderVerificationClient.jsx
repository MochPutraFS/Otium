"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  RotateCcw,
  Search,
} from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import UserAvatar from "@/components/ui/UserAvatar";
import EmptyState from "@/components/ui/EmptyState";
import ApprovalModal from "@/components/ui/ApprovalModal";
import VerificationCard from "@/components/approvals/VerificationCard";
import ApprovalDetailDrawer from "@/components/approvals/ApprovalDetailDrawer";
import { formatIndonesianDateRange } from "@/lib/date-utils";
import { verifyByLeaderAction } from "@/actions/approval-actions";

const WORKSPACE_TABS = [
  { key: "queue", label: "Menunggu Verifikasi" },
  { key: "history", label: "Riwayat Verifikasi Divisi" },
];

/**
 * Workspace Modul 6A: Verifikasi Pengajuan Cuti Tahap 1 — Ketua Divisi (/approvals/leader).
 * 100% UI-Only Swiss Archival dengan Signature Routing Slip Cards & Swiss Ledger History.
 */
export default function LeaderVerificationClient({
  initialLeaderProfile,
  initialRequests = [],
  initialCounts = {
    pending: 0,
    verified: 0,
    attachmentsPending: 0,
    total: 0,
  },
  leaveTypes = [],
}) {
  const router = useRouter();
  const tableCaptionId = useId();
  const searchInputId = useId();
  const queueTabId = useId();
  const historyTabId = useId();
  const tabRefs = useRef([]);

  const [leaderProfile, setLeaderProfile] = useState(initialLeaderProfile);
  const [allRequests, setAllRequests] = useState(initialRequests);
  const [counts, setCounts] = useState(initialCounts);

  const [activeTab, setActiveTab] = useState("queue");
  const [searchQuery, setSearchQuery] = useState("");
  const [leaveTypeFilter, setLeaveTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [detailTarget, setDetailTarget] = useState(null);
  const [modalState, setModalState] = useState({
    isOpen: false,
    actionType: "Approve",
    request: null,
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    setLeaderProfile(initialLeaderProfile);
  }, [initialLeaderProfile]);

  useEffect(() => {
    setAllRequests(initialRequests);
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
      const res = await fetch("/api/approvals/leader", {
        method: "GET",
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        if (!silent) {
          showToast(
            data.error || "Gagal menyinkronkan data verifikasi dari server.",
            "error"
          );
        }
        return;
      }

      if (data.leaderProfile) setLeaderProfile(data.leaderProfile);
      if (Array.isArray(data.requests)) setAllRequests(data.requests);
      if (data.counts) setCounts(data.counts);

      if (!silent) {
        showToast("Antrean verifikasi divisi disinkronkan dari PostgreSQL.");
      }
    } catch {
      if (!silent) {
        showToast(
          "Koneksi terputus saat menyegarkan antrean verifikasi.",
          "error"
        );
      }
    } finally {
      setIsRefreshing(false);
    }
  }

  const queueRequests = useMemo(
    () => allRequests.filter((req) => req.status === "Pending"),
    [allRequests]
  );

  const historyRequests = useMemo(
    () => allRequests.filter((req) => req.status !== "Pending"),
    [allRequests]
  );

  const filteredQueue = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return queueRequests.filter((req) => {
      if (
        q &&
        !req.applicantName.toLowerCase().includes(q) &&
        !req.handoverUserName.toLowerCase().includes(q) &&
        !req.reason.toLowerCase().includes(q)
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
  }, [queueRequests, searchQuery, leaveTypeFilter]);

  const filteredHistory = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return historyRequests.filter((req) => {
      if (
        q &&
        !req.applicantName.toLowerCase().includes(q) &&
        !req.handoverUserName.toLowerCase().includes(q) &&
        !req.reason.toLowerCase().includes(q)
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
  }, [historyRequests, searchQuery, leaveTypeFilter, statusFilter]);

  const hasActiveFilter =
    searchQuery.trim() !== "" ||
    leaveTypeFilter !== "ALL" ||
    (activeTab === "history" && statusFilter !== "ALL");

  function handleResetFilters() {
    setSearchQuery("");
    setLeaveTypeFilter("ALL");
    setStatusFilter("ALL");
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
      tabRefs.current[nextIndex]?.focus();
    }
  }

  function handleOpenModal(request, actionType) {
    setModalState({ isOpen: true, actionType, request });
  }

  function handleCloseModal() {
    setModalState((prev) => ({ ...prev, isOpen: false }));
  }

  async function handleSubmitDecision(notes) {
    const target = modalState.request;
    if (!target) {
      return { ok: false, error: "Pengajuan target tidak ditemukan." };
    }

    const result = await verifyByLeaderAction(
      target.id,
      modalState.actionType,
      notes
    );

    if (!result?.ok) {
      showToast(
        result?.error || "Gagal memproses verifikasi pengajuan cuti.",
        "error"
      );
      return result;
    }

    if (detailTarget?.id === target.id) {
      setDetailTarget(null);
    }

    await refreshFromServer({ silent: true });
    router.refresh();

    if (modalState.actionType === "Approve") {
      showToast(
        `Pengajuan ${target.applicantName} disetujui Tahap 1 dan diteruskan ke antrean Persetujuan Final HRD.`
      );
    } else {
      const refunded = Number(result.refundedDays || 0);
      showToast(
        refunded > 0
          ? `Pengajuan ${target.applicantName} ditolak. Kuota +${refunded.toFixed(1)} Hari dikembalikan otomatis.`
          : `Pengajuan ${target.applicantName} telah ditolak.`
      );
    }

    return result;
  }

  const hasDivision = Boolean(leaderProfile?.divisionId);
  const divisionDisplay = leaderProfile?.divisionName || "Belum Ditugaskan";

  return (
    <div className="space-y-5">
      {/* Header Arsip */}
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--rule-strong)] pb-4">
        <div>
          <span className="panel-eyebrow">
            Verifikasi Tahap 1 &bull; Ketua Divisi
          </span>
          <h2 className="mt-1 font-serif text-[28px] font-semibold leading-tight text-[var(--ink)]">
            {hasDivision
              ? `Verifikasi Cuti Divisi ${divisionDisplay}`
              : "Verifikasi Cuti Divisi"}
          </h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[var(--ink-soft)]">
            Tinjau jadwal tim, catatan serah terima tugas (handover), dan
            lampiran dokumen anggota divisi Anda ({leaderProfile?.fullName})
            sebelum diteruskan ke Persetujuan Final HRD.
          </p>
        </div>

        <button
          type="button"
          onClick={() => refreshFromServer()}
          disabled={isRefreshing}
          className="btn btn-sm"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
          <span>{isRefreshing ? "Menyegarkan..." : "Segarkan Data"}</span>
        </button>
      </header>

      {/* Edge Case: Ketua Divisi belum ditugaskan memimpin divisi aktif */}
      {!hasDivision && (
        <div role="status" className="notice notice-warn">
          <AlertCircle aria-hidden="true" />
          <div>
            <p className="m-0 font-semibold">
              Akun Anda belum ditugaskan sebagai pemimpin divisi aktif.
            </p>
            <p className="mt-0.5 text-xs">
              Hubungi Administrator untuk menetapkan akun Anda pada kolom Ketua
              Divisi di modul Manajemen Divisi agar antrean pengajuan anggota
              divisi tampil di sini.
            </p>
          </div>
        </div>
      )}

      {/* Metric Strip (4 Sel Arsip) */}
      <div
        className="metric-strip"
        role="region"
        aria-label="Ringkasan Antrean Verifikasi Divisi"
      >
        <div className="metric-cell">
          <div className="metric-label">Menunggu Paraf Anda</div>
          <div className="metric-val text-[var(--ochre)]">
            {String(counts.pending).padStart(2, "0")}
          </div>
          <div className="metric-note">Pengajuan berstatus Pending</div>
        </div>

        <div className="metric-cell">
          <div className="metric-label">Sudah Diverifikasi</div>
          <div className="metric-val text-[var(--spruce)]">
            {String(counts.verified).padStart(2, "0")}
          </div>
          <div className="metric-note">Diteruskan ke HRD / diputuskan</div>
        </div>

        <div className="metric-cell">
          <div className="metric-label">Cek Lampiran Aktif</div>
          <div className="metric-val text-[var(--slate-blue)]">
            {String(counts.attachmentsPending).padStart(2, "0")}
          </div>
          <div className="metric-note">Dokumen pendukung di antrean</div>
        </div>

        <div className="metric-cell">
          <div className="metric-label">Divisi Aktif</div>
          <div className="truncate font-serif text-2xl font-semibold leading-tight text-[var(--ink)]">
            {divisionDisplay}
          </div>
          <div className="metric-note">Unit kerja yang Anda pimpin</div>
        </div>
      </div>

      {/* Main Workspace Panel */}
      <section className="panel overflow-hidden">
        {/* Tabs (.otium-tab) */}
        <div className="border-b border-[var(--rule)] bg-[var(--paper)] px-5 pt-3">
          <div
            role="tablist"
            aria-label="Tampilan verifikasi cuti divisi"
            className="flex flex-nowrap items-center gap-6 overflow-x-auto"
          >
            {WORKSPACE_TABS.map((tab, index) => {
              const isSelected = activeTab === tab.key;
              const badgeCount =
                tab.key === "queue"
                  ? queueRequests.length
                  : historyRequests.length;

              return (
                <button
                  key={tab.key}
                  ref={(el) => {
                    tabRefs.current[index] = el;
                  }}
                  id={tab.key === "queue" ? queueTabId : historyTabId}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  tabIndex={isSelected ? 0 : -1}
                  onClick={() => setActiveTab(tab.key)}
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
        </div>

        {/* Filter Toolbar */}
        <div className="toolbar">
          <div className="relative w-full sm:w-60">
            <label htmlFor={searchInputId} className="visually-hidden">
              Cari nama anggota atau rekan handover
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
              placeholder="Cari anggota / handover..."
              className="input !py-1.5 !pl-8 !pr-3 !text-xs"
            />
          </div>

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

          {activeTab === "history" && (
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label="Filter status riwayat"
              className="select !w-auto cursor-pointer !py-1.5 !text-xs"
            >
              <option value="ALL">Semua Status</option>
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

        {/* TabPanel 1: Antrean Menunggu Verifikasi (Routing Slip Cards) */}
        <div
          role="tabpanel"
          aria-labelledby={queueTabId}
          hidden={activeTab !== "queue"}
        >
          <div className="panel-body">
            {filteredQueue.length === 0 ? (
              <EmptyState
                title="Antrean Verifikasi Kosong"
                description={
                  hasActiveFilter
                    ? "Tidak ada pengajuan menunggu verifikasi yang cocok dengan filter pencarian Anda."
                    : "Seluruh pengajuan cuti anggota divisi Anda sudah diproses atau belum ada pengajuan baru."
                }
              />
            ) : (
              <div className="space-y-4">
                {filteredQueue.map((request) => (
                  <VerificationCard
                    key={request.id}
                    request={request}
                    mode="leader"
                    onOpenDetail={(req) => setDetailTarget(req)}
                    onOpenApprove={(req) => handleOpenModal(req, "Approve")}
                    onOpenReject={(req) => handleOpenModal(req, "Reject")}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* TabPanel 2: Riwayat Verifikasi Divisi (Swiss Ledger Table) */}
        <div
          role="tabpanel"
          aria-labelledby={historyTabId}
          hidden={activeTab !== "history"}
        >
          {filteredHistory.length === 0 ? (
            <div className="panel-body">
              <EmptyState
                title="Belum Ada Riwayat Verifikasi"
                description={
                  hasActiveFilter
                    ? "Tidak ada riwayat verifikasi yang cocok dengan filter yang dipilih."
                    : "Pengajuan anggota divisi yang telah Anda setujui atau tolak akan tercatat otomatis pada tabel riwayat ini."
                }
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
                  Daftar riwayat verifikasi pengajuan cuti anggota divisi{" "}
                  {divisionDisplay}
                </caption>
                <thead>
                  <tr>
                    <th scope="col" className="row-idx">
                      #
                    </th>
                    <th scope="col">Anggota</th>
                    <th scope="col">Jenis &amp; Periode</th>
                    <th scope="col">Durasi</th>
                    <th scope="col">Status</th>
                    <th scope="col" className="text-right">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map((request, idx) => (
                    <tr
                      key={request.id}
                      onClick={() => setDetailTarget(request)}
                      className="cursor-pointer"
                    >
                      <td data-label="No" className="row-idx">
                        {String(idx + 1).padStart(2, "0")}
                      </td>
                      <th scope="row" className="font-normal">
                        <div className="flex items-center gap-2.5">
                          <UserAvatar
                            src={request.applicantAvatar}
                            alt={`Foto profil ${request.applicantName}`}
                            initials={request.applicantInitials || "KR"}
                            imgClassName="h-8 w-8 shrink-0 rounded-[2px] border border-[var(--rule)] object-cover"
                            fallbackClassName="avatar-sq"
                            ariaHiddenFallback
                          />
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-[var(--ink)]">
                              {request.applicantName}
                            </p>
                            <p className="truncate text-[11px] text-[var(--ink-muted)]">
                              Handover: {request.handoverUserName}
                            </p>
                          </div>
                        </div>
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
                      <td data-label="Status">
                        <StatusBadge
                          status={request.status}
                          rejectedByRole={request.rejectedByRole}
                        />
                      </td>
                      <td data-label="Aksi" className="text-right">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setDetailTarget(request);
                          }}
                          className="btn btn-sm"
                        >
                          Detail
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Native <dialog> Slide-Over Detail Drawer */}
      <ApprovalDetailDrawer
        request={detailTarget}
        isOpen={Boolean(detailTarget)}
        canTakeAction={detailTarget?.status === "Pending"}
        onClose={() => setDetailTarget(null)}
        onOpenApprove={(req) => handleOpenModal(req, "Approve")}
        onOpenReject={(req) => handleOpenModal(req, "Reject")}
      />

      {/* Native <dialog> Smart Approval Modal */}
      <ApprovalModal
        isOpen={modalState.isOpen}
        actionType={modalState.actionType}
        approverRole="Ketua Divisi"
        requestSummary={modalState.request}
        onClose={handleCloseModal}
        onSubmit={handleSubmitDecision}
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
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
