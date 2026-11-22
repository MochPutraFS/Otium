"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Building2,
  CalendarRange,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  UserCheck,
} from "lucide-react";
import StatsCard from "@/components/ui/StatsCard";
import StatusBadge from "@/components/ui/StatusBadge";
import EmptyState from "@/components/ui/EmptyState";

const LEAVES_PAGE_SIZE = 5;
const HRD_TABS = ["leaves", "divisions"];

// Tampilan dashboard untuk role HRD (Pure Production Live Data — Tabbed Card Aksesibel)
export default function HrdDashboardView({ initialData, data }) {
  const leavesTabId = useId();
  const divisionsTabId = useId();
  const leavesCaptionId = useId();
  const divisionsCaptionId = useId();
  const tabRefs = useRef({});

  const [dashboardData, setDashboardData] = useState(initialData || data);
  const [activeTab, setActiveTab] = useState("leaves");
  const [selectedDivision, setSelectedDivision] = useState("Semua");
  const [currentPage, setCurrentPage] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState("");
  const [liveStatus, setLiveStatus] = useState("");

  useEffect(() => {
    if (initialData) {
      setDashboardData(initialData);
    }
  }, [initialData]);

  const { periodLabel, stats, monthlyApprovedLeaves, divisionsSummary } =
    dashboardData;

  const divisionOptions = useMemo(() => {
    const names = divisionsSummary.map((div) => div.name);
    return ["Semua", ...names];
  }, [divisionsSummary]);

  const activeDivision = divisionOptions.includes(selectedDivision)
    ? selectedDivision
    : "Semua";

  const filteredLeaves = useMemo(() => {
    if (activeDivision === "Semua") return monthlyApprovedLeaves;
    return monthlyApprovedLeaves.filter(
      (item) => item.divisionName === activeDivision
    );
  }, [monthlyApprovedLeaves, activeDivision]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredLeaves.length / LEAVES_PAGE_SIZE)
  );
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * LEAVES_PAGE_SIZE;
  const paginatedLeaves = filteredLeaves.slice(
    startIndex,
    startIndex + LEAVES_PAGE_SIZE
  );

  // Keyboard navigation untuk tablist (selection follows focus: ArrowLeft/ArrowRight/Home/End)
  function handleTabKeyDown(event, currentKey) {
    const idx = HRD_TABS.indexOf(currentKey);
    let nextKey = null;

    if (event.key === "ArrowRight") {
      nextKey = HRD_TABS[(idx + 1) % HRD_TABS.length];
    } else if (event.key === "ArrowLeft") {
      nextKey = HRD_TABS[(idx - 1 + HRD_TABS.length) % HRD_TABS.length];
    } else if (event.key === "Home") {
      nextKey = HRD_TABS[0];
    } else if (event.key === "End") {
      nextKey = HRD_TABS[HRD_TABS.length - 1];
    }

    if (nextKey) {
      event.preventDefault();
      setActiveTab(nextKey);
      tabRefs.current[nextKey]?.focus();
    }
  }

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
      setLiveStatus("Data Dashboard HRD berhasil disegarkan.");
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

      {/* Header dan tombol menuju antrean final */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              Dashboard HRD (Final Approver)
            </h2>
            <StatusBadge status="HRD" />
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Tinjau antrean persetujuan final lintas divisi, pantau jadwal cuti
            karyawan bulan {periodLabel}, dan kapasitas tiap divisi.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors duration-150 hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            Segarkan
          </button>
          <Link
            href="/approvals/hrd"
            className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-colors duration-150 hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 tabular-nums"
          >
            <CheckSquare className="h-4 w-4" aria-hidden="true" />
            Ke Antrean Final Approval ({stats.pendingFinalApproval})
          </Link>
        </div>
      </div>

      {refreshError && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800"
        >
          <AlertCircle
            className="mt-0.5 h-4 w-4 shrink-0 text-rose-700"
            aria-hidden="true"
          />
          <span>{refreshError}</span>
        </div>
      )}

      {/* Ringkasan metrik perusahaan (Kartu 2 = Clickable CTA Card) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Pengajuan Bulan Ini"
          value={`${stats.monthlyCompanyRequests} Pengajuan`}
          subtitle={`Akumulasi seluruh perusahaan (${periodLabel})`}
          icon={<CalendarRange className="h-5 w-5" aria-hidden="true" />}
          variant="blue"
        />
        <StatsCard
          title="Pending Final Approval"
          value={`${stats.pendingFinalApproval} Menunggu`}
          subtitle="Klik untuk proses Approved by Leader & cuti Ketua"
          icon={<CheckSquare className="h-5 w-5" aria-hidden="true" />}
          variant="amber"
          href="/approvals/hrd"
          actionLabel="Proses Final Approval"
          clickableCard
        />
        <StatsCard
          title="Karyawan Cuti Bulan Ini"
          value={`${stats.employeesOnLeaveThisMonth} Karyawan`}
          subtitle="Jadwal cuti berstatus Approved"
          icon={<UserCheck className="h-5 w-5" aria-hidden="true" />}
          variant="emerald"
        />
        <StatsCard
          title="Total Divisi & Tim Aktif"
          value={`${stats.activeDivisions} Divisi`}
          subtitle={`${stats.activeEmployees} pengguna aktif terdaftar`}
          icon={<Building2 className="h-5 w-5" aria-hidden="true" />}
          variant="purple"
        />
      </div>

      {/* Tabbed Card Terpadu: Sedang Cuti Bulan Ini | Ringkasan Divisi */}
      <section className="overflow-hidden rounded-xl border border-stone-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-stone-200 bg-[#FAF9F6] px-5 pt-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div
              role="tablist"
              aria-label="Monitoring cuti dan divisi HRD"
              className="flex flex-nowrap items-center gap-5 overflow-x-auto"
            >
              <button
                ref={(el) => {
                  tabRefs.current.leaves = el;
                }}
                id={leavesTabId}
                type="button"
                role="tab"
                tabIndex={activeTab === "leaves" ? 0 : -1}
                aria-selected={activeTab === "leaves"}
                onClick={() => setActiveTab("leaves")}
                onKeyDown={(e) => handleTabKeyDown(e, "leaves")}
                className={`otium-tab shrink-0 cursor-pointer pb-3 pt-1 text-xs font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 tabular-nums ${
                  activeTab === "leaves"
                    ? "text-slate-900"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Sedang Cuti Bulan Ini ({monthlyApprovedLeaves.length})
              </button>
              <button
                ref={(el) => {
                  tabRefs.current.divisions = el;
                }}
                id={divisionsTabId}
                type="button"
                role="tab"
                tabIndex={activeTab === "divisions" ? 0 : -1}
                aria-selected={activeTab === "divisions"}
                onClick={() => setActiveTab("divisions")}
                onKeyDown={(e) => handleTabKeyDown(e, "divisions")}
                className={`otium-tab shrink-0 cursor-pointer pb-3 pt-1 text-xs font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 tabular-nums ${
                  activeTab === "divisions"
                    ? "text-slate-900"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Ringkasan Divisi ({divisionsSummary.length})
              </button>
            </div>

            <div className="pb-2.5 sm:pb-3">
              {activeTab === "leaves" ? (
                <StatusBadge status="Approved" />
              ) : (
                <span className="text-xs font-medium text-slate-600">
                  Rasio ketersediaan tim hari ini lintas unit kerja
                </span>
              )}
            </div>
          </div>

          {activeTab === "leaves" && divisionOptions.length > 1 && (
            <div
              className="flex flex-wrap items-center gap-1.5 pb-3.5"
              role="group"
              aria-label="Filter divisi karyawan cuti bulan ini"
            >
              {divisionOptions.map((divName) => {
                const active = divName === activeDivision;
                return (
                  <button
                    key={divName}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      setSelectedDivision(divName);
                      setCurrentPage(1);
                    }}
                    className={`cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 ${
                      active
                        ? "bg-slate-900 text-white"
                        : "border border-stone-300 bg-white text-slate-700 hover:bg-stone-100 hover:text-slate-900"
                    }`}
                  >
                    {divName}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Konten Tab 1: Daftar Karyawan Cuti Bulan Ini */}
        <div
          role="tabpanel"
          aria-labelledby={leavesTabId}
          hidden={activeTab !== "leaves"}
        >
          {filteredLeaves.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="Belum ada jadwal cuti Approved pada periode ini"
                description={
                  activeDivision === "Semua"
                    ? `Belum ada karyawan dengan jadwal cuti berstatus Approved pada bulan ${periodLabel}.`
                    : `Belum ada jadwal cuti Approved di divisi ${activeDivision} pada bulan ${periodLabel}.`
                }
              />
            </div>
          ) : (
            <>
              <div
                tabIndex={0}
                role="region"
                aria-labelledby={leavesCaptionId}
                className="otium-responsive-table-wrap focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-slate-900"
              >
                <table className="otium-responsive-table text-left text-sm">
                  <caption id={leavesCaptionId} className="visually-hidden">
                    Daftar karyawan yang sedang atau akan menjalani cuti
                    Approved pada bulan {periodLabel}
                  </caption>
                  <thead className="border-b border-stone-200 bg-[#FAF9F6] text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-600">
                    <tr>
                      <th scope="col" className="px-5 py-3">
                        Nama Karyawan
                      </th>
                      <th scope="col" className="px-5 py-3">
                        Divisi
                      </th>
                      <th scope="col" className="px-5 py-3">
                        Jenis Cuti
                      </th>
                      <th scope="col" className="px-5 py-3">
                        Periode Cuti
                      </th>
                      <th scope="col" className="px-5 py-3">
                        Durasi
                      </th>
                      <th scope="col" className="px-5 py-3">
                        Rekan Pengganti
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 bg-white">
                    {paginatedLeaves.map((item) => (
                      <tr
                        key={item.id}
                        className="transition-colors duration-150 hover:bg-[#FAF9F6]"
                      >
                        <th
                          scope="row"
                          className="whitespace-nowrap px-5 py-3.5 text-left font-normal"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-slate-900">
                              {item.employeeName}
                            </span>
                            {item.role === "Ketua Divisi" && (
                              <StatusBadge status="Ketua Divisi" />
                            )}
                          </div>
                        </th>
                        <td
                          data-label="Divisi"
                          className="whitespace-nowrap px-5 py-3.5 text-xs font-medium text-slate-700"
                        >
                          {item.divisionName}
                        </td>
                        <td
                          data-label="Jenis Cuti"
                          className="whitespace-nowrap px-5 py-3.5 text-xs text-slate-700"
                        >
                          {item.leaveTypeName}
                        </td>
                        <td
                          data-label="Periode"
                          className="whitespace-nowrap px-5 py-3.5 text-xs text-slate-700 tabular-nums"
                        >
                          {item.periodLabel}
                        </td>
                        <td
                          data-label="Durasi"
                          className="whitespace-nowrap px-5 py-3.5 text-xs font-semibold text-slate-900 tabular-nums"
                        >
                          {item.totalDays.toFixed(1)} Hari
                        </td>
                        <td
                          data-label="Rekan Pengganti"
                          className="whitespace-nowrap px-5 py-3.5 text-xs text-slate-700"
                        >
                          {item.handoverName}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between border-t border-stone-200 bg-[#FAF9F6] px-5 py-3 text-xs text-slate-600 tabular-nums">
                <span>
                  Menampilkan{" "}
                  <strong className="font-semibold text-slate-900">
                    {startIndex + 1}&ndash;
                    {Math.min(
                      startIndex + LEAVES_PAGE_SIZE,
                      filteredLeaves.length
                    )}
                  </strong>{" "}
                  dari{" "}
                  <strong className="font-semibold text-slate-900">
                    {filteredLeaves.length}
                  </strong>{" "}
                  jadwal cuti
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={safePage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    aria-label="Halaman sebelumnya"
                    className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border border-stone-300 bg-white text-slate-700 transition-colors duration-150 hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                  <span className="px-1.5 font-medium text-slate-800">
                    {safePage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={safePage >= totalPages}
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    aria-label="Halaman berikutnya"
                    className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border border-stone-300 bg-white text-slate-700 transition-colors duration-150 hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Konten Tab 2: Daftar Divisi Perusahaan & Rasio Ketersediaan Tim */}
        <div
          role="tabpanel"
          aria-labelledby={divisionsTabId}
          hidden={activeTab !== "divisions"}
        >
          {divisionsSummary.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="Belum ada divisi terdaftar"
                description="Admin belum menambahkan data divisi pada sistem."
              />
            </div>
          ) : (
            <div
              tabIndex={0}
              role="region"
              aria-labelledby={divisionsCaptionId}
              className="otium-responsive-table-wrap focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-slate-900"
            >
              <table className="otium-responsive-table text-left text-sm">
                <caption id={divisionsCaptionId} className="visually-hidden">
                  Ringkasan divisi perusahaan beserta rasio ketersediaan tim
                  hari ini dan jumlah pengajuan cuti bulan berjalan
                </caption>
                <thead className="border-b border-stone-200 bg-[#FAF9F6] text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-600">
                  <tr>
                    <th scope="col" className="px-5 py-3">
                      Nama Divisi
                    </th>
                    <th scope="col" className="px-5 py-3">
                      Ketua Divisi
                    </th>
                    <th scope="col" className="px-5 py-3">
                      Ketersediaan Tim
                    </th>
                    <th scope="col" className="px-5 py-3">
                      Sedang Cuti
                    </th>
                    <th scope="col" className="px-5 py-3 text-right">
                      Cuti Bulan Ini
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 bg-white">
                  {divisionsSummary.map((div) => {
                    const availableCount = Math.max(
                      0,
                      div.activeMembers - div.currentlyOnLeave
                    );
                    const availPercent =
                      div.activeMembers > 0
                        ? Math.round((availableCount / div.activeMembers) * 100)
                        : 100;
                    const barTone =
                      availPercent >= 80
                        ? "otium-progress--ok"
                        : availPercent >= 60
                          ? "otium-progress--sky"
                          : "otium-progress--amber";

                    return (
                      <tr
                        key={div.id}
                        className="transition-colors duration-150 hover:bg-[#FAF9F6]"
                      >
                        <th
                          scope="row"
                          className="whitespace-nowrap px-5 py-3.5 text-left font-semibold text-slate-900"
                        >
                          {div.name}
                        </th>
                        <td
                          data-label="Ketua Divisi"
                          className="whitespace-nowrap px-5 py-3.5 text-xs font-medium text-slate-700"
                        >
                          {div.leaderName}
                        </td>
                        <td
                          data-label="Ketersediaan Tim"
                          className="min-w-[200px] px-5 py-3.5"
                        >
                          <div className="w-full max-w-[220px] sm:max-w-none">
                            <div className="flex items-center justify-between gap-2 text-xs tabular-nums">
                              <span className="font-semibold text-slate-800">
                                {availableCount}/{div.activeMembers} Hadir
                              </span>
                              <span className="font-medium text-slate-600">
                                {availPercent}%
                              </span>
                            </div>
                            <div className="mt-1.5">
                              <progress
                                className={`otium-progress ${barTone}`}
                                value={availPercent}
                                max={100}
                                aria-label={`Ketersediaan tim Divisi ${div.name}: ${availPercent}% (${availableCount} dari ${div.activeMembers} hadir)`}
                              />
                            </div>
                          </div>
                        </td>
                        <td
                          data-label="Sedang Cuti"
                          className="whitespace-nowrap px-5 py-3.5 text-xs tabular-nums"
                        >
                          {div.currentlyOnLeave > 0 ? (
                            <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-800">
                              {div.currentlyOnLeave} Orang
                            </span>
                          ) : (
                            <span className="text-slate-600">0 Orang</span>
                          )}
                        </td>
                        <td
                          data-label="Cuti Bulan Ini"
                          className="whitespace-nowrap px-5 py-3.5 text-right text-xs font-semibold text-slate-900 tabular-nums"
                        >
                          {div.monthlyLeaveCount} Pengajuan
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
