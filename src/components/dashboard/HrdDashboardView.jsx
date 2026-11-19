"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Building2,
  CalendarRange,
  CheckSquare,
  UserCheck,
} from "lucide-react";
import StatsCard from "@/components/ui/StatsCard";
import StatusBadge from "@/components/ui/StatusBadge";
import EmptyState from "@/components/ui/EmptyState";

// Tampilan dashboard untuk role HRD
export default function HrdDashboardView({ data }) {
  const { periodLabel, stats, monthlyApprovedLeaves, divisionsSummary } = data;
  const [selectedDivision, setSelectedDivision] = useState("Semua");

  const divisionOptions = useMemo(() => {
    const names = divisionsSummary.map((div) => div.name);
    return ["Semua", ...names];
  }, [divisionsSummary]);

  const filteredLeaves = useMemo(() => {
    if (selectedDivision === "Semua") return monthlyApprovedLeaves;
    return monthlyApprovedLeaves.filter(
      (item) => item.divisionName === selectedDivision
    );
  }, [monthlyApprovedLeaves, selectedDivision]);

  return (
    <div className="space-y-6">
      {/* Header dan tombol menuju antrean final */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              Dashboard HRD (Final Approver)
            </h2>
            <StatusBadge status="HRD" />
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Tinjau antrean persetujuan final lintas divisi, pantau jadwal cuti
            karyawan bulan {periodLabel}, dan kapasitas tiap divisi.
          </p>
        </div>

        <Link
          href="/approvals/hrd"
          className="inline-flex w-fit items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm shadow-blue-600/20 transition hover:bg-blue-700"
        >
          <CheckSquare className="h-4 w-4" aria-hidden="true" />
          Ke Antrean Final Approval ({stats.pendingFinalApproval})
        </Link>
      </div>

      {/* Ringkasan metrik perusahaan */}
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
          subtitle="Approved by Leader + cuti Ketua Divisi"
          icon={<CheckSquare className="h-5 w-5" aria-hidden="true" />}
          variant="amber"
          href="/approvals/hrd"
          actionLabel="Proses Final Approval"
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
          subtitle={`${stats.activeEmployees} karyawan aktif terdaftar`}
          icon={<Building2 className="h-5 w-5" aria-hidden="true" />}
          variant="purple"
        />
      </div>

      {/* Tabel karyawan yang cuti bulan ini */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Daftar Karyawan yang Sedang / Akan Cuti Bulan Ini
              </h3>
              <p className="text-xs text-slate-500">
                Menampilkan jadwal cuti berstatus Final Approved periode{" "}
                {periodLabel}.
              </p>
            </div>
            <StatusBadge status="Approved" />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {divisionOptions.map((divName) => {
              const active = divName === selectedDivision;
              return (
                <button
                  key={divName}
                  type="button"
                  onClick={() => setSelectedDivision(divName)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    active
                      ? "bg-slate-900 text-white shadow-sm"
                      : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  {divName}
                </button>
              );
            })}
          </div>
        </div>

        {filteredLeaves.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="Belum ada jadwal cuti Approved di divisi ini"
              description="Pilih filter divisi lain untuk melihat jadwal cuti karyawan di unit kerja lainnya."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">Nama Karyawan</th>
                  <th className="px-5 py-3.5">Divisi</th>
                  <th className="px-5 py-3.5">Jenis Cuti</th>
                  <th className="px-5 py-3.5">Periode Cuti</th>
                  <th className="px-5 py-3.5">Durasi</th>
                  <th className="px-5 py-3.5">Rekan Pengganti</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredLeaves.map((item) => (
                  <tr
                    key={item.id}
                    className="transition hover:bg-slate-50/80"
                  >
                    <td className="whitespace-nowrap px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">
                          {item.employeeName}
                        </span>
                        {item.role === "Ketua Divisi" && (
                          <StatusBadge status="Ketua Divisi" />
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-xs font-medium text-slate-700">
                      {item.divisionName}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-xs text-slate-700">
                      {item.leaveTypeName}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-xs text-slate-600">
                      {item.periodLabel}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-xs font-semibold text-slate-900">
                      {item.totalDays.toFixed(1)} Hari
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-xs text-slate-600">
                      {item.handoverName}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Tabel ringkasan divisi dan rasio kehadiran */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h3 className="text-sm font-semibold text-slate-900">
            Daftar Divisi Perusahaan &amp; Rasio Ketersediaan Tim
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Monitoring jumlah anggota aktif, rasio kehadiran harian, dan total
            pengajuan cuti per unit kerja.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3.5">Nama Divisi</th>
                <th className="px-5 py-3.5">Ketua Divisi</th>
                <th className="px-5 py-3.5">Ketersediaan Tim</th>
                <th className="px-5 py-3.5">Sedang Cuti</th>
                <th className="px-5 py-3.5 text-right">Cuti Bulan Ini</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
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
                    ? "bg-emerald-500"
                    : availPercent >= 60
                      ? "bg-sky-500"
                      : "bg-amber-500";

                return (
                  <tr
                    key={div.id}
                    className="transition hover:bg-slate-50/80"
                  >
                    <td className="whitespace-nowrap px-5 py-3.5 font-semibold text-slate-900">
                      {div.name}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-xs font-medium text-slate-700">
                      {div.leaderName}
                    </td>
                    <td className="min-w-[200px] px-5 py-3.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700">
                          {availableCount}/{div.activeMembers} Hadir
                        </span>
                        <span className="font-medium text-slate-500">
                          {availPercent}%
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${barTone}`}
                          style={{ width: `${availPercent}%` }}
                        />
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-xs">
                      {div.currentlyOnLeave > 0 ? (
                        <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-700">
                          {div.currentlyOnLeave} Orang
                        </span>
                      ) : (
                        <span className="text-slate-400">0 Orang</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-right text-xs font-semibold text-slate-800">
                      {div.monthlyLeaveCount} Pengajuan
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
