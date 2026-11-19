"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarCheck,
  CalendarClock,
  CalendarPlus,
  ClipboardCheck,
  FileSpreadsheet,
  Search,
  Users,
} from "lucide-react";
import StatsCard from "@/components/ui/StatsCard";
import StatusBadge from "@/components/ui/StatusBadge";
import EmptyState from "@/components/ui/EmptyState";

// Tampilan dashboard untuk role Ketua Divisi
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

  const filteredMembers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return divisionMembers;
    return divisionMembers.filter(
      (member) =>
        member.fullName.toLowerCase().includes(q) ||
        member.email.toLowerCase().includes(q)
    );
  }, [divisionMembers, memberSearch]);

  const totalMembers = divisionMembers.length;
  const presentTodayCount = Math.max(
    0,
    totalMembers - stats.membersOnLeaveThisWeek
  );
  const availabilityPercent =
    totalMembers > 0 ? Math.round((presentTodayCount / totalMembers) * 100) : 100;

  return (
    <div className="space-y-6">
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

      {/* Ringkasan metrik divisi & kuota pribadi */}
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
          subtitle="Membutuhkan keputusan Approve / Reject Anda"
          icon={<ClipboardCheck className="h-5 w-5" aria-hidden="true" />}
          variant="amber"
          href="/approvals/leader"
          actionLabel="Buka Antrean Verifikasi"
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

      {/* Strip jadwal cuti Senin-Jumat */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Strip Kehadiran &amp; Cuti Divisi Minggu Ini ({weekRangeLabel})
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Visualisasi hari kerja (Sen–Jum) untuk mencegah penumpukan jadwal
              cuti anggota.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-slate-50 px-3.5 py-2 text-xs">
            <span className="font-medium text-slate-600">
              Kapasitas Hadir Hari Ini:
            </span>
            <span className="font-bold text-emerald-700">
              {presentTodayCount}/{totalMembers} ({availabilityPercent}%)
            </span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-5">
          {weeklyScheduleStrip.map((day) => (
            <div
              key={`${day.dayShort}-${day.dateNum}`}
              className={`rounded-xl border p-3 transition ${
                day.isToday
                  ? "border-blue-300 bg-blue-50/50 ring-1 ring-blue-200"
                  : "border-slate-200/80 bg-slate-50/50"
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-bold ${
                    day.isToday ? "text-blue-700" : "text-slate-700"
                  }`}
                >
                  {day.dayShort}, {day.dateNum}
                </span>
                {day.isToday && (
                  <span className="rounded-full bg-blue-600 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                    Hari Ini
                  </span>
                )}
              </div>

              <div className="mt-2.5 min-h-[44px] space-y-1">
                {day.onLeave.length === 0 ? (
                  <p className="text-[11px] font-medium text-emerald-600">
                    Tim hadir penuh
                  </p>
                ) : (
                  day.onLeave.map((entry, idx) => (
                    <div
                      key={`${day.dateNum}-${idx}`}
                      className="flex items-center justify-between gap-1 rounded-md border border-sky-200 bg-white px-2 py-1 text-[11px]"
                    >
                      <span className="truncate font-semibold text-slate-800">
                        {entry.name}
                      </span>
                      <span className="shrink-0 text-[10px] text-sky-700">
                        {entry.type}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Detail anggota cuti minggu ini (kiri) & daftar semua anggota (kanan) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Detail Anggota Cuti Minggu Ini
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Informasi rekan pengganti (handover) untuk setiap cuti aktif.
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-700">
              {weeklyLeaves.length} Orang
            </span>
          </div>

          <div className="mt-4 flex-1 space-y-3">
            {weeklyLeaves.length === 0 ? (
              <EmptyState
                title="Tim hadir penuh minggu ini"
                description="Tidak ada anggota divisi yang dijadwalkan cuti pada minggu berjalan."
              />
            ) : (
              weeklyLeaves.map((item, idx) => (
                <article
                  key={item.id}
                  className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-xs font-bold text-white">
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
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/70 pt-2.5 text-xs text-slate-600">
                    <span>
                      {item.periodLabel} ({item.totalDays.toFixed(1)} Hari)
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

        {/* Daftar seluruh anggota divisi */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:col-span-7">
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

            {/* Cari anggota */}
            <div className="relative w-full sm:w-56">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="text"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
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
            <div className="overflow-x-auto">
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
                  {filteredMembers.map((member) => (
                    <tr
                      key={member.id}
                      className="transition hover:bg-slate-50/80"
                    >
                      <td className="whitespace-nowrap px-5 py-3">
                        <p className="font-semibold text-slate-900">
                          {member.fullName}
                        </p>
                        <p className="text-xs text-slate-500">{member.email}</p>
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
          )}
        </section>
      </div>
    </div>
  );
}
