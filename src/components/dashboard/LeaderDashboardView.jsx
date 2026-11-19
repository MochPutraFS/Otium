"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarCheck,
  CalendarClock,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  FileSpreadsheet,
  Search,
  Users,
} from "lucide-react";
import StatsCard from "@/components/ui/StatsCard";
import StatusBadge from "@/components/ui/StatusBadge";
import EmptyState from "@/components/ui/EmptyState";

const MEMBERS_PAGE_SIZE = 5;

// Tampilan dashboard untuk role Ketua Divisi (Rasio 5:7 ringkas + paginasi 5 baris)
export default function LeaderDashboardView({ data }) {
  const {
    user,
    weekRangeLabel,
    stats,
    weeklyScheduleStrip = [],
    weeklyLeaves,
    divisionMembers,
  } = data;

  const [memberSearch, setMemberSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

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

  const totalMembers = divisionMembers.length;
  const presentTodayCount = Math.max(
    0,
    totalMembers - stats.membersOnLeaveThisWeek
  );
  const availabilityPercent =
    totalMembers > 0 ? Math.round((presentTodayCount / totalMembers) * 100) : 100;

  return (
    <div className="space-y-5">
      {/* Header dan tombol cepat */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              Dashboard Ketua Divisi &mdash; {user.divisionName}
            </h2>
            <StatusBadge status={user.role} />
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Verifikasi pengajuan cuti bawahan Tahap 1, pantau kalender tim
            minggu ini, dan kelola cuti pribadi Anda.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/approvals/leader"
            className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-amber-700"
          >
            <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
            Verifikasi ({stats.pendingVerificationCount})
          </Link>
          <Link
            href="/leaves/new"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm shadow-blue-600/20 transition hover:bg-blue-700"
          >
            <CalendarPlus className="h-4 w-4" aria-hidden="true" />
            Ajukan Cuti Saya
          </Link>
        </div>
      </div>

      {/* Ringkasan metrik divisi & kuota pribadi (Kartu 2 = Clickable CTA Card) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Pengajuan Masuk Divisi"
          value={`${stats.totalDivisionRequests} Pengajuan`}
          subtitle={`Seluruh anggota Divisi ${user.divisionName}`}
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
        />
      </div>

      {/* Grid 12 Kolom Rasio 5:7 — Cuti Minggu Ini (kiri) & Daftar Anggota Divisi (kanan) */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <section className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Anggota Cuti Minggu Ini
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                {weekRangeLabel} &middot; Hadir hari ini{" "}
                <strong className="text-emerald-700">
                  {presentTodayCount}/{totalMembers} ({availabilityPercent}%)
                </strong>
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-700">
              {weeklyLeaves.length} Orang
            </span>
          </div>

          {/* Strip mini Sen-Jum terintegrasi (tanpa blok penuh terpisah) */}
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
                    className={`rounded-lg border px-2 py-1.5 text-center ${
                      day.isToday
                        ? "border-blue-300 bg-blue-50/70"
                        : "border-slate-200/80 bg-slate-50/70"
                    }`}
                  >
                    <p
                      className={`text-[10px] font-bold ${
                        day.isToday ? "text-blue-700" : "text-slate-600"
                      }`}
                    >
                      {day.dayShort} {day.dateNum}
                    </p>
                    <p
                      className={`mt-0.5 text-[10px] font-semibold ${
                        count > 0 ? "text-sky-700" : "text-emerald-600"
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
                description="Tidak ada anggota divisi yang dijadwalkan cuti pada minggu berjalan."
              />
            ) : (
              weeklyLeaves.map((item, idx) => (
                <article
                  key={item.id}
                  className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-[11px] font-bold text-white">
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
                  <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/70 pt-2 text-xs text-slate-600">
                    <span>
                      {item.periodLabel} ({item.totalDays.toFixed(1)} Hr)
                    </span>
                    <span>
                      Handover:{" "}
                      <strong className="text-slate-800">
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
        <section className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:col-span-7">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" aria-hidden="true" />
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Daftar Seluruh Anggota Divisi ({divisionMembers.length} Orang)
                </h3>
                <p className="text-xs text-slate-500">
                  Ringkasan masa kerja, saldo kuota tahunan, dan status aktif.
                </p>
              </div>
            </div>

            {/* Mini search anggota */}
            <div className="relative w-full sm:w-52">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="text"
                value={memberSearch}
                onChange={(e) => {
                  setMemberSearch(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Cari nama anggota..."
                aria-label="Cari anggota divisi"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          {filteredMembers.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="Anggota tidak ditemukan"
                description={`Tidak ada anggota divisi yang cocok dengan kata kunci "${memberSearch}".`}
              />
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-5 py-3">Nama Anggota</th>
                      <th className="px-5 py-3">Masa Kerja</th>
                      <th className="px-5 py-3">Sisa Kuota</th>
                      <th className="px-5 py-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {paginatedMembers.map((member) => (
                      <tr
                        key={member.id}
                        className="transition hover:bg-slate-50/80"
                      >
                        <td className="whitespace-nowrap px-5 py-3">
                          <p className="font-semibold text-slate-900">
                            {member.fullName}
                          </p>
                          <p className="text-xs text-slate-500">
                            {member.email}
                          </p>
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 text-xs text-slate-700">
                          {member.tenureLabel}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 text-xs font-semibold text-slate-900">
                          {member.isEligibleAnnualLeave ? (
                            <span>{member.remainingQuota.toFixed(1)} Hari</span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5">
                              <span className="text-slate-400">
                                {member.remainingQuota.toFixed(1)}
                              </span>
                              <StatusBadge status="Belum Eligible" />
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 text-right">
                          <StatusBadge status={member.accountStatus} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Footer Paginasi 5 Baris */}
              <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/60 px-5 py-3 text-xs text-slate-500">
                <span>
                  Menampilkan{" "}
                  <strong className="font-semibold text-slate-700">
                    {startIndex + 1}&ndash;
                    {Math.min(
                      startIndex + MEMBERS_PAGE_SIZE,
                      filteredMembers.length
                    )}
                  </strong>{" "}
                  dari{" "}
                  <strong className="font-semibold text-slate-700">
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
                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                  <span className="px-1.5 font-medium text-slate-700">
                    {safePage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={safePage >= totalPages}
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    aria-label="Halaman berikutnya"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
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
