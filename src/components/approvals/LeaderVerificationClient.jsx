"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  CheckCircle2,
  Clock,
  FileCheck2,
  Paperclip,
  RotateCcw,
  Search,
} from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import EmptyState from "@/components/ui/EmptyState";
import ApprovalModal from "@/components/ui/ApprovalModal";
import VerificationCard from "@/components/approvals/VerificationCard";
import ApprovalDetailDrawer from "@/components/approvals/ApprovalDetailDrawer";
import { formatIndonesianDateRange } from "@/lib/date-utils";
import {
  APPROVALS_TODAY_LABEL,
  INITIAL_APPROVAL_REQUESTS,
  loadApprovalsPreviewState,
  resetApprovalsPreviewState,
  saveApprovalsPreviewState,
} from "@/lib/mock-approvals-data";

// Workspace Hybrid Verifikasi Tahap 1 — Khusus Ketua Divisi (/approvals/leader)
export default function LeaderVerificationClient({
  leaderProfile,
  leaveTypes = [],
}) {
  const divisionName = leaderProfile.divisionName || "Engineering";

  const [allRequests, setAllRequests] = useState(INITIAL_APPROVAL_REQUESTS);
  const [activeTab, setActiveTab] = useState("queue"); // 'queue' | 'history'
  const [searchQuery, setSearchQuery] = useState("");
  const [leaveTypeFilter, setLeaveTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [detailTarget, setDetailTarget] = useState(null);
  const [modalState, setModalState] = useState({
    isOpen: false,
    actionType: "Approve",
    request: null,
  });
  const [toastMsg, setToastMsg] = useState("");

  useEffect(() => {
    setAllRequests(loadApprovalsPreviewState());
  }, []);

  function showToast(message) {
    setToastMsg(message);
    setTimeout(() => {
      setToastMsg((prev) => (prev === message ? "" : prev));
    }, 3400);
  }

  // Scope wajib Ketua Divisi: hanya Karyawan di divisinya sendiri (tidak boleh verifikasi diri sendiri)
  const divisionRequests = useMemo(
    () =>
      allRequests.filter(
        (req) =>
          req.divisionName === divisionName && req.applicantRole === "Karyawan"
      ),
    [allRequests, divisionName]
  );

  const queueRequests = useMemo(
    () => divisionRequests.filter((req) => req.status === "Pending"),
    [divisionRequests]
  );

  const historyRequests = useMemo(
    () => divisionRequests.filter((req) => req.status !== "Pending"),
    [divisionRequests]
  );

  const filteredQueue = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return queueRequests.filter((req) => {
      if (q && !req.applicantName.toLowerCase().includes(q)) return false;
      if (
        leaveTypeFilter !== "ALL" &&
        String(req.leaveTypeId) !== String(leaveTypeFilter)
      ) {
        return false;
      }
      return true;
    });
  }, [queueRequests, searchQuery, leaveTypeFilter]);

  const filteredHistory = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return historyRequests.filter((req) => {
      if (q && !req.applicantName.toLowerCase().includes(q)) return false;
      if (
        leaveTypeFilter !== "ALL" &&
        String(req.leaveTypeId) !== String(leaveTypeFilter)
      ) {
        return false;
      }
      if (statusFilter !== "ALL" && req.status !== statusFilter) return false;
      return true;
    });
  }, [historyRequests, searchQuery, leaveTypeFilter, statusFilter]);

  const attachmentPendingCount = useMemo(
    () => queueRequests.filter((req) => Boolean(req.attachmentName)).length,
    [queueRequests]
  );

  function handleOpenModal(request, actionType) {
    setModalState({ isOpen: true, actionType, request });
  }

  function handleCloseModal() {
    setModalState((prev) => ({ ...prev, isOpen: false }));
  }

  function handleSubmitDecision(notes) {
    const target = modalState.request;
    if (!target) return;

    const isApprove = modalState.actionType === "Approve";
    let refundSuffix = "";

    const updated = allRequests.map((req) => {
      if (req.id !== target.id) return req;
      if (isApprove) {
        return {
          ...req,
          status: "Approved by Leader",
          leaderApproverName: leaderProfile.fullName,
          leaderApprovedAt: `${APPROVALS_TODAY_LABEL}, Baru saja`,
          leaderNotes: notes || "Disetujui Ketua Divisi.",
        };
      }

      const willRefund = req.deductsAnnualQuota && req.quotaDeducted;
      if (willRefund) {
        refundSuffix = ` (+${Number(req.totalDays).toFixed(1)} Hr Auto-Refund)`;
      }
      return {
        ...req,
        status: "Rejected",
        rejectedByRole: "Ketua Divisi",
        rejectionReason: notes,
        leaderApproverName: leaderProfile.fullName,
        leaderApprovedAt: `${APPROVALS_TODAY_LABEL}, Baru saja`,
        leaderNotes: notes,
        remainingQuota: willRefund
          ? Number((req.remainingQuota + req.totalDays).toFixed(1))
          : req.remainingQuota,
        quotaDeducted: false,
      };
    });

    setAllRequests(updated);
    saveApprovalsPreviewState(updated);
    showToast(
      isApprove
        ? `Pengajuan ${target.applicantName} disetujui Tahap 1 dan diteruskan ke HRD.`
        : `Pengajuan ${target.applicantName} ditolak${refundSuffix}.`
    );
  }

  function handleResetSimulation() {
    const fresh = resetApprovalsPreviewState();
    setAllRequests(fresh);
    setSearchQuery("");
    setLeaveTypeFilter("ALL");
    setStatusFilter("ALL");
    showToast("Simulasi antrean verifikasi telah di-reset ke data awal.");
  }

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Verifikasi Cuti Divisi {divisionName}
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Tahap 1 — Ketua Divisi ({leaderProfile.fullName}). Tinjau jadwal
            kerja, serah terima tugas, dan lampiran sebelum diteruskan ke HRD.
          </p>
        </div>

        <button
          type="button"
          onClick={handleResetSimulation}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          Reset Simulasi
        </button>
      </div>

      {/* Mini KPI Strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Menunggu Verifikasi
            </span>
            <Clock className="h-4 w-4 text-amber-500" aria-hidden="true" />
          </div>
          <p className="mt-1.5 text-xl font-bold text-slate-900">
            {queueRequests.length} Pengajuan
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Sudah Diverifikasi
            </span>
            <FileCheck2 className="h-4 w-4 text-blue-600" aria-hidden="true" />
          </div>
          <p className="mt-1.5 text-xl font-bold text-slate-900">
            {historyRequests.length} Pengajuan
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Cek Lampiran Aktif
            </span>
            <Paperclip className="h-4 w-4 text-sky-600" aria-hidden="true" />
          </div>
          <p className="mt-1.5 text-xl font-bold text-slate-900">
            {attachmentPendingCount} Dokumen
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Divisi Aktif
            </span>
            <Building2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
          </div>
          <p className="mt-1.5 truncate text-xl font-bold text-slate-900">
            {divisionName}
          </p>
        </div>
      </div>

      {/* Main Hybrid Workspace Card */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Tabs & Filter Bar */}
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab("queue")}
              className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                activeTab === "queue"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              Menunggu Verifikasi ({queueRequests.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                activeTab === "history"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              Riwayat Verifikasi Divisi ({historyRequests.length})
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Cari nama anggota..."
                className="w-48 rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <select
              value={leaveTypeFilter}
              onChange={(event) => setLeaveTypeFilter(event.target.value)}
              aria-label="Filter jenis cuti"
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 focus:border-blue-500 focus:bg-white focus:outline-none"
            >
              <option value="ALL">Semua Jenis Cuti</option>
              {leaveTypes.map((lt) => (
                <option key={lt.id} value={lt.id}>
                  {lt.name}
                </option>
              ))}
            </select>

            {activeTab === "history" && (
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                aria-label="Filter status riwayat"
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 focus:border-blue-500 focus:bg-white focus:outline-none"
              >
                <option value="ALL">Semua Status</option>
                <option value="Approved by Leader">Approved by Leader</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            )}
          </div>
        </div>

        {/* Content: Tab 1 = Compact Cards, Tab 2 = Dense Table */}
        <div className="p-4">
          {activeTab === "queue" ? (
            filteredQueue.length === 0 ? (
              <EmptyState
                title="Antrean Verifikasi Kosong"
                description="Seluruh pengajuan cuti anggota divisi Anda sudah diproses atau tidak cocok dengan filter pencarian."
              />
            ) : (
              <div className="space-y-3">
                {filteredQueue.map((request) => (
                  <VerificationCard
                    key={request.id}
                    request={request}
                    mode="leader"
                    onOpenDetail={(req) => setDetailTarget(req)}
                    onOpenApprove={(req) => handleOpenModal(req, "Approve")}
                    onOpenReject={(req) => handleOpenModal(req, "Reject")}
                  />
                ))}
              </div>
            )
          ) : filteredHistory.length === 0 ? (
            <EmptyState
              title="Belum Ada Riwayat Verifikasi"
              description="Pengajuan yang telah Anda setujui atau tolak akan tercatat otomatis pada tabel riwayat ini."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-400">
                    <th className="py-2.5 pr-3">Anggota</th>
                    <th className="px-3 py-2.5">Jenis &amp; Periode</th>
                    <th className="px-3 py-2.5">Durasi</th>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="py-2.5 pl-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredHistory.map((request) => (
                    <tr
                      key={request.id}
                      onClick={() => setDetailTarget(request)}
                      className="cursor-pointer transition hover:bg-slate-50"
                    >
                      <td className="py-3 pr-3">
                        <p className="font-semibold text-slate-900">
                          {request.applicantName}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Handover: {request.handoverUserName}
                        </p>
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-medium text-slate-800">
                          {request.leaveTypeName}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {formatIndonesianDateRange(
                            request.startDate,
                            request.endDate,
                            request.isHalfDay
                          )}
                        </p>
                      </td>
                      <td className="px-3 py-3 font-semibold text-slate-800">
                        {Number(request.totalDays).toFixed(1)} Hari
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge
                          status={request.status}
                          rejectedByRole={request.rejectedByRole}
                        />
                      </td>
                      <td className="py-3 pl-3 text-right">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setDetailTarget(request);
                          }}
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700"
                        >
                          Detail
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Slide-Over Detail Drawer */}
      <ApprovalDetailDrawer
        request={detailTarget}
        isOpen={Boolean(detailTarget)}
        canTakeAction={detailTarget?.status === "Pending"}
        onClose={() => setDetailTarget(null)}
        onOpenApprove={(req) => handleOpenModal(req, "Approve")}
        onOpenReject={(req) => handleOpenModal(req, "Reject")}
        onPreviewAttachment={(fileName) =>
          showToast(`Pratinjau lampiran "${fileName}" (Simulasi UI).`)
        }
      />

      {/* Smart Approval Modal */}
      <ApprovalModal
        isOpen={modalState.isOpen}
        actionType={modalState.actionType}
        approverRole="Ketua Divisi"
        requestSummary={modalState.request}
        onClose={handleCloseModal}
        onSubmit={handleSubmitDecision}
      />

      {/* Toast Feedback */}
      {toastMsg && (
        <div
          role="status"
          className="fixed bottom-20 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-slate-200 bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-xl"
        >
          <CheckCircle2
            className="h-4 w-4 shrink-0 text-emerald-400"
            aria-hidden="true"
          />
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
}
