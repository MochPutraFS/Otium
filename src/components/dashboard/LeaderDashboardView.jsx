"use client";

import { useEffect, useId, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CalendarCheck,
  CalendarClock,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  FileSpreadsheet,
  Info,
  RefreshCw,
  Search,
  Users,
} from "lucide-react";
import StatsCard from "@/components/ui/StatsCard";
import StatusBadge from "@/components/ui/StatusBadge";
import EmptyState from "@/components/ui/EmptyState";

const MEMBERS_PAGE_SIZE = 5;

// Tampilan dashboard untuk role Ketua Divisi (Pure Production Live Data — Rasio 5:7)
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
    weeklyLeaves,
    divisionMembers,
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

  const personalQuotaPercent =
    stats.personalInitialQuota > 0
      ? Math.round(
          (stats.personalRemainingQuota / stats.personalInitialQuota) * 100
        )
      : 0;

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

      {/* Header dan tombol cepat */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              Dashboard Ketua Divisi &mdash; {user.divisionName}
            </h2>
            <StatusBadge status={user.role} />
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Verifikasi pengajuan cuti bawahan Tahap 1, pantau kalender tim
            minggu ini, dan kelola cuti pribadi Anda.
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
            href="/approvals/leader"
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-900 transition-colors duration-150 hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 tabular-nums"
          >
            <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
            Verifikasi ({stats.pendingVerificationCount})
          </Link>
          <Link
            href="/leaves/new"
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white transition-colors duration-150 hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
          >
            <CalendarPlus className="h-4 w-4" aria-hidden="true" />
            Ajukan Cuti Saya
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

      {user.hasManagedDivision === false && (
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900"
        >
          <Info
            className="mt-0.5 h-4 w-4 shrink-0 text-amber-700"
            aria-hidden="true"
          />
          <span>
            Akun Ketua Divisi Anda belum ditugaskan untuk memimpin divisi mana
            pun. Hubungi Administrator melalui Manajemen Divisi agar antrean
            verifikasi dan daftar anggota tampil di sini.
          </span>
        </div>
      )}

      {/* Ringkasan metrik divisi & kuota pribadi (Kartu 2 = Clickable CTA Card) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Pengajuan Masuk Divisi"
          value={`${stats.totalDivisionRequests} Pengajuan`}
          subtitle={
            user.hasManagedDivision !== false
              ? `Seluruh anggota Divisi ${user.divisionName}`
              : "Belum ada divisi aktif"
          }
          icon={<FileSpreadsheet className="h-5 w-5" aria-hidden="true" />}
          variant="blue"
        />
        <StatsCard
          title="Pending Verifikasi Tahap 1"
          value={`${stats.pendingVerificationCount} Menunggu`}
          subtitle="Klik untuk memproses antrean bawahan"
          icon={<ClipboardCheck className="h-5 w-5" aria-hidden="true" />}
          variant="amber"
          href="/approvals/leader"
          actionLabel="Buka Antrean Verifikasi"
          clickableCard
        />
        <StatsCard
          title="Anggota Cuti Minggu Ini"
          value={`${stats.membersOnLeaveThisWeek} Anggota`}
          subtitle={`Periode ${weekRangeLabel}`}
          icon={<CalendarClock className="h-5 w-5" aria-hidden="true" />}
          variant="sky"
        />
        <StatsCard
          title="Sisa Kuota Pribadi Saya"
          value={`${stats.personalRemainingQuota.toFixed(1)} Hari`}
          subtitle={`Dari kuota dasar ${stats.personalInitialQuota.toFixed(1)} Hari/tahun`}
          icon={<CalendarCheck className="h-5 w-5" aria-hidden="true" />}
          variant="emerald"
          badge={
            typeof user.isEligibleAnnualLeave === "boolean" ? (
              <StatusBadge
                status={
                  user.isEligibleAnnualLeave ? "Eligible" : "Belum Eligible"
                }
              />
            ) : null
          }
          progressPercent={personalQuotaPercent}
          progressVariant={
            user.isEligibleAnnualLeave === false ? "amber" : "emerald"
          }
          progressLabel={`Sisa kuota pribadi ${stats.personalRemainingQuota.toFixed(1)} dari ${stats.personalInitialQuota.toFixed(1)} hari`}
        />
      </div>

      {/* Grid 12 Kolom Rasio 5:7 — Cuti Minggu Ini (kiri) & Daftar Anggota Divisi (kanan) */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <section className="flex flex-col rounded-xl border border-stone-200 bg-white p-5 lg:col-span-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Anggota Cuti Minggu Ini
              </h3>
              <p className="mt-0.5 text-xs text-slate-600 tabular-nums">
                {weekRangeLabel} &middot; Hadir hari ini{" "}
                <strong className="text-emerald-700">
                  {presentTodayCount}/{totalActiveMembers} ({availabilityPercent}
                  %)
                </strong>
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-800 tabular-nums">
              {weeklyLeaves.length} Jadwal
            </span>
          </div>

          {/* Strip mini Sen-Jum terintegrasi */}
          {weeklyScheduleStrip.length > 0 && (
            <div className="mt-3.5 grid grid-cols-5 gap-1.5">
              {weeklyScheduleStrip.map((day) => {
                const count = day.onLeave.length;
                return (
                  <div
                    key={`${day.dayShort}-${day.dateNum}`}
                    title={
                      count > 0
                        ? `${day.dayShort} ${day.dateNum}: ${day.onLeave.map((e) => e.name).join(", ")}`
                        : `${day.dayShort} ${day.dateNum}: Tim hadir penuh`
                    }
                    className={`rounded-lg border px-2 py-1.5 text-center tabular-nums ${
                      day.isToday
                        ? "border-blue-300 bg-blue-50/70"
                        : "border-stone-200 bg-[#FAF9F6]"
                    }`}
                  >
                    <p
                      className={`text-[10px] font-bold ${
                        day.isToday ? "text-blue-800" : "text-slate-700"
                      }`}
                    >
                      {day.dayShort} {day.dateNum}
                    </p>
                    <p
                      className={`mt-0.5 text-[10px] font-semibold ${
                        count > 0 ? "text-sky-800" : "text-emerald-700"
                      }`}
                    >
                      {count > 0 ? `${count} cuti` : "Penuh"}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-4 flex-1 space-y-2.5">
            {weeklyLeaves.length === 0 ? (
              <EmptyState
                title="Tim hadir penuh minggu ini"
                description="Tidak ada anggota divisi yang dijadwalkan cuti Approved pada minggu berjalan."
              />
            ) : (
              weeklyLeaves.map((item, idx) => (
                <article
                  key={item.id}
                  className="rounded-lg border border-stone-200 bg-[#FAF9F6] p-3.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-900 text-[11px] font-bold text-white tabular-nums">
                        {idx + 1}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {item.employeeName}
                        </p>
                        <p className="text-xs font-medium text-blue-700">
                          {item.leaveTypeName}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                  <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-stone-200/80 pt-2 text-xs text-slate-600 tabular-nums">
                    <span>
                      {item.periodLabel} ({item.totalDays.toFixed(1)} Hr)
                    </span>
                    <span>
                      Handover:{" "}
                      <strong className="text-slate-900">
                        {item.handoverName}
                      </strong>
                    </span>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        {/* Daftar seluruh anggota divisi (7/12 kolom + mini search + paginasi 5 baris) */}
        <section className="flex flex-col overflow-hidden rounded-xl border border-stone-200 bg-white lg:col-span-7">
          <div className="flex flex-col gap-3 border-b border-stone-200 bg-[#FAF9F6] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-slate-700" aria-hidden="true" />
              <div>
                <h3 className="text-sm font-semibold text-slate-900 tabular-nums">
                  Daftar Seluruh Anggota Divisi ({divisionMembers.length} Orang)
                </h3>
                <p className="text-xs text-slate-600">
                  Ringkasan masa kerja, saldo kuota tahunan, dan status aktif.
                </p>
              </div>
            </div>

            {/* Mini search anggota */}
            <div className="relative w-full sm:w-52">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500"
                aria-hidden="true"
              />
              <input
                type="search"
                value={memberSearch}
                onChange={(e) => {
                  setMemberSearch(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Cari nama anggota..."
                aria-label="Cari anggota divisi"
                className="w-full rounded-lg border border-stone-300 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-500 focus:border-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20"
              />
            </div>
          </div>

          {filteredMembers.length === 0 ? (
            <div className="p-6">
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
                className="otium-responsive-table-wrap flex-1 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-slate-900"
              >
                <table className="otium-responsive-table text-left text-sm">
                  <caption id={tableCaptionId} className="visually-hidden">
                    Daftar seluruh anggota divisi beserta masa kerja, sisa kuota
                    tahunan, dan status akun
                  </caption>
                  <thead className="border-b border-stone-200 bg-[#FAF9F6] text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-600">
                    <tr>
                      <th scope="col" className="px-5 py-3">
                        Nama Anggota
                      </th>
                      <th scope="col" className="px-5 py-3">
                        Masa Kerja
                      </th>
                      <th scope="col" className="px-5 py-3">
                        Sisa Kuota
                      </th>
                      <th scope="col" className="px-5 py-3 text-right">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 bg-white">
                    {paginatedMembers.map((member) => (
                      <tr
                        key={member.id}
                        className="transition-colors duration-150 hover:bg-[#FAF9F6]"
                      >
                        <th
                          scope="row"
                          className="whitespace-nowrap px-5 py-3 text-left font-normal"
                        >
                          <p className="font-semibold text-slate-900">
                            {member.fullName}
                          </p>
                          <p className="text-xs text-slate-600">
                            {member.email}
                          </p>
                        </th>
                        <td
                          data-label="Masa Kerja"
                          className="whitespace-nowrap px-5 py-3 text-xs text-slate-700 tabular-nums"
                        >
                          {member.tenureLabel}
                        </td>
                        <td
                          data-label="Sisa Kuota"
                          className="whitespace-nowrap px-5 py-3 text-xs font-semibold text-slate-900 tabular-nums"
                        >
                          {member.isEligibleAnnualLeave ? (
                            <span>{member.remainingQuota.toFixed(1)} Hari</span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5">
                              <span className="text-slate-600">
                                {member.remainingQuota.toFixed(1)}
                              </span>
                              <StatusBadge status="Belum Eligible" />
                            </span>
                          )}
                        </td>
                        <td
                          data-label="Status"
                          className="whitespace-nowrap px-5 py-3 text-right"
                        >
                          <StatusBadge status={member.accountStatus} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Footer Paginasi 5 Baris */}
              <div className="flex items-center justify-between border-t border-stone-200 bg-[#FAF9F6] px-5 py-3 text-xs text-slate-600 tabular-nums">
                <span>
                  Menampilkan{" "}
                  <strong className="font-semibold text-slate-900">
                    {startIndex + 1}&ndash;
                    {Math.min(
                      startIndex + MEMBERS_PAGE_SIZE,
                      filteredMembers.length
                    )}
                  </strong>{" "}
                  dari{" "}
                  <strong className="font-semibold text-slate-900">
                    {filteredMembers.length}
                  </strong>{" "}
                  anggota
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
        </section>
      </div>
    </div>
  );
}
