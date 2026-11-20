"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock,
  Layers,
  RotateCcw,
  Search,
  UserCheck,
  Zap,
} from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import EmptyState from "@/components/ui/EmptyState";
import ApprovalModal from "@/components/ui/ApprovalModal";
import VerificationCard from "@/components/approvals/VerificationCard";
import HrdBulkApprovalBar from "@/components/approvals/HrdBulkApprovalBar";
import ApprovalDetailDrawer from "@/components/approvals/ApprovalDetailDrawer";
import { formatIndonesianDateRange } from "@/lib/date-utils";
import {
  APPROVALS_TODAY_LABEL,
  INITIAL_APPROVAL_REQUESTS,
  loadApprovalsPreviewState,
  resetApprovalsPreviewState,
  saveApprovalsPreviewState,
} from "@/lib/mock-approvals-data";

// Cek apakah sebuah pengajuan memenuhi syarat Antrean Final HRD (Jalur 1 & Jalur 2)
function isPendingFinalHrd(req) {
  return (
    (req.applicantRole === "Karyawan" && req.status === "Approved by Leader") ||
    (req.applicantRole === "Ketua Divisi" && req.status === "Pending")
  );
}

// Workspace Hybrid Persetujuan Final & Multi-Approve — Khusus HRD (/approvals/hrd)
export default function HrdApprovalClient({ hrdProfile, leaveTypes = [] }) {
  const [allRequests, setAllRequests] = useState(INITIAL_APPROVAL_REQUESTS);
  const [activeTab, setActiveTab] = useState("queue"); // 'queue' | 'all'
  const [searchQuery, setSearchQuery] = useState("");
  const [jalurFilter, setJalurFilter] = useState("ALL"); // 'ALL' | 'J1' | 'J2'
  const [divisionFilter, setDivisionFilter] = useState("ALL");
  const [leaveTypeFilter, setLeaveTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkNotes, setBulkNotes] = useState("");

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

  const divisionList = useMemo(() => {
    const names = Array.from(new Set(allRequests.map((r) => r.divisionName)));
    return names.sort();
  }, [allRequests]);

  const hrdQueue = useMemo(
    () => allRequests.filter(isPendingFinalHrd),
    [allRequests]
  );

  const jalur1Count = useMemo(
    () => hrdQueue.filter((r) => r.applicantRole === "Karyawan").length,
    [hrdQueue]
  );

  const jalur2Count = useMemo(
    () => hrdQueue.filter((r) => r.applicantRole === "Ketua Divisi").length,
    [hrdQueue]
  );

  const filteredQueue = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return hrdQueue.filter((req) => {
      if (q && !req.applicantName.toLowerCase().includes(q)) return false;
      if (jalurFilter === "J1" && req.applicantRole !== "Karyawan") return false;
      if (jalurFilter === "J2" && req.applicantRole !== "Ketua Divisi") {
        return false;
      }
      if (divisionFilter !== "ALL" && req.divisionName !== divisionFilter) {
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
  }, [hrdQueue, searchQuery, jalurFilter, divisionFilter, leaveTypeFilter]);

  const filteredAllRequests = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allRequests.filter((req) => {
      if (q && !req.applicantName.toLowerCase().includes(q)) return false;
      if (divisionFilter !== "ALL" && req.divisionName !== divisionFilter) {
        return false;
      }
      if (statusFilter !== "ALL" && req.status !== statusFilter) return false;
      return true;
    });
  }, [allRequests, searchQuery, divisionFilter, statusFilter]);

  // Hanya hitung ID yang masih tampil pada antrean terfilter
  const visibleSelectedIds = useMemo(
    () =>
      selectedIds.filter((id) => filteredQueue.some((req) => req.id === id)),
    [selectedIds, filteredQueue]
  );

  const allVisibleSelected =
    filteredQueue.length > 0 &&
    visibleSelectedIds.length === filteredQueue.length;

  function handleToggleSelect(id, checked) {
    setSelectedIds((prev) => {
      if (checked) return prev.includes(id) ? prev : [...prev, id];
      return prev.filter((item) => item !== id);
    });
  }

  function handleToggleSelectAll(checked) {
    if (checked) {
      setSelectedIds(filteredQueue.map((req) => req.id));
    } else {
      setSelectedIds([]);
    }
  }

  function handleBulkApprove() {
    if (visibleSelectedIds.length === 0) return;
    const count = visibleSelectedIds.length;
    const finalNote = bulkNotes.trim() || "Disetujui massal (Multi-Approve) HRD.";

    const updated = allRequests.map((req) => {
      if (!visibleSelectedIds.includes(req.id)) return req;
      return {
        ...req,
        status: "Approved",
        hrdApproverName: hrdProfile.fullName,
        hrdApprovedAt: `${APPROVALS_TODAY_LABEL}, Baru saja`,
        hrdNotes: finalNote,
      };
    });

    setAllRequests(updated);
    saveApprovalsPreviewState(updated);
    setSelectedIds([]);
    setBulkNotes("");
    showToast(
      `${count} pengajuan berhasil disetujui sekaligus (Multi-Approve HRD).`
    );
  }

  function handleOpenModal(request, actionType) {
    setModalState({ isOpen: true, actionType, request });
  }

  function handleCloseModal() {
    setModalState((prev) => ({ ...prev, isOpen: false }));
  }

  function handleSubmitSingleDecision(notes) {
    const target = modalState.request;
    if (!target) return;

    const isApprove = modalState.actionType === "Approve";
    let refundSuffix = "";

    const updated = allRequests.map((req) => {
      if (req.id !== target.id) return req;
      if (isApprove) {
        return {
          ...req,
          status: "Approved",
          hrdApproverName: hrdProfile.fullName,
          hrdApprovedAt: `${APPROVALS_TODAY_LABEL}, Baru saja`,
          hrdNotes: notes || "Disetujui Final oleh HRD.",
        };
      }

      const willRefund = req.deductsAnnualQuota && req.quotaDeducted;
      if (willRefund) {
        refundSuffix = ` (+${Number(req.totalDays).toFixed(1)} Hr Auto-Refund)`;
      }
      return {
        ...req,
        status: "Rejected",
        rejectedByRole: "HRD",
        rejectionReason: notes,
        hrdApproverName: hrdProfile.fullName,
        hrdApprovedAt: `${APPROVALS_TODAY_LABEL}, Baru saja`,
        hrdNotes: notes,
        remainingQuota: willRefund
          ? Number((req.remainingQuota + req.totalDays).toFixed(1))
          : req.remainingQuota,
        quotaDeducted: false,
      };
    });

    setAllRequests(updated);
    saveApprovalsPreviewState(updated);
    setSelectedIds((prev) => prev.filter((id) => id !== target.id));
    showToast(
      isApprove
        ? `Pengajuan ${target.applicantName} resmi disetujui Final HRD.`
        : `Pengajuan ${target.applicantName} ditolak oleh HRD${refundSuffix}.`
    );
  }

  function handleResetSimulation() {
    const fresh = resetApprovalsPreviewState();
    setAllRequests(fresh);
    setSelectedIds([]);
    setBulkNotes("");
    setSearchQuery("");
    setJalurFilter("ALL");
    setDivisionFilter("ALL");
    setLeaveTypeFilter("ALL");
    setStatusFilter("ALL");
    showToast("Simulasi antrean HRD telah di-reset ke data awal.");
  }

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Persetujuan Final Cuti Karyawan (Portal HRD)
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Final Approver ({hrdProfile.fullName}) — Mencakup Jalur 1 (Karyawan{" "}
            <em>Approved by Leader</em>) &amp; Jalur 2 (Ketua Divisi langsung)
            dengan dukungan Multi-Approve.
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
              Menunggu Final HRD
            </span>
            <Clock className="h-4 w-4 text-amber-500" aria-hidden="true" />
          </div>
          <p className="mt-1.5 text-xl font-bold text-slate-900">
            {hrdQueue.length} Pengajuan
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Jalur 1 (Karyawan)
            </span>
            <UserCheck className="h-4 w-4 text-sky-600" aria-hidden="true" />
          </div>
          <p className="mt-1.5 text-xl font-bold text-slate-900">
            {jalur1Count} Item
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Jalur 2 (Ketua Divisi)
            </span>
            <Zap className="h-4 w-4 text-amber-600" aria-hidden="true" />
          </div>
          <p className="mt-1.5 text-xl font-bold text-slate-900">
            {jalur2Count} Item
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Total Semua Status
            </span>
            <Layers className="h-4 w-4 text-blue-600" aria-hidden="true" />
          </div>
          <p className="mt-1.5 text-xl font-bold text-slate-900">
            {allRequests.length} Pengajuan
          </p>
        </div>
      </div>

      {/* Main Hybrid Workspace Card */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Tabs & Filter Bar */}
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setActiveTab("queue");
                setSelectedIds([]);
              }}
              className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                activeTab === "queue"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              Menunggu Final Approval ({hrdQueue.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("all");
                setSelectedIds([]);
              }}
              className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                activeTab === "all"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              Seluruh Pengajuan Perusahaan ({allRequests.length})
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
                placeholder="Cari nama pemohon..."
                className="w-44 rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {activeTab === "queue" && (
              <select
                value={jalurFilter}
                onChange={(event) => setJalurFilter(event.target.value)}
                aria-label="Filter jalur persetujuan"
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 focus:border-blue-500 focus:bg-white focus:outline-none"
              >
                <option value="ALL">Semua Jalur</option>
                <option value="J1">Jalur 1: Karyawan</option>
                <option value="J2">Jalur 2: Ketua Divisi</option>
              </select>
            )}

            <select
              value={divisionFilter}
              onChange={(event) => setDivisionFilter(event.target.value)}
              aria-label="Filter divisi"
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 focus:border-blue-500 focus:bg-white focus:outline-none"
            >
              <option value="ALL">Semua Divisi</option>
              {divisionList.map((divName) => (
                <option key={divName} value={divName}>
                  {divName}
                </option>
              ))}
            </select>

            {activeTab === "queue" ? (
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
            ) : (
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                aria-label="Filter status pengajuan"
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 focus:border-blue-500 focus:bg-white focus:outline-none"
              >
                <option value="ALL">Semua Status</option>
                <option value="Pending">Pending</option>
                <option value="Approved by Leader">Approved by Leader</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            )}
          </div>
        </div>

        {/* Sticky Bulk Multi-Approve Bar (Khusus Tab Antrean Final HRD) */}
        {activeTab === "queue" && (
          <HrdBulkApprovalBar
            totalVisibleCount={filteredQueue.length}
            selectedCount={visibleSelectedIds.length}
            allSelected={allVisibleSelected}
            bulkNotes={bulkNotes}
            onToggleSelectAll={handleToggleSelectAll}
            onBulkNotesChange={setBulkNotes}
            onBulkApprove={handleBulkApprove}
          />
        )}

        {/* Content: Tab 1 = Compact Cards + Checkbox, Tab 2 = Dense Company Table */}
        <div className="p-4">
          {activeTab === "queue" ? (
            filteredQueue.length === 0 ? (
              <EmptyState
                title="Antrean Final HRD Kosong"
                description="Semua pengajuan yang menunggu persetujuan final telah selesai diproses atau tidak cocok dengan filter."
              />
            ) : (
              <div className="space-y-3">
                {filteredQueue.map((request) => (
                  <VerificationCard
                    key={request.id}
                    request={request}
                    mode="hrd"
                    isSelected={visibleSelectedIds.includes(request.id)}
                    onToggleSelect={handleToggleSelect}
                    onOpenDetail={(req) => setDetailTarget(req)}
                    onOpenApprove={(req) => handleOpenModal(req, "Approve")}
                    onOpenReject={(req) => handleOpenModal(req, "Reject")}
                  />
                ))}
              </div>
            )
          ) : filteredAllRequests.length === 0 ? (
            <EmptyState
              title="Tidak Ada Data Pengajuan"
              description="Coba ubah kata kunci pencarian atau filter divisi/status untuk melihat data lainnya."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-400">
                    <th className="py-2.5 pr-3">Pemohon &amp; Divisi</th>
                    <th className="px-3 py-2.5">Jenis &amp; Periode</th>
                    <th className="px-3 py-2.5">Durasi</th>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="py-2.5 pl-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAllRequests.map((request) => (
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
                          {request.applicantRole} • {request.divisionName}
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
        canTakeAction={detailTarget ? isPendingFinalHrd(detailTarget) : false}
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
        approverRole="HRD"
        requestSummary={modalState.request}
        onClose={handleCloseModal}
        onSubmit={handleSubmitSingleDecision}
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
