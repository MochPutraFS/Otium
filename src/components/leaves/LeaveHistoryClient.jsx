"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarPlus,
  CheckCircle2,
  FileDown,
  Paperclip,
} from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import EmptyState from "@/components/ui/EmptyState";
import CancelLeaveModal from "@/components/ui/CancelLeaveModal";
import LeaveDetailDrawer from "@/components/leaves/LeaveDetailDrawer";
import { formatIndonesianDateRange } from "@/lib/date-utils";
import {
  WORKSPACE_TODAY_LABEL,
  loadLeavesPreviewState,
  saveLeavesPreviewState,
} from "@/lib/mock-leaves-data";

export default function LeaveHistoryClient({
  userProfile,
  roleKey = "karyawan",
  leaveTypes = [],
}) {
  const isLeaderRole = userProfile.role === "Ketua Divisi";

  const [previewState, setPreviewState] = useState({
    requests: [],
    remainingQuota: userProfile.remainingLeaveQuota,
  });
  const [activeTab, setActiveTab] = useState("ALL");
  const [leaveTypeFilter, setLeaveTypeFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("submitted_desc");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [toastMsg, setToastMsg] = useState("");

  useEffect(() => {
    const loaded = loadLeavesPreviewState(
      roleKey,
      userProfile.remainingLeaveQuota
    );
    setPreviewState(loaded);
  }, [roleKey, userProfile.remainingLeaveQuota]);

  function showToast(message) {
    setToastMsg(message);
    setTimeout(() => {
      setToastMsg((prev) => (prev === message ? "" : prev));
    }, 3200);
  }

  const tabs = useMemo(() => {
    const list = previewState.requests;
    return [
      { key: "ALL", label: "Semua", count: list.length },
      {
        key: "WAITING",
        label: "Menunggu",
        count: list.filter((r) =>
          ["Pending", "Approved by Leader"].includes(r.status)
        ).length,
      },
      {
        key: "Approved",
        label: "Disetujui",
        count: list.filter((r) => r.status === "Approved").length,
      },
      {
        key: "Rejected",
        label: "Ditolak",
        count: list.filter((r) => r.status === "Rejected").length,
      },
      {
        key: "Cancelled",
        label: "Dibatalkan",
        count: list.filter((r) => r.status === "Cancelled").length,
      },
    ];
  }, [previewState.requests]);

  const filteredRequests = useMemo(() => {
    const list = previewState.requests.filter((req) => {
      if (
        activeTab === "WAITING" &&
        !["Pending", "Approved by Leader"].includes(req.status)
      ) {
        return false;
      }
      if (
        !["ALL", "WAITING"].includes(activeTab) &&
        req.status !== activeTab
      ) {
        return false;
      }
      if (
        leaveTypeFilter !== "ALL" &&
        String(req.leaveTypeId) !== String(leaveTypeFilter)
      ) {
        return false;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      if (sortBy === "start_desc") return b.startDate.localeCompare(a.startDate);
      if (sortBy === "start_asc") return a.startDate.localeCompare(b.startDate);
      return b.submissionDate.localeCompare(a.submissionDate);
    });
  }, [previewState.requests, activeTab, leaveTypeFilter, sortBy]);

  function getSubStatusText(request) {
    if (request.status === "Pending") {
      return isLeaderRole ? "Menunggu HRD" : "Menunggu Ketua Divisi";
    }
    if (request.status === "Approved by Leader") {
      return "Menunggu Final HRD";
    }
    return "";
  }

  async function handleConfirmCancel(requestId, cancellationReason) {
    let refundedDays = 0;
    const updatedRequests = previewState.requests.map((req) => {
      if (req.id !== requestId || req.status !== "Pending") return req;
      if (req.quotaDeducted) {
        refundedDays = Number(req.totalDays);
      }
      return {
        ...req,
        status: "Cancelled",
        cancellationReason,
        quotaDeducted: false,
        timeline: [
          ...(req.timeline || []),
          {
            stage: "Dibatalkan Pemohon",
            actor: userProfile.fullName,
            role: userProfile.role,
            time: `${WORKSPACE_TODAY_LABEL}, baru saja`,
            state: "rejected",
            notes: cancellationReason,
          },
        ],
      };
    });

    const nextState = {
      requests: updatedRequests,
      remainingQuota: Number(
        (previewState.remainingQuota + refundedDays).toFixed(1)
      ),
    };
    saveLeavesPreviewState(roleKey, nextState);
    setPreviewState(nextState);
    setCancelTarget(null);

    showToast(
      refundedDays > 0
        ? `Pengajuan dibatalkan. Kuota ${refundedDays.toFixed(1)} Hari dikembalikan otomatis.`
        : "Pengajuan cuti berhasil dibatalkan."
    );
  }

  function handleDownloadPdf(request, mode) {
    if (mode === "attachment") {
      showToast(`Membuka pratinjau lampiran ${request.attachmentName} (Mode UI).`);
      return;
    }
    showToast(
      `Surat Cuti Resmi #${request.id} (PDF) siap diunduh setelah backend aktif.`
    );
  }

  return (
    <div className="space-y-5">
      {/* Header Ringkas */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Riwayat Cuti Saya
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Sisa Kuota Cuti Tahunan:{" "}
            <strong className="text-slate-800">
              {Number(previewState.remainingQuota).toFixed(1)} Hari
            </strong>
          </p>
        </div>

        <Link
          href={`/leaves/new?role=${roleKey}`}
          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          <CalendarPlus className="h-4 w-4" aria-hidden="true" />
          Ajukan Cuti
        </Link>
      </div>

      {/* Quick Status Tabs + Filter Ringkas */}
      <div className="flex flex-col justify-between gap-3 border-b border-slate-200 pb-3.5 md:flex-row md:items-center">
        <div className="flex flex-wrap items-center gap-1.5">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                  isActive
                    ? "bg-blue-600 text-white shadow-sm"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Filter jenis cuti"
            value={leaveTypeFilter}
            onChange={(e) => setLeaveTypeFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 focus:border-blue-500 focus:outline-none"
          >
            <option value="ALL">Semua Jenis Cuti</option>
            {leaveTypes.map((lt) => (
              <option key={lt.id} value={lt.id}>
                {lt.name}
              </option>
            ))}
          </select>

          <select
            aria-label="Urutkan riwayat cuti"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 focus:border-blue-500 focus:outline-none"
          >
            <option value="submitted_desc">Terbaru Diajukan</option>
            <option value="start_desc">Tgl Mulai Terbaru</option>
            <option value="start_asc">Tgl Mulai Terlama</option>
          </select>
        </div>
      </div>

      {/* Daftar Riwayat: Tabel 4 Kolom (Desktop) & Compact Cards (Mobile) */}
      {filteredRequests.length === 0 ? (
        <EmptyState
          title="Belum ada riwayat cuti"
          description="Tidak ditemukan pengajuan cuti pada filter ini. Anda dapat membuat pengajuan baru kapan saja."
          actionLabel="Ajukan Cuti Baru"
          actionHref={`/leaves/new?role=${roleKey}`}
        />
      ) : (
        <>
          {/* Desktop Table (4 Kolom Inti) */}
          <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <th className="px-5 py-3.5">Jenis &amp; Periode</th>
                    <th className="px-5 py-3.5">Durasi</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredRequests.map((req) => {
                    const subStatus = getSubStatusText(req);
                    return (
                      <tr
                        key={req.id}
                        onClick={() => setSelectedRequest(req)}
                        className="cursor-pointer transition hover:bg-slate-50/80"
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900">
                              {req.leaveTypeName}
                            </span>
                            {req.isHalfDay && (
                              <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                                0.5 Hr
                              </span>
                            )}
                            {req.attachmentName && (
                              <Paperclip
                                className="h-3.5 w-3.5 text-slate-400"
                                title="Memiliki lampiran"
                                aria-label="Memiliki lampiran"
                              />
                            )}
                          </div>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {formatIndonesianDateRange(
                              req.startDate,
                              req.endDate,
                              req.isHalfDay
                            )}
                          </p>
                        </td>

                        <td className="px-5 py-3.5 text-xs font-semibold tabular-nums text-slate-700">
                          {Number(req.totalDays).toFixed(1)} Hari
                        </td>

                        <td className="px-5 py-3.5">
                          <div className="space-y-1">
                            <StatusBadge
                              status={req.status}
                              rejectedByRole={req.rejectedByRole}
                            />
                            {subStatus && (
                              <p className="text-[11px] text-slate-400">
                                {subStatus}
                              </p>
                            )}
                          </div>
                        </td>

                        <td
                          className="px-5 py-3.5 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="inline-flex items-center gap-1.5">
                            {req.status === "Pending" && (
                              <button
                                type="button"
                                onClick={() => setCancelTarget(req)}
                                className="rounded-lg border border-rose-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                              >
                                Batalkan
                              </button>
                            )}

                            {req.status === "Approved" && (
                              <button
                                type="button"
                                onClick={() => handleDownloadPdf(req, "pdf")}
                                className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50"
                              >
                                <FileDown
                                  className="h-3.5 w-3.5"
                                  aria-hidden="true"
                                />
                                PDF
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => setSelectedRequest(req)}
                              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                            >
                              Detail
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Compact Cards */}
          <div className="space-y-3 md:hidden">
            {filteredRequests.map((req) => {
              const subStatus = getSubStatusText(req);
              return (
                <div
                  key={req.id}
                  onClick={() => setSelectedRequest(req)}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-slate-900">
                          {req.leaveTypeName}
                        </span>
                        {req.isHalfDay && (
                          <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                            0.5 Hr
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {formatIndonesianDateRange(
                          req.startDate,
                          req.endDate,
                          req.isHalfDay
                        )}{" "}
                        • {Number(req.totalDays).toFixed(1)} Hari
                      </p>
                    </div>
                    <StatusBadge
                      status={req.status}
                      rejectedByRole={req.rejectedByRole}
                    />
                  </div>

                  {subStatus && (
                    <p className="mt-1.5 text-[11px] text-slate-400">
                      {subStatus}
                    </p>
                  )}

                  <div
                    className="mt-3 flex items-center justify-end gap-2 border-t border-slate-100 pt-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {req.status === "Pending" && (
                      <button
                        type="button"
                        onClick={() => setCancelTarget(req)}
                        className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600"
                      >
                        Batalkan
                      </button>
                    )}
                    {req.status === "Approved" && (
                      <button
                        type="button"
                        onClick={() => handleDownloadPdf(req, "pdf")}
                        className="rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700"
                      >
                        PDF
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setSelectedRequest(req)}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700"
                    >
                      Detail
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Slide-Over Drawer Detail & Timeline */}
      <LeaveDetailDrawer
        request={selectedRequest}
        isOpen={Boolean(selectedRequest)}
        onClose={() => setSelectedRequest(null)}
        onOpenCancel={(req) => setCancelTarget(req)}
        onDownloadPdf={handleDownloadPdf}
      />

      {/* Modal Pembatalan Cuti (Khusus Pending, Wajib Alasan) */}
      <CancelLeaveModal
        isOpen={Boolean(cancelTarget)}
        request={cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleConfirmCancel}
      />

      {/* Toast Umpan Balik */}
      {toastMsg && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-medium text-white shadow-lg">
          <CheckCircle2
            className="h-4 w-4 text-emerald-400"
            aria-hidden="true"
          />
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
}
