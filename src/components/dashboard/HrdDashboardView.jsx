"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Building2,
  CalendarRange,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  UserCheck,
} from "lucide-react";
import StatsCard from "@/components/ui/StatsCard";
import StatusBadge from "@/components/ui/StatusBadge";
import EmptyState from "@/components/ui/EmptyState";

const LEAVES_PAGE_SIZE = 5;

// Tampilan dashboard untuk role HRD (1 Tabbed Card terpadu tanpa tumpukan 2 tabel)
export default function HrdDashboardView({ data }) {
  const { periodLabel, stats, monthlyApprovedLeaves, divisionsSummary } = data;
  const [activeTab, setActiveTab] = useState("leaves");
  const [selectedDivision, setSelectedDivision] = useState("Semua");
  const [currentPage, setCurrentPage] = useState(1);

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

  return (
    <div className="space-y-5">
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
          subtitle={`${stats.activeEmployees} karyawan aktif terdaftar`}
          icon={<Building2 className="h-5 w-5" aria-hidden="true" />}
          variant="purple"
        />
      </div>

      {/* Tabbed Card Terpadu: Sedang Cuti Bulan Ini | Ringkasan Divisi */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 pt-4 pb-3.5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div
              role="tablist"
              aria-label="Monitoring cuti dan divisi HRD"
              className="inline-flex w-fit rounded-xl border border-slate-200 bg-slate-100/80 p-1"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "leaves"}
                onClick={() => setActiveTab("leaves")}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                  activeTab === "leaves"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Sedang Cuti Bulan Ini ({monthlyApprovedLeaves.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "divisions"}
                onClick={() => setActiveTab("divisions")}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                  activeTab === "divisions"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Ringkasan Divisi ({divisionsSummary.length})
              </button>
            </div>

            {activeTab === "leaves" ? (
              <StatusBadge status="Approved" />
            ) : (
              <span className="text-xs font-medium text-slate-500">
                Rasio ketersediaan tim lintas unit kerja
              </span>
            )}
          </div>

          {activeTab === "leaves" && (
            <div className="flex flex-wrap items-center gap-1.5">
              {divisionOptions.map((divName) => {
                const active = divName === selectedDivision;
                return (
                  <button
                    key={divName}
                    type="button"
                    onClick={() => {
                      setSelectedDivision(divName);
                      setCurrentPage(1);
                    }}
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
          )}
        </div>

        {/* Konten Tab 1: Daftar Karyawan Cuti Bulan Ini (Maks 5 baris/halaman) */}
        {activeTab === "leaves" ? (
          filteredLeaves.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="Belum ada jadwal cuti Approved di divisi ini"
                description="Pilih filter divisi lain untuk melihat jadwal cuti karyawan di unit kerja lainnya."
              />
            </div>
          ) : (
            <>
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
                    {paginatedLeaves.map((item) => (
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

              <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/60 px-5 py-3 text-xs text-slate-500">
                <span>
                  Menampilkan{" "}
                  <strong className="font-semibold text-slate-700">
                    {startIndex + 1}&ndash;
                    {Math.min(
                      startIndex + LEAVES_PAGE_SIZE,
                      filteredLeaves.length
                    )}
                  </strong>{" "}
                  dari{" "}
                  <strong className="font-semibold text-slate-700">
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
          )
        ) : (
          /* Konten Tab 2: Daftar Divisi Perusahaan & Rasio Ketersediaan Tim */
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
        )}
      </section>
    </div>
  );
}
