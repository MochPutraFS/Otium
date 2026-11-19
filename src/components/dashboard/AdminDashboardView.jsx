"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Building2,
  CalendarRange,
  Clock,
  UserPlus,
  Users,
} from "lucide-react";
import StatsCard from "@/components/ui/StatsCard";
import StatusBadge from "@/components/ui/StatusBadge";
import EmptyState from "@/components/ui/EmptyState";

// Tampilan dashboard untuk role Admin
export default function AdminDashboardView({ data }) {
  const { periodLabel, stats, ineligibleEmployees } = data;
  const [selectedDivision, setSelectedDivision] = useState("Semua");

  const divisionOptions = useMemo(() => {
    const uniqueDivisions = Array.from(
      new Set(ineligibleEmployees.map((emp) => emp.divisionName))
    );
    return ["Semua", ...uniqueDivisions];
  }, [ineligibleEmployees]);

  const filteredEmployees = useMemo(() => {
    if (selectedDivision === "Semua") return ineligibleEmployees;
    return ineligibleEmployees.filter(
      (emp) => emp.divisionName === selectedDivision
    );
  }, [ineligibleEmployees, selectedDivision]);

  return (
    <div className="space-y-6">
      {/* Header dan tombol cepat */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              Dashboard Administrator
            </h2>
            <StatusBadge status="Admin" />
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Pantau status pengguna, pengajuan cuti lintas divisi, dan kelayakan
            masa kerja karyawan.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/admin/divisions"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <Building2 className="h-4 w-4 text-slate-500" aria-hidden="true" />
            Kelola Divisi
          </Link>
          <Link
            href="/admin/users"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm shadow-blue-600/20 transition hover:bg-blue-700"
          >
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            Tambah Pengguna
          </Link>
        </div>
      </div>

      {/* Ringkasan angka utama */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Pengguna"
          value={`${stats.activeUsers} Aktif`}
          subtitle={`${stats.inactiveUsers} akun berstatus Nonaktif`}
          icon={<Users className="h-5 w-5" aria-hidden="true" />}
          variant="blue"
          href="/admin/users"
          actionLabel="Kelola Pengguna"
        />
        <StatsCard
          title={`Pengajuan (${periodLabel})`}
          value={`${stats.monthlyRequests} Pengajuan`}
          subtitle="Total permohonan cuti bulan berjalan"
          icon={<CalendarRange className="h-5 w-5" aria-hidden="true" />}
          variant="emerald"
        />
        <StatsCard
          title="Pending Approval"
          value={`${stats.pendingApprovals} Pengajuan`}
          subtitle="Berstatus Pending & Approved by Leader"
          icon={<Clock className="h-5 w-5" aria-hidden="true" />}
          variant="amber"
        />
        <StatsCard
          title="Total Divisi"
          value={`${stats.totalDivisions} Divisi`}
          subtitle="Unit kerja terdaftar di sistem"
          icon={<Building2 className="h-5 w-5" aria-hidden="true" />}
          variant="purple"
          href="/admin/divisions"
          actionLabel="Lihat Semua Divisi"
        />
      </div>

      {/* Tabel karyawan dengan masa kerja kurang dari 1 tahun */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <AlertTriangle
                  className="h-4 w-4 text-amber-600"
                  aria-hidden="true"
                />
                <h3 className="text-sm font-semibold text-slate-900">
                  Daftar Karyawan Masa Kerja &lt; 1 Tahun (Belum Eligible Cuti
                  Tahunan)
                </h3>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Karyawan di bawah ini diblokir otomatis dari pengajuan Cuti
                Tahunan, namun tetap dapat mengajukan Cuti Sakit atau Cuti
                Khusus lainnya.
              </p>
            </div>
            <span className="inline-flex w-fit items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
              {filteredEmployees.length} dari {ineligibleEmployees.length}{" "}
              Karyawan
            </span>
          </div>

          {/* Filter divisi */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
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

        {filteredEmployees.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="Tidak ada karyawan pada filter divisi ini"
              description="Semua karyawan di divisi terpilih telah memenuhi masa kerja minimal 1 tahun."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">Nama &amp; Email</th>
                  <th className="px-5 py-3.5">Role</th>
                  <th className="px-5 py-3.5">Divisi</th>
                  <th className="px-5 py-3.5">Tanggal Bergabung</th>
                  <th className="px-5 py-3.5">Progres Menuju 1 Tahun</th>
                  <th className="px-5 py-3.5 text-right">Status Kelayakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredEmployees.map((emp) => (
                  <tr
                    key={emp.id}
                    className="transition hover:bg-slate-50/80"
                  >
                    <td className="whitespace-nowrap px-5 py-3.5">
                      <p className="font-semibold text-slate-900">
                        {emp.fullName}
                      </p>
                      <p className="text-xs text-slate-500">{emp.email}</p>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5">
                      <StatusBadge status={emp.role} />
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-xs font-medium text-slate-700">
                      {emp.divisionName}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-xs text-slate-600">
                      {emp.joinDate}
                    </td>
                    <td className="min-w-[190px] px-5 py-3.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800">
                          {emp.tenureLabel}
                        </span>
                        <span className="font-medium text-slate-400">
                          {emp.tenureProgressPercent}%
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-amber-500 transition-all duration-300"
                          style={{ width: `${emp.tenureProgressPercent}%` }}
                        />
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-right">
                      <StatusBadge status={emp.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
