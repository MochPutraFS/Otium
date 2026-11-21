"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
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
import { formatIndonesianDateRange } from "@/lib/date-utils";
import { cancelLeaveRequestAction } from "@/actions/leave-request-actions";

const STATUS_TABS = [
  { key: "ALL", label: "Semua" },
  { key: "WAITING", label: "Menunggu" },
  { key: "Approved", label: "Disetujui" },
  { key: "Rejected", label: "Ditolak" },
  { key: "Cancelled", label: "Dibatalkan" },
];

/**
 * Halaman Riwayat Pengajuan & Pembatalan Cuti (/leaves) — Pure Production.
 * Menggunakan desain Warm Alabaster Swiss Editorial Minimalism, satu tabel semantik
 * `.otium-responsive-table` berbasis `@container`, tab status `.otium-tab` satu baris,
 * filter status/jenis/rentang tanggal/pencarian/sortir, native `<dialog>` untuk
 * `LeaveDetailDrawer` & `CancelLeaveModal`, serta mutasi atomik `cancelLeaveRequestAction`.
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
  const [sortBy, setSortBy] = useState("submitted_desc");

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelServerError, setCancelServerError] = useState("");

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toast, setToast] = useState(null); // { message, tone: "success" | "error" }

  const isLeaderRole = userProfile?.role === "Ketua Divisi";

  // Sinkronisasi props ketika Server Component melakukan revalidatePath / router.refresh()
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

    return [...list].sort((a, b) => {
      if (sortBy === "start_desc") {
        return b.startDate.localeCompare(a.startDate) || b.id - a.id;
      }
      if (sortBy === "start_asc") {
        return a.startDate.localeCompare(b.startDate) || a.id - b.id;
      }
      return b.submissionDate.localeCompare(a.submissionDate) || b.id - a.id;
    });
  }, [
    requests,
    activeTab,
    leaveTypeFilter,
    dateFrom,
    dateTo,
    dateRangeInvalid,
    searchQuery,
    sortBy,
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
    setSortBy("submitted_desc");
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
          result?.error || "Gagal membatalkan pengajuan cuti. Silakan coba lagi.";
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
    <div className="space-y-6">
      {/* Header Editorial & Ringkasan Kuota */}
      <header className="flex flex-col justify-between gap-4 border-b border-stone-200 pb-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Modul 5 &bull; Transaksi Cuti Pribadi
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Riwayat Cuti Saya
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
            <span>
              Sisa Kuota Cuti Tahunan:{" "}
              <strong className="font-semibold tabular-nums text-slate-900">
                {Number(userProfile?.remainingLeaveQuota ?? 0).toFixed(1)} Hari
              </strong>
            </span>
            {userProfile?.divisionName && (
              <span className="text-slate-500">
                Divisi:{" "}
                <strong className="font-medium text-slate-700">
                  {userProfile.divisionName}
                </strong>
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => refreshFromServer({ silent: false })}
            disabled={isRefreshing}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors duration-150 hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            <span>Sinkronkan</span>
          </button>

          <Link
            href="/leaves/new"
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-colors duration-150 hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
          >
            <CalendarPlus className="h-4 w-4" aria-hidden="true" />
            <span>Ajukan Cuti Baru</span>
          </Link>
        </div>
      </header>

      {/* Panel Kontrol: Quick Status Tabs (Single Row) + Filter Ringkas */}
      <section
        aria-label="Filter dan navigasi status riwayat cuti"
        className="rounded-xl border border-stone-200 bg-white"
      >
        {/* Bar Tab Status Cepat — satu baris horizontal scroll, tahan forced-colors */}
        <div className="border-b border-stone-200 px-4 pt-2 sm:px-5">
          <div
            role="tablist"
            aria-label="Filter berdasarkan status pengajuan cuti"
            className="flex flex-nowrap items-center gap-1 overflow-x-auto"
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
                  className={`otium-tab inline-flex shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap px-3.5 py-2.5 text-xs font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-slate-900 ${
                    isActive
                      ? "text-slate-900"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
                      isActive
                        ? "bg-slate-900 text-white"
                        : "bg-stone-100 text-slate-600"
                    }`}
                  >
                    {tabCount}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bar Filter: Pencarian, Jenis Cuti, Rentang Tanggal, Sortir */}
        <div className="grid grid-cols-1 gap-3 bg-[#faf9f6] p-4 sm:grid-cols-2 lg:grid-cols-12 sm:px-5">
          {/* Pencarian */}
          <div className="relative lg:col-span-3">
            <label htmlFor={searchInputId} className="visually-hidden">
              Cari alasan atau rekan pengganti
            </label>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              id={searchInputId}
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari alasan / rekan handover..."
              className="w-full rounded-lg border border-stone-300 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 transition-colors focus:border-slate-900 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-slate-900"
            />
          </div>

          {/* Filter Jenis Cuti */}
          <div className="lg:col-span-3">
            <select
              aria-label="Filter jenis cuti"
              value={leaveTypeFilter}
              onChange={(e) => setLeaveTypeFilter(e.target.value)}
              className="w-full cursor-pointer rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 transition-colors focus:border-slate-900 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-slate-900"
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

          {/* Filter Rentang Tanggal (Dari – Sampai) */}
          <div className="flex items-center gap-1.5 sm:col-span-2 lg:col-span-4">
            <div className="relative flex-1">
              <label htmlFor={dateFromId} className="visually-hidden">
                Dari tanggal cuti
              </label>
              <input
                id={dateFromId}
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                aria-label="Filter dari tanggal"
                className="w-full rounded-lg border border-stone-300 bg-white px-2.5 py-2 text-xs text-slate-800 transition-colors focus:border-slate-900 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-slate-900"
              />
            </div>
            <span className="shrink-0 text-xs text-slate-400" aria-hidden="true">
              &ndash;
            </span>
            <div className="relative flex-1">
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
                className="w-full rounded-lg border border-stone-300 bg-white px-2.5 py-2 text-xs text-slate-800 transition-colors focus:border-slate-900 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-slate-900"
              />
            </div>
          </div>

          {/* Sortir */}
          <div className="lg:col-span-2">
            <select
              aria-label="Urutkan riwayat cuti"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full cursor-pointer rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 transition-colors focus:border-slate-900 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-slate-900"
            >
              <option value="submitted_desc">Terbaru Diajukan</option>
              <option value="start_desc">Tgl Mulai Terbaru</option>
              <option value="start_asc">Tgl Mulai Terlama</option>
            </select>
          </div>
        </div>

        {/* Peringatan jika rentang tanggal terbalik + Indikator jumlah hasil & tombol Reset */}
        {(dateRangeInvalid || hasActiveFilters) && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-200 bg-white px-4 py-2.5 text-xs sm:px-5">
            {dateRangeInvalid ? (
              <p
                role="alert"
                className="inline-flex items-center gap-1.5 font-medium text-rose-700"
              >
                <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>
                  Tanggal akhir tidak boleh lebih awal dari tanggal awal.
                </span>
              </p>
            ) : (
              <p className="text-slate-600">
                Menampilkan{" "}
                <strong className="font-semibold tabular-nums text-slate-900">
                  {filteredRequests.length}
                </strong>{" "}
                dari{" "}
                <span className="tabular-nums">{requests.length}</span> pengajuan
              </p>
            )}

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex cursor-pointer items-center gap-1 font-semibold text-slate-700 transition-colors hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
              >
                <RotateCcw className="h-3 w-3" aria-hidden="true" />
                <span>Reset Filter</span>
              </button>
            )}
          </div>
        )}
      </section>

      {/* Tabel Riwayat Semantik (Satu Struktur DOM: Tabel 4 Kolom Desktop -> Stacked Card @container < 640px) */}
      {filteredRequests.length === 0 ? (
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
      ) : (
        <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
          <div
            tabIndex={0}
            role="region"
            aria-labelledby={tableCaptionId}
            className="otium-responsive-table-wrap focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-slate-900"
          >
            <table className="otium-responsive-table text-left">
              <caption id={tableCaptionId} className="visually-hidden">
                Daftar riwayat pengajuan cuti pribadi
              </caption>

              <thead>
                <tr className="border-b border-stone-200 bg-[#faf9f6] text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                  <th scope="col" className="px-5 py-3.5">
                    Jenis &amp; Periode
                  </th>
                  <th scope="col" className="px-5 py-3.5">
                    Durasi
                  </th>
                  <th scope="col" className="px-5 py-3.5">
                    Status
                  </th>
                  <th scope="col" className="px-5 py-3.5 text-right">
                    Aksi
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-stone-100 text-sm">
                {filteredRequests.map((req) => {
                  const subStatus = getSubStatusText(req);
                  return (
                    <tr
                      key={req.id}
                      onClick={() => setSelectedRequest(req)}
                      className="cursor-pointer transition-colors duration-150 hover:bg-[#faf9f6]"
                    >
                      <th
                        scope="row"
                        className="px-5 py-4 text-left font-normal"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-slate-900">
                            {req.leaveTypeName}
                          </span>
                          {req.isHalfDay && (
                            <span className="rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-blue-800">
                              0.5 Hr
                            </span>
                          )}
                          {req.attachmentUrl && (
                            <span
                              title="Memiliki dokumen lampiran"
                              className="inline-flex items-center gap-1 rounded border border-stone-200 bg-[#f8f7f4] px-1.5 py-0.5 text-[10px] font-medium text-slate-600"
                            >
                              <Paperclip
                                className="h-3 w-3"
                                aria-hidden="true"
                              />
                              <span>Lampiran</span>
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-slate-600">
                          {formatIndonesianDateRange(
                            req.startDate,
                            req.endDate,
                            req.isHalfDay
                          )}
                        </p>
                      </th>

                      <td
                        data-label="Durasi"
                        className="whitespace-nowrap px-5 py-4 text-xs font-semibold tabular-nums text-slate-800"
                      >
                        {Number(req.totalDays).toFixed(1)} Hari
                      </td>

                      <td data-label="Status" className="px-5 py-4">
                        <div className="inline-flex flex-col items-end gap-1 sm:items-start">
                          <StatusBadge
                            status={req.status}
                            rejectedByRole={req.rejectedByRole}
                          />
                          {subStatus && (
                            <span className="text-[11px] text-slate-500">
                              {subStatus}
                            </span>
                          )}
                        </div>
                      </td>

                      <td
                        data-label="Aksi"
                        className="whitespace-nowrap px-5 py-4 text-right"
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
                              className="cursor-pointer rounded-lg border border-rose-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-rose-700 transition-colors duration-150 hover:bg-rose-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
                            >
                              Batalkan
                            </button>
                          )}

                          {req.status === "Approved" && (
                            <a
                              href={`/api/leaves/${req.id}/pdf`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-emerald-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-emerald-800 transition-colors duration-150 hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
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
                            className="cursor-pointer rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 transition-colors duration-150 hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
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
        </div>
      )}

      {/* Slide-Over Drawer Detail & Timeline (Native <dialog className="otium-drawer">) */}
      <LeaveDetailDrawer
        request={selectedRequest}
        isOpen={Boolean(selectedRequest)}
        onClose={() => setSelectedRequest(null)}
        onOpenCancel={(req) => {
          setCancelServerError("");
          setCancelTarget(req);
        }}
      />

      {/* Modal Pembatalan Cuti (Native <dialog className="otium-modal">, khusus Pending) */}
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

      {/* Toast Umpan Balik Aksesibel */}
      {toast && (
        <div
          role={toast.tone === "error" ? "alert" : "status"}
          aria-live={toast.tone === "error" ? "assertive" : "polite"}
          className={`fixed bottom-5 right-5 z-50 flex max-w-sm items-center gap-2.5 rounded-xl border px-4 py-3 text-xs font-medium shadow-xl ${
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
          <span className="leading-snug">{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Tutup notifikasi"
            className="ml-1 flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
