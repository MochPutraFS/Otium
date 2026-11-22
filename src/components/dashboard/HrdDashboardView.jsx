"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowUpRight,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import EmptyState from "@/components/ui/EmptyState";

const LEAVES_PAGE_SIZE = 5;
const HRD_TABS = ["leaves", "divisions"];

/**
 * Tampilan Dashboard HRD (Final Approver) bergaya Swiss Archival (100% UI-Only Live Data).
 * Menampilkan Metric Strip perusahaan, ringkasan antrean persetujuan final HRD,
 * serta Tabbed Ledger aksesibel untuk jadwal cuti bulanan & kapasitas lintas divisi.
 */
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

  const {
    periodLabel,
    stats,
    monthlyApprovedLeaves = [],
    divisionsSummary = [],
  } = dashboardData;

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

  // Hitung divisi dengan beban cuti harian > 30% murni dari props divisionsSummary
  const highLeaveDivisions = useMemo(() => {
    return divisionsSummary.filter((div) => {
      if (!div.activeMembers) return false;
      return (div.currentlyOnLeave / div.activeMembers) * 100 > 30;
    });
  }, [divisionsSummary]);

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

      {refreshError && (
        <div role="alert" className="notice notice-danger">
          <AlertCircle aria-hidden="true" />
          <span>{refreshError}</span>
        </div>
      )}

      {/* 1. METRIC STRIP PERUSAHAAN (4 Sel Arsip — Sel 1 = CTA Antrean Final HRD) */}
      <div
        className="metric-strip"
        role="region"
        aria-label="Ringkasan Metrik HRD"
      >
        <Link
          href="/approvals/hrd"
          className="metric-cell group transition-colors duration-150 hover:bg-[var(--spruce-tint)]"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="metric-label">Pending Final HRD</span>
            <ArrowUpRight
              className="h-3.5 w-3.5 text-[var(--ochre)] transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              aria-hidden="true"
            />
          </div>
          <div className="metric-val text-[var(--ochre)]">
            {String(stats.pendingFinalApproval).padStart(2, "0")}
          </div>
          <div className="metric-note font-mono text-[11px] text-[var(--spruce)] group-hover:underline">
            Buka Meja Persetujuan &rarr;
          </div>
        </Link>

        <div className="metric-cell">
          <div className="metric-label">Pengajuan Bulan Ini</div>
          <div className="metric-val">
            {String(stats.monthlyCompanyRequests).padStart(2, "0")}
          </div>
          <div className="metric-note">Periode {periodLabel}</div>
        </div>

        <div className="metric-cell">
          <div className="metric-label">Karyawan Cuti Bulan Ini</div>
          <div className="metric-val text-[var(--spruce)]">
            {String(stats.employeesOnLeaveThisMonth).padStart(2, "0")}
          </div>
          <div className="metric-note">Jadwal cuti berstatus Approved</div>
        </div>

        <div className="metric-cell">
          <div className="metric-label">Divisi &amp; Tim Aktif</div>
          <div className="metric-val">
            {String(stats.activeDivisions).padStart(2, "0")}
          </div>
          <div className="metric-note mono text-[11px]">
            {stats.activeEmployees} pengguna aktif terdaftar
          </div>
        </div>
      </div>

      {/* 2. PANEL RINGKASAN ANTREAN FINAL HRD & KAPASITAS */}
      <section className="panel" aria-label="Ringkasan Otorisasi HRD">
        <div className="panel-head">
          <div>
            <span className="panel-eyebrow">
              Otorisasi Final &bull; {periodLabel}
            </span>
            <h2 className="panel-title">Meja Persetujuan Final HRD</h2>
            <p className="panel-sub">
              Tinjau pengajuan berstatus Approved by Leader &amp; pengajuan
              pribadi Ketua Divisi (mendukung Multi-Approve atomik).
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
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
            <Link href="/approvals/hrd" className="btn btn-primary btn-sm">
              <CheckSquare className="h-3.5 w-3.5" aria-hidden="true" />
              <span>
                Ke Antrean Final ({stats.pendingFinalApproval})
              </span>
            </Link>
          </div>
        </div>

        {highLeaveDivisions.length > 0 && (
          <div className="panel-body !py-3.5">
            <div className="notice notice-warn">
              <AlertCircle aria-hidden="true" />
              <span>
                <strong>Perhatian Kapasitas Tim (&gt;30% cuti hari ini):</strong>{" "}
                {highLeaveDivisions
                  .map(
                    (d) =>
                      `${d.name} (${d.currentlyOnLeave}/${d.activeMembers} cuti)`
                  )
                  .join(", ")}
                .
              </span>
            </div>
          </div>
        )}
      </section>

      {/* 3. TABBED LEDGER PANEL: SEDANG CUTI BULAN INI | KAPASITAS DIVISI */}
      <section className="panel overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-[var(--rule)] bg-[var(--paper)] px-5 pt-3.5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div
              role="tablist"
              aria-label="Monitoring cuti dan kapasitas divisi HRD"
              className="flex flex-nowrap items-center gap-6 overflow-x-auto"
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
                className={`otium-tab mono shrink-0 cursor-pointer pb-3 pt-1 text-xs font-semibold uppercase tracking-[0.04em] transition-colors duration-150 ${
                  activeTab === "leaves"
                    ? "text-[var(--spruce)]"
                    : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
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
                className={`otium-tab mono shrink-0 cursor-pointer pb-3 pt-1 text-xs font-semibold uppercase tracking-[0.04em] transition-colors duration-150 ${
                  activeTab === "divisions"
                    ? "text-[var(--spruce)]"
                    : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
                }`}
              >
                Kapasitas &amp; Ketersediaan Divisi ({divisionsSummary.length})
              </button>
            </div>

            <div className="pb-2.5 sm:pb-3">
              {activeTab === "leaves" ? (
                <StatusBadge status="Approved" />
              ) : (
                <span className="mono text-[11px] text-[var(--ink-muted)]">
                  Rasio kehadiran tim hari ini
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Konten Tab 1: Daftar Karyawan Cuti Bulan Ini */}
        <div
          role="tabpanel"
          aria-labelledby={leavesTabId}
          hidden={activeTab !== "leaves"}
        >
          {divisionOptions.length > 1 && (
            <div
              className="toolbar"
              role="group"
              aria-label="Filter divisi karyawan cuti bulan ini"
            >
              <div className="seg-group flex-wrap">
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
                      className="seg-btn"
                    >
                      {divName}
                    </button>
                  );
                })}
              </div>
              <span className="mono ml-auto text-[11px] text-[var(--ink-muted)]">
                {filteredLeaves.length} jadwal
              </span>
            </div>
          )}

          {filteredLeaves.length === 0 ? (
            <div className="panel-body">
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
                className="otium-responsive-table-wrap"
              >
                <table className="ledger otium-responsive-table text-left">
                  <caption id={leavesCaptionId} className="visually-hidden">
                    Daftar karyawan yang sedang atau akan menjalani cuti
                    Approved pada bulan {periodLabel}
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col" className="row-idx">
                        #
                      </th>
                      <th scope="col">Nama Karyawan</th>
                      <th scope="col">Divisi</th>
                      <th scope="col">Jenis Cuti</th>
                      <th scope="col">Periode Cuti</th>
                      <th scope="col">Durasi</th>
                      <th scope="col">Rekan Pengganti</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedLeaves.map((item, idx) => (
                      <tr key={item.id}>
                        <td data-label="No" className="row-idx">
                          {String(startIndex + idx + 1).padStart(2, "0")}
                        </td>
                        <th scope="row" className="font-normal">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-[var(--ink)]">
                              {item.employeeName}
                            </span>
                            {item.role === "Ketua Divisi" && (
                              <StatusBadge status="Ketua Divisi" />
                            )}
                          </div>
                        </th>
                        <td
                          data-label="Divisi"
                          className="whitespace-nowrap text-xs font-medium text-[var(--ink-soft)]"
                        >
                          {item.divisionName}
                        </td>
                        <td
                          data-label="Jenis Cuti"
                          className="whitespace-nowrap text-xs text-[var(--ink-soft)]"
                        >
                          {item.leaveTypeName}
                        </td>
                        <td
                          data-label="Periode"
                          className="mono whitespace-nowrap text-xs text-[var(--ink-soft)]"
                        >
                          {item.periodLabel}
                        </td>
                        <td
                          data-label="Durasi"
                          className="mono whitespace-nowrap text-xs font-semibold text-[var(--ink)]"
                        >
                          {item.totalDays.toFixed(1)} hr
                        </td>
                        <td
                          data-label="Rekan Pengganti"
                          className="whitespace-nowrap text-xs text-[var(--ink-soft)]"
                        >
                          {item.handoverName}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between border-t border-[var(--rule)] bg-[var(--paper)] px-5 py-3 text-xs text-[var(--ink-soft)]">
                <span className="mono text-[11px]">
                  Menampilkan{" "}
                  <strong className="font-semibold text-[var(--ink)]">
                    {startIndex + 1}&ndash;
                    {Math.min(
                      startIndex + LEAVES_PAGE_SIZE,
                      filteredLeaves.length
                    )}
                  </strong>{" "}
                  dari{" "}
                  <strong className="font-semibold text-[var(--ink)]">
                    {filteredLeaves.length}
                  </strong>{" "}
                  jadwal
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={safePage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    aria-label="Halaman sebelumnya"
                    className="btn btn-sm !min-h-[28px] !px-2"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                  <span className="mono px-1.5 text-[11px] font-semibold text-[var(--ink)]">
                    {safePage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={safePage >= totalPages}
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    aria-label="Halaman berikutnya"
                    className="btn btn-sm !min-h-[28px] !px-2"
                  >
                    <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Konten Tab 2: Kapasitas & Ketersediaan Divisi */}
        <div
          role="tabpanel"
          aria-labelledby={divisionsTabId}
          hidden={activeTab !== "divisions"}
        >
          {divisionsSummary.length === 0 ? (
            <div className="panel-body">
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
              className="otium-responsive-table-wrap"
            >
              <table className="ledger otium-responsive-table text-left">
                <caption id={divisionsCaptionId} className="visually-hidden">
                  Ringkasan divisi perusahaan beserta rasio ketersediaan tim
                  hari ini dan jumlah pengajuan cuti bulan berjalan
                </caption>
                <thead>
                  <tr>
                    <th scope="col" className="row-idx">
                      #
                    </th>
                    <th scope="col">Nama Divisi</th>
                    <th scope="col">Ketua Divisi</th>
                    <th scope="col">Ketersediaan Tim Hari Ini</th>
                    <th scope="col">Sedang Cuti</th>
                    <th scope="col" className="text-right">
                      Cuti Bulan Ini
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {divisionsSummary.map((div, idx) => {
                    const availableCount = Math.max(
                      0,
                      div.activeMembers - div.currentlyOnLeave
                    );
                    const availPercent =
                      div.activeMembers > 0
                        ? Math.round((availableCount / div.activeMembers) * 100)
                        : 100;
                    const leaveRatioPct =
                      div.activeMembers > 0
                        ? Math.round(
                            (div.currentlyOnLeave / div.activeMembers) * 100
                          )
                        : 0;
                    const isOverCapacity = leaveRatioPct > 30;
                    const barTone = isOverCapacity
                      ? "otium-progress--danger"
                      : availPercent >= 80
                        ? "otium-progress--ok"
                        : "otium-progress--amber";

                    return (
                      <tr key={div.id}>
                        <td data-label="No" className="row-idx">
                          {String(idx + 1).padStart(2, "0")}
                        </td>
                        <th scope="row" className="font-semibold text-[var(--ink)]">
                          {div.name}
                        </th>
                        <td
                          data-label="Ketua Divisi"
                          className="whitespace-nowrap text-xs text-[var(--ink-soft)]"
                        >
                          {div.leaderName}
                        </td>
                        <td
                          data-label="Ketersediaan Tim"
                          className="min-w-[200px]"
                        >
                          <div className="w-full max-w-[220px] sm:max-w-none">
                            <div className="mono flex items-center justify-between gap-2 text-[11px]">
                              <span className="font-semibold text-[var(--ink)]">
                                {availableCount}/{div.activeMembers} Hadir
                              </span>
                              <span className="text-[var(--ink-muted)]">
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
                          className="whitespace-nowrap text-xs"
                        >
                          {div.currentlyOnLeave > 0 ? (
                            <span
                              className={`tag ${
                                isOverCapacity ? "tag-rejected" : "tag-leader"
                              }`}
                            >
                              {div.currentlyOnLeave} Orang ({leaveRatioPct}%)
                            </span>
                          ) : (
                            <span className="mono text-xs text-[var(--ink-muted)]">
                              0 Orang
                            </span>
                          )}
                        </td>
                        <td
                          data-label="Cuti Bulan Ini"
                          className="mono whitespace-nowrap text-right text-xs font-semibold text-[var(--ink)]"
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
