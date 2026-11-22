"use client";

import { useEffect, useId, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowUpRight,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Info,
  RefreshCw,
  Search,
} from "lucide-react";
import QuotaPrecisionRuler from "@/components/ui/QuotaPrecisionRuler";
import StatusBadge from "@/components/ui/StatusBadge";
import EmptyState from "@/components/ui/EmptyState";

const MEMBERS_PAGE_SIZE = 5;

/**
 * Tampilan Dashboard Ketua Divisi bergaya Swiss Archival (100% UI-Only Live Data).
 * Menampilkan Quota Ledger Hero pribadi, Metric Strip divisi, strip jadwal mingguan
 * Sen-Jum + daftar cuti minggu ini, dan tabel Swiss Ledger anggota divisi.
 */
export default function LeaderDashboardView({ initialData, data }) {
  const tableCaptionId = useId();
  const [dashboardData, setDashboardData] = useState(initialData || data);
  const [memberSearch, setMemberSearch] = useState("");
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
    user,
    weekRangeLabel,
    stats,
    weeklyScheduleStrip = [],
    weeklyLeaves = [],
    divisionMembers = [],
  } = dashboardData;

  const filteredMembers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return divisionMembers;
    return divisionMembers.filter(
      (member) =>
        member.fullName.toLowerCase().includes(q) ||
        member.email.toLowerCase().includes(q)
    );
  }, [divisionMembers, memberSearch]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredMembers.length / MEMBERS_PAGE_SIZE)
  );
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * MEMBERS_PAGE_SIZE;
  const paginatedMembers = filteredMembers.slice(
    startIndex,
    startIndex + MEMBERS_PAGE_SIZE
  );

  const totalActiveMembers =
    typeof stats.totalActiveMembers === "number"
      ? stats.totalActiveMembers
      : divisionMembers.length;
  const presentTodayCount =
    typeof stats.presentTodayCount === "number"
      ? stats.presentTodayCount
      : Math.max(0, totalActiveMembers - stats.membersOnLeaveThisWeek);
  const availabilityPercent =
    totalActiveMembers > 0
      ? Math.round((presentTodayCount / totalActiveMembers) * 100)
      : 100;

  const personalUsedQuota = Math.max(
    0,
    Number(
      (
        Number(stats.personalInitialQuota || 12) -
        Number(stats.personalRemainingQuota || 0)
      ).toFixed(1)
    )
  );

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
      setLiveStatus("Data Dashboard Ketua Divisi berhasil disegarkan.");
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

      {user.hasManagedDivision === false && (
        <div role="status" className="notice notice-warn">
          <Info aria-hidden="true" />
          <span>
            Akun Ketua Divisi Anda belum ditugaskan untuk memimpin divisi mana
            pun. Hubungi Administrator melalui Manajemen Divisi agar antrean
            verifikasi dan daftar anggota tampil di sini.
          </span>
        </div>
      )}

      {/* 1. METRIC STRIP DIVISI (4 Sel Arsip — Sel 1 adalah CTA ke Antrean Verifikasi) */}
      <div
        className="metric-strip"
        role="region"
        aria-label="Ringkasan Metrik Divisi"
      >
        <Link
          href="/approvals/leader"
          className="metric-cell group transition-colors duration-150 hover:bg-[var(--spruce-tint)]"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="metric-label">Menunggu Verifikasi Anda</span>
            <ArrowUpRight
              className="h-3.5 w-3.5 text-[var(--ochre)] transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              aria-hidden="true"
            />
          </div>
          <div className="metric-val text-[var(--ochre)]">
            {String(stats.pendingVerificationCount).padStart(2, "0")}
          </div>
          <div className="metric-note font-mono text-[11px] text-[var(--spruce)] group-hover:underline">
            Buka Antrean Tahap 1 &rarr;
          </div>
        </Link>

        <div className="metric-cell">
          <div className="metric-label">Pengajuan Masuk Divisi</div>
          <div className="metric-val">
            {String(stats.totalDivisionRequests).padStart(2, "0")}
          </div>
          <div className="metric-note truncate">
            {user.hasManagedDivision !== false
              ? `Divisi ${user.divisionName}`
              : "Belum ada divisi aktif"}
          </div>
        </div>

        <div className="metric-cell">
          <div className="metric-label">Anggota Cuti Minggu Ini</div>
          <div className="metric-val text-[var(--slate-blue)]">
            {String(stats.membersOnLeaveThisWeek).padStart(2, "0")}
          </div>
          <div className="metric-note mono text-[11px]">{weekRangeLabel}</div>
        </div>

        <div className="metric-cell">
          <div className="metric-label">Ketersediaan Tim Hari Ini</div>
          <div className="metric-val text-[var(--spruce)]">
            {availabilityPercent}%
          </div>
          <div className="metric-note mono text-[11px]">
            {presentTodayCount} dari {totalActiveMembers} anggota hadir
          </div>
        </div>
      </div>

      {/* 2. QUOTA LEDGER HERO PRIBADI KETUA DIVISI */}
      <section className="quota-hero" aria-label="Saldo Kuota Pribadi Ketua Divisi">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="panel-eyebrow !mb-0">
                Kuota Pribadi Ketua Divisi &bull; {user.divisionName}
              </span>
              {typeof user.isEligibleAnnualLeave === "boolean" && (
                <StatusBadge
                  status={
                    user.isEligibleAnnualLeave ? "Eligible" : "Belum Eligible"
                  }
                />
              )}
            </div>

            <div className="mt-1.5 font-serif text-[38px] font-semibold leading-none text-[var(--spruce)] tabular-nums sm:text-[42px]">
              {stats.personalRemainingQuota.toFixed(1)}{" "}
              <span className="font-sans text-[14px] font-normal text-[var(--ink-soft)]">
                dari {stats.personalInitialQuota.toFixed(1)} hari kerja
                &mdash; terpakai{" "}
                <strong className="mono font-semibold text-[var(--ochre)]">
                  {personalUsedQuota.toFixed(1)} hr
                </strong>
              </span>
            </div>

            <p className="mt-1.5 text-xs text-[var(--ink-soft)]">
              Pengajuan cuti pribadi Ketua Divisi diteruskan langsung ke antrean
              persetujuan final HRD.
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
            <Link href="/approvals/leader" className="btn btn-sm">
              <ClipboardCheck className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Verifikasi ({stats.pendingVerificationCount})</span>
            </Link>
            <Link href="/leaves/new" className="btn btn-primary btn-sm">
              <CalendarPlus className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Ajukan Cuti Saya</span>
            </Link>
          </div>
        </div>

        <QuotaPrecisionRuler
          total={stats.personalInitialQuota}
          remaining={stats.personalRemainingQuota}
          delta={0}
        />
      </section>

      {/* 3. GRID 12 KOLOM (5:7) — JADWAL CUTI MINGGU INI & LEDGER ANGGOTA DIVISI */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Kiri (5 Kolom): Jadwal Mingguan Sen-Jum + Daftar Cuti Minggu Ini */}
        <section className="panel flex flex-col lg:col-span-5">
          <div className="panel-head">
            <div>
              <span className="panel-eyebrow">Jadwal Mingguan Tim</span>
              <h2 className="panel-title">Anggota Cuti Minggu Ini</h2>
              <p className="panel-sub mono text-[11px]">{weekRangeLabel}</p>
            </div>
            <span className="tag tag-leader">
              {weeklyLeaves.length} Jadwal
            </span>
          </div>

          <div className="panel-body flex flex-1 flex-col gap-4">
            {/* Strip Mini Sen–Jum */}
            {weeklyScheduleStrip.length > 0 && (
              <div
                className="grid grid-cols-5 border border-[var(--rule-strong)] bg-[var(--paper)]"
                role="list"
                aria-label="Ringkasan jadwal cuti Senin sampai Jumat"
              >
                {weeklyScheduleStrip.map((day, idx) => {
                  const count = day.onLeave.length;
                  const ratioPct =
                    totalActiveMembers > 0
                      ? Math.round((count / totalActiveMembers) * 100)
                      : 0;
                  const isHighLoad = ratioPct > 30;
                  return (
                    <div
                      key={`${day.dayShort}-${day.dateNum}`}
                      role="listitem"
                      title={
                        count > 0
                          ? `${day.dayShort} ${day.dateNum}: ${day.onLeave.map((e) => e.name).join(", ")}`
                          : `${day.dayShort} ${day.dateNum}: Tim hadir penuh`
                      }
                      className={`px-2 py-2 text-center ${
                        idx < weeklyScheduleStrip.length - 1
                          ? "border-r border-[var(--rule)]"
                          : ""
                      } ${
                        day.isToday
                          ? "bg-[var(--spruce-tint)] shadow-[inset_0_2px_0_var(--spruce)]"
                          : ""
                      }`}
                    >
                      <p
                        className={`mono text-[10px] font-semibold ${
                          day.isToday
                            ? "text-[var(--spruce)]"
                            : "text-[var(--ink-soft)]"
                        }`}
                      >
                        {day.dayShort} {day.dateNum}
                      </p>
                      <p
                        className={`mono mt-1 text-[10px] font-semibold ${
                          isHighLoad
                            ? "text-[var(--terracotta)]"
                            : count > 0
                              ? "text-[var(--slate-blue)]"
                              : "text-[var(--spruce)]"
                        }`}
                      >
                        {count > 0 ? `${count} cuti` : "Penuh"}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Daftar Anggota Cuti Minggu Ini */}
            <div className="flex-1 space-y-2.5">
              {weeklyLeaves.length === 0 ? (
                <EmptyState
                  title="Tim hadir penuh minggu ini"
                  description="Tidak ada anggota divisi yang dijadwalkan cuti Approved pada minggu berjalan."
                />
              ) : (
                weeklyLeaves.map((item, idx) => (
                  <article
                    key={item.id}
                    className="border border-[var(--rule)] bg-[var(--paper)] p-3.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="avatar-sq !h-6 !w-6 !text-[10px]">
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                        <div>
                          <p className="text-[13px] font-semibold text-[var(--ink)]">
                            {item.employeeName}
                          </p>
                          <p className="text-xs text-[var(--ink-soft)]">
                            {item.leaveTypeName}
                          </p>
                        </div>
                      </div>
                      <StatusBadge status={item.status} />
                    </div>
                    <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--rule)] pt-2 text-xs text-[var(--ink-soft)]">
                      <span className="mono text-[11px]">
                        {item.periodLabel} ({item.totalDays.toFixed(1)} hr)
                      </span>
                      <span>
                        Handover:{" "}
                        <strong className="font-semibold text-[var(--ink)]">
                          {item.handoverName}
                        </strong>
                      </span>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        </section>

        {/* Kanan (7 Kolom): Daftar Seluruh Anggota Divisi (Swiss Ledger) */}
        <section className="panel flex flex-col overflow-hidden lg:col-span-7">
          <div className="panel-head">
            <div>
              <span className="panel-eyebrow">Direktori Unit Kerja</span>
              <h2 className="panel-title">
                Anggota Divisi ({divisionMembers.length} Orang)
              </h2>
              <p className="panel-sub">
                Ringkasan masa kerja, saldo kuota tahunan, dan status akun.
              </p>
            </div>
          </div>

          <div className="toolbar justify-between">
            <div className="relative w-full sm:w-64">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--ink-muted)]"
                aria-hidden="true"
              />
              <input
                type="search"
                value={memberSearch}
                onChange={(e) => {
                  setMemberSearch(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Cari nama atau email anggota..."
                aria-label="Cari anggota divisi"
                className="input !py-1.5 !pl-8 !pr-3 !text-xs"
              />
            </div>
            <span className="mono text-[11px] text-[var(--ink-muted)]">
              {filteredMembers.length} anggota
            </span>
          </div>

          {filteredMembers.length === 0 ? (
            <div className="panel-body">
              <EmptyState
                title={
                  memberSearch.trim()
                    ? "Anggota tidak ditemukan"
                    : "Belum ada anggota di divisi ini"
                }
                description={
                  memberSearch.trim()
                    ? `Tidak ada anggota divisi yang cocok dengan kata kunci "${memberSearch}".`
                    : "Admin belum menugaskan anggota karyawan ke dalam divisi Anda."
                }
              />
            </div>
          ) : (
            <>
              <div
                tabIndex={0}
                role="region"
                aria-labelledby={tableCaptionId}
                className="otium-responsive-table-wrap flex-1"
              >
                <table className="ledger otium-responsive-table !min-w-full text-left">
                  <caption id={tableCaptionId} className="visually-hidden">
                    Daftar seluruh anggota divisi beserta masa kerja, sisa kuota
                    tahunan, dan status akun
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col" className="row-idx">
                        #
                      </th>
                      <th scope="col">Nama Anggota</th>
                      <th scope="col">Masa Kerja</th>
                      <th scope="col">Sisa Kuota</th>
                      <th scope="col" className="text-right">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedMembers.map((member, idx) => (
                      <tr key={member.id}>
                        <td data-label="No" className="row-idx">
                          {String(startIndex + idx + 1).padStart(2, "0")}
                        </td>
                        <th scope="row" className="font-normal">
                          <p className="font-semibold text-[var(--ink)]">
                            {member.fullName}
                          </p>
                          <p className="mono text-[11px] text-[var(--ink-muted)]">
                            {member.email}
                          </p>
                        </th>
                        <td
                          data-label="Masa Kerja"
                          className="mono whitespace-nowrap text-xs text-[var(--ink-soft)]"
                        >
                          {member.tenureLabel}
                        </td>
                        <td
                          data-label="Sisa Kuota"
                          className="mono whitespace-nowrap text-xs font-semibold text-[var(--ink)]"
                        >
                          {member.isEligibleAnnualLeave ? (
                            <span className="text-[var(--spruce)]">
                              {member.remainingQuota.toFixed(1)} hr
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5">
                              <span className="text-[var(--ink-muted)]">
                                {member.remainingQuota.toFixed(1)}
                              </span>
                              <StatusBadge status="Belum Eligible" />
                            </span>
                          )}
                        </td>
                        <td
                          data-label="Status"
                          className="whitespace-nowrap text-right"
                        >
                          <StatusBadge status={member.accountStatus} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Footer Paginasi */}
              <div className="flex items-center justify-between border-t border-[var(--rule)] bg-[var(--paper)] px-5 py-3 text-xs text-[var(--ink-soft)]">
                <span className="mono text-[11px]">
                  Menampilkan{" "}
                  <strong className="font-semibold text-[var(--ink)]">
                    {startIndex + 1}&ndash;
                    {Math.min(
                      startIndex + MEMBERS_PAGE_SIZE,
                      filteredMembers.length
                    )}
                  </strong>{" "}
                  dari{" "}
                  <strong className="font-semibold text-[var(--ink)]">
                    {filteredMembers.length}
                  </strong>
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
        </section>
      </div>
    </div>
  );
}
