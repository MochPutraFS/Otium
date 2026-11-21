"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Clock,
  FileCheck2,
  Paperclip,
  RefreshCw,
  RotateCcw,
  Search,
} from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
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
 * Workspace Hybrid Modul 6A: Verifikasi Pengajuan Cuti Tahap 1 — Ketua Divisi (/approvals/leader).
 * - Mode Pure Production: data live PostgreSQL, Server Action atomik `verifyByLeaderAction`,
 *   sinkronisasi `GET /api/approvals/leader` & `router.refresh()`.
 * - Bahasa Desain Warm Alabaster (`#F4F2EC`) — Swiss Editorial Minimalism.
 * - Aksesibilitas & Platform Web Modern: `.otium-tab` keyboard nav, native `<dialog>` drawer & modal,
 *   serta `.otium-responsive-table` berbasis `@container` agar bebas horizontal scroll di 375px.
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

  const [activeTab, setActiveTab] = useState("queue"); // "queue" | "history"
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
  const [toast, setToast] = useState(null); // { message, tone: "success" | "error" }

  // Sinkronisasi props ketika Server Component menjalankan revalidatePath / router.refresh()
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

    // Tutup drawer jika target yang sama sedang terbuka
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
    <div className="space-y-6">
      {/* Page Header — Editorial Minimalism */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            Verifikasi Tahap 1 • Ketua Divisi
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            {hasDivision
              ? `Verifikasi Cuti Divisi ${divisionDisplay}`
              : "Verifikasi Cuti Divisi"}
          </h1>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-600">
            Tinjau jadwal operasional, catatan serah terima tugas (handover),
            dan lampiran dokumen anggota divisi Anda ({leaderProfile?.fullName})
            sebelum diteruskan ke Persetujuan Final HRD.
          </p>
        </div>

        <button
          type="button"
          onClick={() => refreshFromServer()}
          disabled={isRefreshing}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 transition-colors hover:border-slate-900 hover:bg-[#F4F2EC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
          {isRefreshing ? "Menyegarkan..." : "Segarkan Data"}
        </button>
      </div>

      {/* Edge Case: Ketua Divisi belum ditugaskan memimpin divisi aktif */}
      {!hasDivision && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-950"
        >
          <AlertCircle
            className="mt-0.5 h-4 w-4 shrink-0 text-amber-700"
            aria-hidden="true"
          />
          <div>
            <p className="font-semibold">
              Akun Anda belum ditugaskan sebagai pemimpin divisi aktif.
            </p>
            <p className="mt-1 leading-relaxed text-amber-900">
              Hubungi Administrator untuk menetapkan akun Anda pada kolom Ketua
              Divisi di modul Manajemen Divisi agar antrean pengajuan anggota
              divisi dapat muncul di halaman ini.
            </p>
          </div>
        </div>
      )}

      {/* Mini KPI Strip (4 Kartu Ringkas) */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Menunggu Verifikasi
            </span>
            <Clock className="h-4 w-4 text-amber-600" aria-hidden="true" />
          </div>
          <p className="mt-2 text-xl font-bold tracking-tight text-slate-900 tabular-nums">
            {counts.pending}{" "}
            <span className="text-xs font-medium text-slate-500">
              Pengajuan
            </span>
          </p>
        </div>

        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Sudah Diverifikasi
            </span>
            <FileCheck2 className="h-4 w-4 text-sky-700" aria-hidden="true" />
          </div>
          <p className="mt-2 text-xl font-bold tracking-tight text-slate-900 tabular-nums">
            {counts.verified}{" "}
            <span className="text-xs font-medium text-slate-500">
              Pengajuan
            </span>
          </p>
        </div>

        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Cek Lampiran Aktif
            </span>
            <Paperclip className="h-4 w-4 text-slate-700" aria-hidden="true" />
          </div>
          <p className="mt-2 text-xl font-bold tracking-tight text-slate-900 tabular-nums">
            {counts.attachmentsPending}{" "}
            <span className="text-xs font-medium text-slate-500">Dokumen</span>
          </p>
        </div>

        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Divisi Aktif
            </span>
            <Building2
              className="h-4 w-4 text-emerald-700"
              aria-hidden="true"
            />
          </div>
          <p className="mt-2 truncate text-xl font-bold tracking-tight text-slate-900">
            {divisionDisplay}
          </p>
        </div>
      </div>

      {/* Main Hybrid Workspace Card */}
      <section className="overflow-hidden rounded-xl border border-stone-200 bg-white">
        {/* Tabs (Single-Row ARIA Tablist) & Filter Bar */}
        <div className="flex flex-col gap-3 border-b border-stone-200 px-4 pt-3 pb-3 lg:flex-row lg:items-center lg:justify-between">
          <div
            role="tablist"
            aria-label="Tampilan verifikasi cuti divisi"
            className="flex items-center gap-5 overflow-x-auto border-b border-stone-200 lg:border-b-0"
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
                  className={`otium-tab flex shrink-0 cursor-pointer items-center gap-2 pb-2.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 ${
                    isSelected
                      ? "text-slate-900"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${
                      isSelected
                        ? "bg-slate-900 text-white"
                        : "bg-[#F4F2EC] text-slate-700"
                    }`}
                  >
                    {badgeCount}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 sm:flex-none">
              <label htmlFor={searchInputId} className="visually-hidden">
                Cari nama anggota atau rekan handover
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
                placeholder="Cari anggota / handover..."
                className="w-full rounded-lg border border-stone-300 bg-[#F4F2EC]/50 py-1.5 pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 sm:w-52"
              />
            </div>

            <select
              value={leaveTypeFilter}
              onChange={(event) => setLeaveTypeFilter(event.target.value)}
              aria-label="Filter jenis cuti"
              className="cursor-pointer rounded-lg border border-stone-300 bg-[#F4F2EC]/50 px-3 py-1.5 text-xs font-medium text-slate-800 focus:border-slate-900 focus:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
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
                className="cursor-pointer rounded-lg border border-stone-300 bg-[#F4F2EC]/50 px-3 py-1.5 text-xs font-medium text-slate-800 focus:border-slate-900 focus:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
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
                className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-slate-900 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
              >
                <RotateCcw className="h-3 w-3" aria-hidden="true" />
                Reset
              </button>
            )}
          </div>
        </div>

        {/* TabPanel 1: Antrean Menunggu Verifikasi (Compact Card View) */}
        <div
          role="tabpanel"
          aria-labelledby={queueTabId}
          hidden={activeTab !== "queue"}
        >
          <div className="p-4 sm:p-5">
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
              <div className="space-y-3">
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

        {/* TabPanel 2: Riwayat Verifikasi Divisi (Container-Query Responsive Table) */}
        <div
          role="tabpanel"
          aria-labelledby={historyTabId}
          hidden={activeTab !== "history"}
        >
          {filteredHistory.length === 0 ? (
            <div className="p-4 sm:p-5">
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
              className="otium-responsive-table-wrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-900"
            >
              <table className="otium-responsive-table text-left text-xs">
                <caption id={tableCaptionId} className="visually-hidden">
                  Daftar riwayat verifikasi pengajuan cuti anggota divisi{" "}
                  {divisionDisplay}
                </caption>
                <thead className="bg-[#F4F2EC]/80">
                  <tr className="border-b border-stone-200 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                    <th scope="col" className="px-4 py-3">
                      Anggota
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Jenis &amp; Periode
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Durasi
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Status
                    </th>
                    <th scope="col" className="px-4 py-3 text-right">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200/80">
                  {filteredHistory.map((request) => (
                    <tr
                      key={request.id}
                      onClick={() => setDetailTarget(request)}
                      className="cursor-pointer transition-colors hover:bg-[#F4F2EC]/50"
                    >
                      <th scope="row" className="px-4 py-3.5 font-normal">
                        <div className="flex items-center gap-2.5">
                          {request.applicantAvatar ? (
                            <img
                              src={request.applicantAvatar}
                              alt={`Foto profil ${request.applicantName}`}
                              className="h-8 w-8 shrink-0 rounded-full border border-stone-200 object-cover bg-[#F4F2EC]"
                            />
                          ) : (
                            <span
                              aria-hidden="true"
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-stone-200 bg-[#F4F2EC] text-[11px] font-bold text-slate-800"
                            >
                              {request.applicantInitials || "KR"}
                            </span>
                          )}
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-900">
                              {request.applicantName}
                            </p>
                            <p className="truncate text-[11px] text-slate-500">
                              Handover: {request.handoverUserName}
                            </p>
                          </div>
                        </div>
                      </th>
                      <td data-label="Jenis & Periode" className="px-4 py-3.5">
                        <div>
                          <p className="font-medium text-slate-900">
                            {request.leaveTypeName}
                          </p>
                          <p className="text-[11px] text-slate-600">
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
                        className="px-4 py-3.5 font-semibold text-slate-900 tabular-nums"
                      >
                        {Number(request.totalDays).toFixed(1)} Hari
                      </td>
                      <td data-label="Status" className="px-4 py-3.5">
                        <StatusBadge
                          status={request.status}
                          rejectedByRole={request.rejectedByRole}
                        />
                      </td>
                      <td data-label="Aksi" className="px-4 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setDetailTarget(request);
                          }}
                          className="cursor-pointer rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-800 transition-colors hover:border-slate-900 hover:bg-[#F4F2EC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
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

      {/* Live Region Toast Feedback */}
      {toast && (
        <div
          role={toast.tone === "error" ? "alert" : "status"}
          aria-live={toast.tone === "error" ? "assertive" : "polite"}
          className={`fixed bottom-6 left-1/2 z-50 flex max-w-md -translate-x-1/2 items-center gap-2.5 rounded-xl border px-4 py-3 text-xs font-semibold shadow-xl ${
            toast.tone === "error"
              ? "border-rose-700 bg-rose-950 text-white"
              : "border-slate-800 bg-slate-900 text-white"
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
