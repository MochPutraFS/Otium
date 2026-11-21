"use client";

import { useEffect, useId, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Ban,
  Building2,
  CalendarCheck,
  CalendarPlus,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  FileText,
  Handshake,
  RefreshCw,
  Stethoscope,
  X,
} from "lucide-react";
import StatsCard from "@/components/ui/StatsCard";
import StatusBadge from "@/components/ui/StatusBadge";
import EmptyState from "@/components/ui/EmptyState";

const STATUS_FILTER_OPTIONS = [
  "Semua",
  "Pending",
  "Approved by Leader",
  "Approved",
  "Rejected",
  "Cancelled",
];

// Stepper mini untuk melihat posisi pengajuan (Ketua Divisi -> HRD)
function MiniApprovalStepper({ status, rejectedByRole }) {
  if (status === "Cancelled") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
        <Ban className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
        Dibatalkan Pemohon
      </span>
    );
  }

  const step1State =
    status === "Approved" || status === "Approved by Leader"
      ? "done"
      : status === "Rejected" && rejectedByRole === "Ketua Divisi"
        ? "rejected"
        : status === "Rejected" && rejectedByRole === "HRD"
          ? "done"
          : "current";

  const step2State =
    status === "Approved"
      ? "done"
      : status === "Approved by Leader"
        ? "current"
        : status === "Rejected" && rejectedByRole === "HRD"
          ? "rejected"
          : "upcoming";

  function renderDot(state) {
    if (state === "done") {
      return (
        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-white">
          <Check className="h-2.5 w-2.5" aria-hidden="true" />
        </span>
      );
    }
    if (state === "rejected") {
      return (
        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-white">
          <X className="h-2.5 w-2.5" aria-hidden="true" />
        </span>
      );
    }
    if (state === "current") {
      return (
        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-100 text-amber-800 ring-1 ring-amber-400">
          <Clock className="h-2.5 w-2.5" aria-hidden="true" />
        </span>
      );
    }
    return (
      <span className="h-3.5 w-3.5 rounded-full border border-stone-300 bg-stone-100" />
    );
  }

  return (
    <div
      className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-600"
      aria-label="Alur verifikasi 2 tahap"
    >
      <span className="inline-flex items-center gap-1" title="Tahap 1: Ketua Divisi">
        {renderDot(step1State)}
        <span className="text-slate-700">Ketua</span>
      </span>
      <span
        className={`h-0.5 w-4 rounded-full ${
          step1State === "done" ? "bg-emerald-500" : "bg-stone-200"
        }`}
        aria-hidden="true"
      />
      <span className="inline-flex items-center gap-1" title="Tahap 2: Final HRD">
        {renderDot(step2State)}
        <span className="text-slate-700">HRD</span>
      </span>
    </div>
  );
}

// Tampilan dashboard untuk role Karyawan (Pure Production Live Data)
export default function EmployeeDashboardView({ initialData, data }) {
  const tableCaptionId = useId();
  const handoverPanelId = useId();

  const [dashboardData, setDashboardData] = useState(initialData || data);
  const [selectedStatus, setSelectedStatus] = useState("Semua");
  const [isHandoverExpanded, setIsHandoverExpanded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState("");
  const [liveStatus, setLiveStatus] = useState("");

  useEffect(() => {
    if (initialData) {
      setDashboardData(initialData);
    }
  }, [initialData]);

  const { user, stats, handoverInbox, recentRequests } = dashboardData;

  const filteredRequests = useMemo(() => {
    if (selectedStatus === "Semua") return recentRequests;
    return recentRequests.filter((req) => req.status === selectedStatus);
  }, [recentRequests, selectedStatus]);

  const quotaRemainingPercent =
    stats.initialQuota > 0
      ? Math.round((stats.remainingQuota / stats.initialQuota) * 100)
      : 0;

  const firstHandover = handoverInbox[0] || null;

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
      setLiveStatus("Data Dashboard Karyawan berhasil disegarkan.");
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

      {/* Sapaan dan tombol ajukan cuti */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              Selamat Datang, {user.fullName}
            </h2>
            <StatusBadge status={user.role} />
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Pantau sisa kuota cuti tahunan realtime, tugas serah terima rekan,
            dan progres persetujuan 2 tahap Anda.
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
            href="/leaves/new"
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-colors duration-150 hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
          >
            <CalendarPlus className="h-4 w-4" aria-hidden="true" />
            Ajukan Cuti Baru
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

      {/* Ringkasan kuota (+ badge Eligible & native progress), sakit, total pengajuan, dan divisi */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Sisa Kuota Tahunan"
          value={`${stats.remainingQuota.toFixed(1)} Hari`}
          subtitle={`Terpakai: ${stats.usedQuota.toFixed(1)} dari ${stats.initialQuota.toFixed(1)} Hari (${quotaRemainingPercent}%)`}
          icon={<CalendarCheck className="h-5 w-5" aria-hidden="true" />}
          variant="emerald"
          badge={
            <StatusBadge
              status={
                user.isEligibleAnnualLeave ? "Eligible" : "Belum Eligible"
              }
            />
          }
          progressPercent={quotaRemainingPercent}
          progressVariant={user.isEligibleAnnualLeave ? "emerald" : "amber"}
          progressLabel={`Sisa kuota cuti tahunan ${stats.remainingQuota.toFixed(1)} dari ${stats.initialQuota.toFixed(1)} hari (${quotaRemainingPercent}%)`}
        />
        <StatsCard
          title="Cuti Sakit Diajukan"
          value={`${stats.sickLeaveCount} Kali`}
          subtitle={`Total ${stats.sickLeaveDays.toFixed(1)} Hari di tahun berjalan`}
          icon={<Stethoscope className="h-5 w-5" aria-hidden="true" />}
          variant="rose"
        />
        <StatsCard
          title="Total Pengajuan Saya"
          value={`${stats.totalRequests} Pengajuan`}
          subtitle={`${stats.approvedCount} Approved · ${stats.approvedByLeaderCount} Tahap HRD · ${stats.pendingCount} Pending · ${stats.rejectedCount} Rejected`}
          icon={<FileText className="h-5 w-5" aria-hidden="true" />}
          variant="blue"
          href="/leaves"
          actionLabel="Lihat Riwayat Cuti"
        />
        <StatsCard
          title="Divisi & Atasan"
          value={user.divisionName || "Belum Ditugaskan"}
          subtitle={
            user.leaderName
              ? `Ketua Divisi: ${user.leaderName}`
              : "Belum ada Ketua Divisi aktif"
          }
          icon={<Building2 className="h-5 w-5" aria-hidden="true" />}
          variant="purple"
        />
      </div>

      {/* Banner Kondisional Handover Inbox */}
      {handoverInbox.length === 0 ? (
        <div className="flex items-center gap-2.5 rounded-xl border border-stone-200 bg-white px-4 py-3 text-xs text-slate-600">
          <CheckCircle2
            className="h-4 w-4 shrink-0 text-emerald-600"
            aria-hidden="true"
          />
          <span>
            Tidak ada penunjukan serah terima tugas (handover) aktif
            {user.divisionName ? (
              <>
                {" "}
                di divisi{" "}
                <strong className="font-semibold text-slate-900">
                  {user.divisionName}
                </strong>
              </>
            ) : null}{" "}
            saat ini.
          </span>
        </div>
      ) : (
        <section className="overflow-hidden rounded-xl border border-blue-200 bg-blue-50/40">
          <div className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3 sm:items-center">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-white text-blue-700">
                <Handshake className="h-4 w-4" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-blue-700 px-2.5 py-0.5 text-[11px] font-semibold text-white tabular-nums">
                    Handover Aktif ({handoverInbox.length})
                  </span>
                  <p className="truncate text-xs font-semibold text-slate-900 sm:text-sm tabular-nums">
                    Menggantikan {firstHandover.requesterName} &middot;{" "}
                    {firstHandover.periodLabel} (
                    {firstHandover.totalDays.toFixed(1)} Hari)
                  </p>
                </div>
                <p className="mt-0.5 truncate text-xs text-slate-700">
                  Tugas: &ldquo;{firstHandover.handoverNotes}&rdquo;
                  {handoverInbox.length > 1
                    ? ` (+${handoverInbox.length - 1} penunjukan lainnya)`
                    : ""}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsHandoverExpanded((prev) => !prev)}
              aria-expanded={isHandoverExpanded}
              aria-controls={handoverPanelId}
              className="inline-flex w-fit shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-800 transition-colors duration-150 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
            >
              {isHandoverExpanded ? "Tutup Detail" : "Lihat Detail"}
              {isHandoverExpanded ? (
                <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
              )}
            </button>
          </div>

          {isHandoverExpanded && (
            <div
              id={handoverPanelId}
              className="space-y-2.5 border-t border-blue-200/80 bg-white p-4"
            >
              {handoverInbox.map((item) => (
                <article
                  key={item.id}
                  className="rounded-lg border border-stone-200 bg-[#FAF9F6] p-3.5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {item.requesterName}
                        <span className="ml-1.5 text-xs font-normal text-slate-600">
                          ({item.divisionName})
                        </span>
                      </p>
                      <p className="mt-0.5 text-xs font-medium text-blue-700 tabular-nums">
                        {item.leaveTypeName} &middot; {item.periodLabel} (
                        {item.totalDays.toFixed(1)} Hari)
                      </p>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                  <p className="mt-2 rounded-lg border border-stone-200/80 bg-white px-3 py-2 text-xs leading-relaxed text-slate-700">
                    <span className="font-semibold text-slate-900">
                      Catatan Tugas:{" "}
                    </span>
                    {item.handoverNotes}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Tabel riwayat cuti terbaru dengan filter status */}
      <section className="overflow-hidden rounded-xl border border-stone-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-stone-200 bg-[#FAF9F6] px-5 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Riwayat Pengajuan Cuti Terbaru Saya
              </h3>
              <p className="mt-0.5 text-xs text-slate-600">
                Lacak progres verifikasi Ketua Divisi &amp; HRD secara langsung.
              </p>
            </div>
            <Link
              href="/leaves"
              className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded text-xs font-semibold text-blue-700 transition-colors duration-150 hover:text-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
            >
              Lihat Semua
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>

          <div
            className="flex flex-wrap items-center gap-1.5"
            role="group"
            aria-label="Filter status riwayat pengajuan cuti"
          >
            {STATUS_FILTER_OPTIONS.map((statusOpt) => {
              const active = statusOpt === selectedStatus;
              return (
                <button
                  key={statusOpt}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setSelectedStatus(statusOpt)}
                  className={`cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 ${
                    active
                      ? "bg-slate-900 text-white"
                      : "border border-stone-300 bg-white text-slate-700 hover:bg-stone-100 hover:text-slate-900"
                  }`}
                >
                  {statusOpt}
                </button>
              );
            })}
          </div>
        </div>

        {filteredRequests.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="Tidak ada pengajuan dengan status ini"
              description="Coba pilih filter status lain atau ajukan permohonan cuti baru."
              actionLabel="Ajukan Cuti Baru"
              actionHref="/leaves/new"
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
                Riwayat pengajuan cuti terbaru saya beserta alur persetujuan 2
                tahap
              </caption>
              <thead className="border-b border-stone-200 bg-[#FAF9F6] text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-600">
                <tr>
                  <th scope="col" className="px-5 py-3">
                    Jenis Cuti
                  </th>
                  <th scope="col" className="px-5 py-3">
                    Periode Tanggal
                  </th>
                  <th scope="col" className="px-5 py-3">
                    Durasi
                  </th>
                  <th scope="col" className="px-5 py-3">
                    Rekan Handover
                  </th>
                  <th scope="col" className="px-5 py-3">
                    Alur 2 Tahap
                  </th>
                  <th scope="col" className="px-5 py-3 text-right">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 bg-white">
                {filteredRequests.map((req) => (
                  <tr
                    key={req.id}
                    className="transition-colors duration-150 hover:bg-[#FAF9F6]"
                  >
                    <th
                      scope="row"
                      className="whitespace-nowrap px-5 py-3.5 text-left font-semibold text-slate-900"
                    >
                      <span>{req.leaveTypeName}</span>
                      {req.isHalfDay && (
                        <span className="ml-2 rounded-md border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 tabular-nums">
                          0.5 Hari
                        </span>
                      )}
                    </th>
                    <td
                      data-label="Periode"
                      className="whitespace-nowrap px-5 py-3.5 text-xs text-slate-700 tabular-nums"
                    >
                      {req.periodLabel}
                    </td>
                    <td
                      data-label="Durasi"
                      className="whitespace-nowrap px-5 py-3.5 text-xs font-semibold text-slate-900 tabular-nums"
                    >
                      {req.totalDays.toFixed(1)} Hari
                    </td>
                    <td
                      data-label="Rekan Handover"
                      className="whitespace-nowrap px-5 py-3.5 text-xs text-slate-700"
                    >
                      {req.handoverName}
                    </td>
                    <td
                      data-label="Alur 2 Tahap"
                      className="whitespace-nowrap px-5 py-3.5"
                    >
                      <MiniApprovalStepper
                        status={req.status}
                        rejectedByRole={req.rejectedByRole}
                      />
                    </td>
                    <td
                      data-label="Status"
                      className="whitespace-nowrap px-5 py-3.5 text-right"
                    >
                      <StatusBadge
                        status={req.status}
                        rejectedByRole={req.rejectedByRole}
                      />
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
