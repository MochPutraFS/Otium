"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Ban,
  Building2,
  CalendarCheck,
  CalendarPlus,
  Check,
  Clock,
  FileText,
  Handshake,
  Stethoscope,
  X,
} from "lucide-react";
import StatsCard from "@/components/ui/StatsCard";
import StatusBadge from "@/components/ui/StatusBadge";
import QuotaOverviewCard from "@/components/ui/QuotaOverviewCard";
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
      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
        <Ban className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
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
        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white">
          <Check className="h-2.5 w-2.5" aria-hidden="true" />
        </span>
      );
    }
    if (state === "rejected") {
      return (
        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-white">
          <X className="h-2.5 w-2.5" aria-hidden="true" />
        </span>
      );
    }
    if (state === "current") {
      return (
        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-100 text-amber-700 ring-1 ring-amber-400">
          <Clock className="h-2.5 w-2.5" aria-hidden="true" />
        </span>
      );
    }
    return (
      <span className="h-3.5 w-3.5 rounded-full border border-slate-300 bg-slate-100" />
    );
  }

  return (
    <div
      className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500"
      aria-label="Alur verifikasi 2 tahap"
    >
      <span className="inline-flex items-center gap-1" title="Tahap 1: Ketua Divisi">
        {renderDot(step1State)}
        <span className="text-slate-600">Ketua</span>
      </span>
      <span
        className={`h-0.5 w-4 rounded-full ${
          step1State === "done" ? "bg-emerald-400" : "bg-slate-200"
        }`}
        aria-hidden="true"
      />
      <span className="inline-flex items-center gap-1" title="Tahap 2: Final HRD">
        {renderDot(step2State)}
        <span className="text-slate-600">HRD</span>
      </span>
    </div>
  );
}

// Tampilan dashboard untuk role Karyawan
export default function EmployeeDashboardView({ data }) {
  const { user, stats, handoverInbox, recentRequests } = data;
  const [selectedStatus, setSelectedStatus] = useState("Semua");

  const filteredRequests = useMemo(() => {
    if (selectedStatus === "Semua") return recentRequests;
    return recentRequests.filter((req) => req.status === selectedStatus);
  }, [recentRequests, selectedStatus]);

  return (
    <div className="space-y-6">
      {/* Sapaan dan tombol ajukan cuti */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              Selamat Datang, {user.fullName}
            </h2>
            <StatusBadge status={user.role} />
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Pantau sisa kuota cuti tahunan realtime, tugas serah terima rekan,
            dan progres persetujuan 2 tahap Anda.
          </p>
        </div>

        <Link
          href="/leaves/new"
          className="inline-flex w-fit items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm shadow-blue-600/20 transition hover:bg-blue-700"
        >
          <CalendarPlus className="h-4 w-4" aria-hidden="true" />
          Ajukan Cuti Baru
        </Link>
      </div>

      {/* Ringkasan kuota, sakit, total pengajuan, dan divisi */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Sisa Kuota Tahunan"
          value={`${stats.remainingQuota.toFixed(1)} Hari`}
          subtitle={`Terpakai: ${stats.usedQuota.toFixed(1)} dari ${stats.initialQuota.toFixed(1)} Hari`}
          icon={<CalendarCheck className="h-5 w-5" aria-hidden="true" />}
          variant="emerald"
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

      {/* Daftar tugas handover (kiri) & ringkasan kuota (kanan) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-7">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Handshake
                  className="h-4 w-4 text-blue-600"
                  aria-hidden="true"
                />
                <h3 className="text-sm font-semibold text-slate-900">
                  Tugas Serah Terima (Handover Inbox)
                </h3>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                Daftar penunjukan Anda sebagai rekan pengganti sementara di
                divisi {user.divisionName}.
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
              {handoverInbox.length} Tugas
            </span>
          </div>

          <div className="mt-4 flex-1 space-y-3">
            {handoverInbox.length === 0 ? (
              <EmptyState
                title="Tidak ada tugas serah terima aktif"
                description="Jika rekan satu divisi menunjuk Anda sebagai pengganti saat cuti, daftarnya akan tampil di sini."
              />
            ) : (
              handoverInbox.map((item) => (
                <article
                  key={item.id}
                  className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 transition hover:border-blue-200 hover:bg-blue-50/30"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {item.requesterName}
                        <span className="ml-1.5 text-xs font-normal text-slate-500">
                          ({item.divisionName})
                        </span>
                      </p>
                      <p className="mt-0.5 text-xs font-medium text-blue-700">
                        {item.leaveTypeName} &middot; {item.periodLabel} (
                        {item.totalDays.toFixed(1)} Hari)
                      </p>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                  <p className="mt-2.5 rounded-lg border border-slate-200/70 bg-white px-3 py-2 text-xs leading-relaxed text-slate-600">
                    <span className="font-semibold text-slate-700">
                      Catatan Tugas:{" "}
                    </span>
                    {item.handoverNotes}
                  </p>
                </article>
              ))
            )}
          </div>
        </section>

        <div className="lg:col-span-5">
          <QuotaOverviewCard
            joinDate={user.joinDate}
            tenureLabel={user.tenureLabel}
            isEligibleAnnualLeave={user.isEligibleAnnualLeave}
            initialQuota={stats.initialQuota}
            remainingQuota={stats.remainingQuota}
          />
        </div>
      </div>

      {/* Tabel riwayat cuti terbaru dengan filter status */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Riwayat Pengajuan Cuti Terbaru Saya
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Lacak progres verifikasi Ketua Divisi &amp; HRD secara langsung.
              </p>
            </div>
            <Link
              href="/leaves"
              className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-blue-600 transition hover:text-blue-700"
            >
              Lihat Semua
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {STATUS_FILTER_OPTIONS.map((statusOpt) => {
              const active = statusOpt === selectedStatus;
              return (
                <button
                  key={statusOpt}
                  type="button"
                  onClick={() => setSelectedStatus(statusOpt)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    active
                      ? "bg-slate-900 text-white shadow-sm"
                      : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
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
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">Jenis Cuti</th>
                  <th className="px-5 py-3.5">Periode Tanggal</th>
                  <th className="px-5 py-3.5">Durasi</th>
                  <th className="px-5 py-3.5">Rekan Handover</th>
                  <th className="px-5 py-3.5">Alur 2 Tahap</th>
                  <th className="px-5 py-3.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredRequests.map((req) => (
                  <tr
                    key={req.id}
                    className="transition hover:bg-slate-50/80"
                  >
                    <td className="whitespace-nowrap px-5 py-3.5 font-semibold text-slate-900">
                      {req.leaveTypeName}
                      {req.isHalfDay && (
                        <span className="ml-2 rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                          0.5 Hari
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-xs text-slate-600">
                      {req.periodLabel}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-xs font-semibold text-slate-800">
                      {req.totalDays.toFixed(1)} Hari
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-xs text-slate-600">
                      {req.handoverName}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5">
                      <MiniApprovalStepper
                        status={req.status}
                        rejectedByRole={req.rejectedByRole}
                      />
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-right">
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
