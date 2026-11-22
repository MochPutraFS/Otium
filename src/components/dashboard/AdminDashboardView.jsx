"use client";

import { useEffect, useId, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowUpRight,
  Building2,
  RefreshCw,
  SlidersHorizontal,
  UserCog,
  UserPlus,
  Users,
} from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import EmptyState from "@/components/ui/EmptyState";

const CMS_MODULES = [
  {
    code: "01",
    title: "Manajemen Pengguna",
    desc: "Tambah akun 4 role, status aktif/nonaktif, & proteksi Admin/HRD.",
    href: "/admin/users",
    icon: Users,
  },
  {
    code: "02",
    title: "Manajemen Divisi",
    desc: "Kelola unit kerja, penugasan Ketua Divisi, & konfirmasi hapus 2 tahap.",
    href: "/admin/divisions",
    icon: Building2,
  },
  {
    code: "03",
    title: "Anggota Divisi",
    desc: "Atur keanggotaan divisi tanpa menghapus akun karyawan.",
    href: "/admin/division-members",
    icon: UserCog,
  },
  {
    code: "04",
    title: "Jenis Cuti Dinamis",
    desc: "Konfigurasi kuota, batas H-n, syarat lampiran, & potongan saldo.",
    href: "/admin/leave-types",
    icon: SlidersHorizontal,
  },
];

/**
 * Tampilan Dashboard Administrator bergaya Swiss Archival (100% UI-Only Live Data).
 * Menampilkan Metric Strip master data, akses cepat 4 modul CMS, dan tabel Swiss Ledger
 * karyawan masa kerja < 1 tahun (Belum Eligible Cuti Tahunan).
 */
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

  const { periodLabel, stats, ineligibleEmployees = [] } = dashboardData;

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

      {/* 1. METRIC STRIP MASTER DATA & OPERASIONAL */}
      <div
        className="metric-strip"
        role="region"
        aria-label="Ringkasan Metrik Administrator"
      >
        <Link
          href="/admin/users"
          className="metric-cell group transition-colors duration-150 hover:bg-[var(--spruce-tint)]"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="metric-label">Pengguna Aktif</span>
            <ArrowUpRight
              className="h-3.5 w-3.5 text-[var(--spruce)] transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              aria-hidden="true"
            />
          </div>
          <div className="metric-val text-[var(--spruce)]">
            {String(stats.activeUsers).padStart(2, "0")}
          </div>
          <div className="metric-note mono text-[11px]">
            {stats.inactiveUsers} akun berstatus Nonaktif
          </div>
        </Link>

        <div className="metric-cell">
          <div className="metric-label">Pengajuan ({periodLabel})</div>
          <div className="metric-val">
            {String(stats.monthlyRequests).padStart(2, "0")}
          </div>
          <div className="metric-note">Total permohonan bulan berjalan</div>
        </div>

        <div className="metric-cell">
          <div className="metric-label">Pending Approval</div>
          <div className="metric-val text-[var(--ochre)]">
            {String(stats.pendingApprovals).padStart(2, "0")}
          </div>
          <div className="metric-note">
            Berstatus Pending &amp; Approved by Leader
          </div>
        </div>

        <Link
          href="/admin/divisions"
          className="metric-cell group transition-colors duration-150 hover:bg-[var(--spruce-tint)]"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="metric-label">Total Divisi</span>
            <ArrowUpRight
              className="h-3.5 w-3.5 text-[var(--spruce)] transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              aria-hidden="true"
            />
          </div>
          <div className="metric-val">
            {String(stats.totalDivisions).padStart(2, "0")}
          </div>
          <div className="metric-note">Unit kerja terdaftar di sistem</div>
        </Link>
      </div>

      {/* 2. PANEL AKSES CEPAT CMS MASTER DATA */}
      <section className="panel" aria-label="Akses Cepat CMS Master Data">
        <div className="panel-head">
          <div>
            <span className="panel-eyebrow">Administrasi Terpusat</span>
            <h2 className="panel-title">Direktori CMS Master Data</h2>
            <p className="panel-sub">
              Kelola pengguna, struktur divisi, keanggotaan tim, dan aturan
              jenis cuti dinamis.
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
            <Link href="/admin/users" className="btn btn-primary btn-sm">
              <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Tambah Pengguna</span>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 divide-y divide-[var(--rule)] sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4">
          {CMS_MODULES.map((mod, idx) => {
            const Icon = mod.icon;
            return (
              <Link
                key={mod.href}
                href={mod.href}
                className={`group flex flex-col justify-between gap-3 bg-[var(--paper-pure)] p-4 transition-colors duration-150 hover:bg-[var(--alabaster)] ${
                  idx < CMS_MODULES.length - 1
                    ? "lg:border-r lg:border-[var(--rule)]"
                    : ""
                } ${idx < 2 ? "sm:border-b sm:border-[var(--rule)] lg:border-b-0" : ""} ${
                  idx % 2 === 0 ? "sm:border-r sm:border-[var(--rule)]" : ""
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="mono text-[10.5px] font-semibold text-[var(--ink-muted)]">
                      MODUL {mod.code}
                    </span>
                    <Icon
                      className="h-4 w-4 text-[var(--spruce)]"
                      aria-hidden="true"
                    />
                  </div>
                  <h3 className="mt-1.5 text-sm font-semibold text-[var(--ink)] group-hover:text-[var(--spruce)]">
                    {mod.title}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--ink-soft)]">
                    {mod.desc}
                  </p>
                </div>
                <span className="mono inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--spruce)] group-hover:underline">
                  Buka Modul
                  <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 3. TABEL SWISS LEDGER: KARYAWAN MASA KERJA < 1 TAHUN */}
      <section className="panel overflow-hidden">
        <div className="panel-head">
          <div>
            <span className="panel-eyebrow">Audit Kelayakan Cuti Tahunan</span>
            <h2 className="panel-title">
              Karyawan Masa Kerja &lt; 1 Tahun (Belum Eligible)
            </h2>
            <p className="panel-sub">
              Diblokir otomatis dari Cuti Tahunan, namun tetap berhak atas Cuti
              Sakit &amp; Cuti Khusus lainnya.
            </p>
          </div>
          <span className="tag tag-pending">
            {filteredEmployees.length} dari {ineligibleEmployees.length} Karyawan
          </span>
        </div>

        {/* Filter Divisi Toolbar */}
        {divisionOptions.length > 1 && (
          <div
            className="toolbar"
            role="group"
            aria-label="Filter divisi karyawan belum eligible"
          >
            <div className="seg-group flex-wrap">
              {divisionOptions.map((divName) => {
                const active = divName === activeDivision;
                return (
                  <button
                    key={divName}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setSelectedDivision(divName)}
                    className="seg-btn"
                  >
                    {divName}
                  </button>
                );
              })}
            </div>
            <span className="mono ml-auto text-[11px] text-[var(--ink-muted)]">
              {filteredEmployees.length} catatan
            </span>
          </div>
        )}

        {filteredEmployees.length === 0 ? (
          <div className="panel-body">
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
            className="otium-responsive-table-wrap"
          >
            <table className="ledger otium-responsive-table text-left">
              <caption id={tableCaptionId} className="visually-hidden">
                Daftar karyawan aktif dengan masa kerja kurang dari 1 tahun yang
                belum eligible Cuti Tahunan
              </caption>
              <thead>
                <tr>
                  <th scope="col" className="row-idx">
                    #
                  </th>
                  <th scope="col">Nama &amp; Email</th>
                  <th scope="col">Role</th>
                  <th scope="col">Divisi</th>
                  <th scope="col">Tanggal Bergabung</th>
                  <th scope="col">Progres Menuju 1 Tahun</th>
                  <th scope="col" className="text-right">
                    Status Kelayakan
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((emp, idx) => (
                  <tr key={emp.id}>
                    <td data-label="No" className="row-idx">
                      {String(idx + 1).padStart(2, "0")}
                    </td>
                    <th scope="row" className="font-normal">
                      <p className="font-semibold text-[var(--ink)]">
                        {emp.fullName}
                      </p>
                      <p className="mono text-[11px] text-[var(--ink-muted)]">
                        {emp.email}
                      </p>
                    </th>
                    <td data-label="Role" className="whitespace-nowrap">
                      <StatusBadge status={emp.role} />
                    </td>
                    <td
                      data-label="Divisi"
                      className="whitespace-nowrap text-xs font-medium text-[var(--ink-soft)]"
                    >
                      {emp.divisionName}
                    </td>
                    <td
                      data-label="Bergabung"
                      className="mono whitespace-nowrap text-xs text-[var(--ink-soft)]"
                    >
                      {emp.joinDate}
                    </td>
                    <td data-label="Progres 1 Tahun" className="min-w-[190px]">
                      <div className="w-full max-w-[220px] sm:max-w-none">
                        <div className="mono flex items-center justify-between gap-2 text-[11px]">
                          <span className="font-semibold text-[var(--ink)]">
                            {emp.tenureLabel}
                          </span>
                          <span className="text-[var(--ink-muted)]">
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
                      className="whitespace-nowrap text-right"
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
