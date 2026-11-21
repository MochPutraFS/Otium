"use client";

import { useEffect, useId, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  Building2,
  CalendarRange,
  Clock,
  RefreshCw,
  UserPlus,
  Users,
} from "lucide-react";
import StatsCard from "@/components/ui/StatsCard";
import StatusBadge from "@/components/ui/StatusBadge";
import EmptyState from "@/components/ui/EmptyState";

// Tampilan dashboard untuk role Admin (Pure Production Live Data)
export default function AdminDashboardView({ initialData, data }) {
  const tableCaptionId = useId();
  const [dashboardData, setDashboardData] = useState(initialData || data);
  const [selectedDivision, setSelectedDivision] = useState("Semua");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState("");
  const [liveStatus, setLiveStatus] = useState("");

  useEffect(() => {
    if (initialData) {
      setDashboardData(initialData);
    }
  }, [initialData]);

  const { periodLabel, stats, ineligibleEmployees } = dashboardData;

  const divisionOptions = useMemo(() => {
    const uniqueDivisions = Array.from(
      new Set(ineligibleEmployees.map((emp) => emp.divisionName))
    );
    return ["Semua", ...uniqueDivisions];
  }, [ineligibleEmployees]);

  const activeDivision = divisionOptions.includes(selectedDivision)
    ? selectedDivision
    : "Semua";

  const filteredEmployees = useMemo(() => {
    if (activeDivision === "Semua") return ineligibleEmployees;
    return ineligibleEmployees.filter(
      (emp) => emp.divisionName === activeDivision
    );
  }, [ineligibleEmployees, activeDivision]);

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
      setLiveStatus("Data Dashboard Administrator berhasil disegarkan.");
    } catch {
      setRefreshError("Koneksi terputus saat menyegarkan data dashboard.");
    } finally {
      setIsRefreshing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="visually-hidden" role="status" aria-live="polite">
        {liveStatus}
      </div>

      {/* Header dan tombol cepat */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              Dashboard Administrator
            </h2>
            <StatusBadge status="Admin" />
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Pantau status pengguna, pengajuan cuti lintas divisi, dan kelayakan
            masa kerja karyawan secara realtime.
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
            href="/admin/divisions"
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 transition-colors duration-150 hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
          >
            <Building2 className="h-4 w-4 text-slate-600" aria-hidden="true" />
            Kelola Divisi
          </Link>
          <Link
            href="/admin/users"
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white transition-colors duration-150 hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
          >
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            Tambah Pengguna
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
      <section className="overflow-hidden rounded-xl border border-stone-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-stone-200 bg-[#FAF9F6] px-5 py-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <AlertTriangle
                  className="h-4 w-4 text-amber-700"
                  aria-hidden="true"
                />
                <h3 className="text-sm font-semibold text-slate-900">
                  Daftar Karyawan Masa Kerja &lt; 1 Tahun (Belum Eligible Cuti
                  Tahunan)
                </h3>
              </div>
              <p className="mt-1 text-xs text-slate-600">
                Karyawan di bawah ini diblokir otomatis dari pengajuan Cuti
                Tahunan, namun tetap dapat mengajukan Cuti Sakit atau Cuti
                Khusus lainnya.
              </p>
            </div>
            <span className="inline-flex w-fit items-center rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900 tabular-nums">
              {filteredEmployees.length} dari {ineligibleEmployees.length}{" "}
              Karyawan
            </span>
          </div>

          {/* Filter divisi */}
          {divisionOptions.length > 1 && (
            <div
              className="flex flex-wrap items-center gap-1.5 pt-1"
              role="group"
              aria-label="Filter divisi karyawan belum eligible"
            >
              {divisionOptions.map((divName) => {
                const active = divName === activeDivision;
                return (
                  <button
                    key={divName}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setSelectedDivision(divName)}
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

        {filteredEmployees.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="Tidak ada karyawan dengan masa kerja < 1 tahun"
              description={
                activeDivision === "Semua"
                  ? "Seluruh karyawan aktif di sistem telah memenuhi masa kerja minimal 1 tahun untuk Cuti Tahunan."
                  : `Semua karyawan aktif di divisi ${activeDivision} telah memenuhi masa kerja minimal 1 tahun.`
              }
            />
          </div>
        ) : (
          <div
            tabIndex={0}
            role="region"
            aria-labelledby={tableCaptionId}
            className="otium-responsive-table-wrap focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-slate-900"
          >
            <table className="otium-responsive-table text-left text-sm">
              <caption id={tableCaptionId} className="visually-hidden">
                Daftar karyawan aktif dengan masa kerja kurang dari 1 tahun yang
                belum eligible Cuti Tahunan
              </caption>
              <thead className="border-b border-stone-200 bg-[#FAF9F6] text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-600">
                <tr>
                  <th scope="col" className="px-5 py-3">
                    Nama &amp; Email
                  </th>
                  <th scope="col" className="px-5 py-3">
                    Role
                  </th>
                  <th scope="col" className="px-5 py-3">
                    Divisi
                  </th>
                  <th scope="col" className="px-5 py-3">
                    Tanggal Bergabung
                  </th>
                  <th scope="col" className="px-5 py-3">
                    Progres Menuju 1 Tahun
                  </th>
                  <th scope="col" className="px-5 py-3 text-right">
                    Status Kelayakan
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 bg-white">
                {filteredEmployees.map((emp) => (
                  <tr
                    key={emp.id}
                    className="transition-colors duration-150 hover:bg-[#FAF9F6]"
                  >
                    <th
                      scope="row"
                      className="whitespace-nowrap px-5 py-3.5 text-left font-normal"
                    >
                      <p className="font-semibold text-slate-900">
                        {emp.fullName}
                      </p>
                      <p className="text-xs text-slate-600">{emp.email}</p>
                    </th>
                    <td
                      data-label="Role"
                      className="whitespace-nowrap px-5 py-3.5"
                    >
                      <StatusBadge status={emp.role} />
                    </td>
                    <td
                      data-label="Divisi"
                      className="whitespace-nowrap px-5 py-3.5 text-xs font-medium text-slate-700"
                    >
                      {emp.divisionName}
                    </td>
                    <td
                      data-label="Bergabung"
                      className="whitespace-nowrap px-5 py-3.5 text-xs text-slate-700 tabular-nums"
                    >
                      {emp.joinDate}
                    </td>
                    <td
                      data-label="Progres 1 Tahun"
                      className="min-w-[190px] px-5 py-3.5"
                    >
                      <div className="w-full max-w-[220px] sm:max-w-none">
                        <div className="flex items-center justify-between gap-2 text-xs tabular-nums">
                          <span className="font-semibold text-slate-800">
                            {emp.tenureLabel}
                          </span>
                          <span className="font-medium text-slate-600">
                            {emp.tenureProgressPercent}%
                          </span>
                        </div>
                        <div className="mt-1.5">
                          <progress
                            className="otium-progress otium-progress--amber"
                            value={emp.tenureProgressPercent}
                            max={100}
                            aria-label={`Progres masa kerja ${emp.fullName}: ${emp.tenureProgressPercent}% menuju 1 tahun`}
                          />
                        </div>
                      </div>
                    </td>
                    <td
                      data-label="Kelayakan"
                      className="whitespace-nowrap px-5 py-3.5 text-right"
                    >
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
