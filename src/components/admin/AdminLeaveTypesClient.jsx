"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Paperclip,
  Pencil,
  Plus,
  Power,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";
import StatsCard from "@/components/ui/StatsCard";
import StatusBadge from "@/components/ui/StatusBadge";
import EmptyState from "@/components/ui/EmptyState";
import DataTableToolbar from "@/components/ui/DataTableToolbar";
import LeaveTypeFormModal from "@/components/admin/LeaveTypeFormModal";
import {
  formatSubmissionLeadTime,
  getInitialAdminCmsState,
  loadAdminCmsPreviewState,
  resetAdminCmsPreviewState,
  saveAdminCmsPreviewState,
} from "@/lib/mock-admin-data";

// Workspace CMS Modul 4: Manajemen Jenis Cuti Dinamis (/admin/leave-types)
export default function AdminLeaveTypesClient() {
  const [cmsState, setCmsState] = useState(getInitialAdminCmsState);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [attachmentFilter, setAttachmentFilter] = useState("ALL");
  const [deductFilter, setDeductFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("name_asc");

  const [formModalState, setFormModalState] = useState({
    isOpen: false,
    mode: "create",
    leaveType: null,
  });
  const [toast, setToast] = useState(null);

  useEffect(() => {
    setCmsState(loadAdminCmsPreviewState());
  }, []);

  function showToast(message) {
    setToast(message);
    window.setTimeout(() => {
      setToast((prev) => (prev === message ? null : prev));
    }, 3600);
  }

  function updateCmsState(updater) {
    setCmsState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      saveAdminCmsPreviewState(next);
      return next;
    });
  }

  const stats = useMemo(() => {
    const total = cmsState.leaveTypes.length;
    const active = cmsState.leaveTypes.filter((lt) => lt.isActive).length;
    const withAttachment = cmsState.leaveTypes.filter(
      (lt) => lt.requiresAttachment
    ).length;
    return { total, active, inactive: total - active, withAttachment };
  }, [cmsState.leaveTypes]);

  const filteredLeaveTypes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const list = cmsState.leaveTypes.filter((lt) => {
      if (q) {
        const hay = `${lt.code} ${lt.name} ${lt.description || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (statusFilter === "ACTIVE" && !lt.isActive) return false;
      if (statusFilter === "INACTIVE" && lt.isActive) return false;
      if (attachmentFilter === "REQUIRED" && !lt.requiresAttachment) return false;
      if (attachmentFilter === "OPTIONAL" && lt.requiresAttachment) return false;
      if (deductFilter === "YES" && !lt.deductsAnnualQuota) return false;
      if (deductFilter === "NO" && lt.deductsAnnualQuota) return false;
      return true;
    });

    return [...list].sort((a, b) => {
      switch (sortBy) {
        case "name_desc":
          return b.name.localeCompare(a.name, "id");
        case "quota_desc":
          return Number(b.maxQuota) - Number(a.maxQuota);
        case "quota_asc":
          return Number(a.maxQuota) - Number(b.maxQuota);
        case "lead_desc":
          return Number(b.minSubmissionDays) - Number(a.minSubmissionDays);
        case "name_asc":
        default:
          return a.name.localeCompare(b.name, "id");
      }
    });
  }, [
    cmsState.leaveTypes,
    searchQuery,
    statusFilter,
    attachmentFilter,
    deductFilter,
    sortBy,
  ]);

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    statusFilter !== "ALL" ||
    attachmentFilter !== "ALL" ||
    deductFilter !== "ALL";

  function handleResetFilters() {
    setSearchQuery("");
    setStatusFilter("ALL");
    setAttachmentFilter("ALL");
    setDeductFilter("ALL");
    setSortBy("name_asc");
  }

  function handleSaveLeaveType(payload) {
    if (formModalState.mode === "create") {
      const nextId =
        cmsState.leaveTypes.reduce((max, lt) => Math.max(max, lt.id), 0) + 1;
      const newLeaveType = { id: nextId, ...payload };

      updateCmsState((prev) => ({
        ...prev,
        leaveTypes: [...prev.leaveTypes, newLeaveType],
      }));
      showToast(`Jenis cuti "${newLeaveType.name}" berhasil ditambahkan.`);
    } else {
      updateCmsState((prev) => ({
        ...prev,
        leaveTypes: prev.leaveTypes.map((lt) =>
          lt.id === payload.id ? { ...lt, ...payload } : lt
        ),
      }));
      showToast(`Konfigurasi "${payload.name}" berhasil diperbarui.`);
    }

    setFormModalState({ isOpen: false, mode: "create", leaveType: null });
  }

  function handleToggleActive(lt) {
    updateCmsState((prev) => ({
      ...prev,
      leaveTypes: prev.leaveTypes.map((item) =>
        item.id === lt.id ? { ...item, isActive: !item.isActive } : item
      ),
    }));
    showToast(
      `Jenis cuti "${lt.name}" diubah menjadi ${
        lt.isActive ? "Nonaktif" : "Aktif"
      }.`
    );
  }

  function handleResetSimulation() {
    const fresh = resetAdminCmsPreviewState();
    setCmsState(fresh);
    handleResetFilters();
    showToast("Data simulasi CMS Admin berhasil dikembalikan ke seed awal.");
  }

  const filterConfigs = [
    {
      key: "lt-status",
      label: "Filter Status",
      value: statusFilter,
      onChange: setStatusFilter,
      options: [
        { value: "ALL", label: "Status: Semua" },
        { value: "ACTIVE", label: "Aktif" },
        { value: "INACTIVE", label: "Nonaktif" },
      ],
    },
    {
      key: "lt-attachment",
      label: "Filter Syarat Lampiran",
      value: attachmentFilter,
      onChange: setAttachmentFilter,
      options: [
        { value: "ALL", label: "Lampiran: Semua" },
        { value: "REQUIRED", label: "Wajib Lampiran" },
        { value: "OPTIONAL", label: "Tanpa Lampiran" },
      ],
    },
    {
      key: "lt-deduct",
      label: "Filter Potong Kuota",
      value: deductFilter,
      onChange: setDeductFilter,
      options: [
        { value: "ALL", label: "Potong Kuota Thn: Semua" },
        { value: "YES", label: "Potong Kuota Tahunan" },
        { value: "NO", label: "Tidak Potong Kuota" },
      ],
    },
  ];

  const sortOptions = [
    { value: "name_asc", label: "Nama (A–Z)" },
    { value: "name_desc", label: "Nama (Z–A)" },
    { value: "quota_desc", label: "Kuota (Terbesar)" },
    { value: "quota_asc", label: "Kuota (Terkecil)" },
    { value: "lead_desc", label: "Batas Ajuan (H-n)" },
  ];

  return (
    <div className="space-y-6">
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed right-5 top-20 z-50 flex max-w-md items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800 shadow-lg"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              Manajemen Jenis Cuti Dinamis
            </h2>
            <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700">
              CMS Modul 4
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Atur kategori cuti (Tahunan, Sakit, dan Cuti Lainnya) secara dinamis
            beserta kuota maksimal, batas waktu H-n/H+n, dan syarat lampiran.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleResetSimulation}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-600 shadow-xs transition-colors duration-200 hover:bg-slate-50 hover:text-slate-900"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Reset Simulasi
          </button>
          <button
            type="button"
            onClick={() =>
              setFormModalState({
                isOpen: true,
                mode: "create",
                leaveType: null,
              })
            }
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm shadow-blue-600/20 transition-colors duration-200 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Tambah Jenis Cuti
          </button>
        </div>
      </div>

      {/* Ringkasan Statistik */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatsCard
          title="Total Jenis Cuti"
          value={`${stats.total} Kategori`}
          subtitle="Tersimpan dinamis di tabel leave_types"
          icon={<SlidersHorizontal className="h-5 w-5" aria-hidden="true" />}
          variant="blue"
        />
        <StatsCard
          title="Jenis Cuti Aktif"
          value={`${stats.active} Aktif`}
          subtitle={`${stats.inactive} kategori dinonaktifkan`}
          icon={<CheckCircle2 className="h-5 w-5" aria-hidden="true" />}
          variant="emerald"
        />
        <StatsCard
          title="Wajib Lampiran"
          value={`${stats.withAttachment} Kategori`}
          subtitle="Memerlukan bukti dokumen/surat dokter"
          icon={<Paperclip className="h-5 w-5" aria-hidden="true" />}
          variant="amber"
        />
      </div>

      {/* Toolbar */}
      <DataTableToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Cari kode, nama jenis cuti, atau deskripsi..."
        filters={filterConfigs}
        sortOptions={sortOptions}
        currentSort={sortBy}
        onSortChange={setSortBy}
        onReset={handleResetFilters}
        hasActiveFilters={hasActiveFilters}
        totalFiltered={filteredLeaveTypes.length}
        totalAll={cmsState.leaveTypes.length}
      />

      {/* Tabel Jenis Cuti */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {filteredLeaveTypes.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="Tidak ada jenis cuti yang cocok"
              description="Reset filter atau tambahkan kategori jenis cuti baru."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-600">
                <tr>
                  <th className="px-5 py-3.5">Kode &amp; Nama Jenis Cuti</th>
                  <th className="px-4 py-3.5">Kuota Maks</th>
                  <th className="px-4 py-3.5">Batas Ajuan</th>
                  <th className="px-4 py-3.5">Lampiran</th>
                  <th className="px-4 py-3.5">Potong Kuota Thn</th>
                  <th className="px-4 py-3.5">Syarat &gt;= 1 Thn</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredLeaveTypes.map((lt) => (
                  <tr
                    key={lt.id}
                    className="transition-colors duration-150 hover:bg-slate-50/80"
                  >
                    <td className="max-w-xs px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-700">
                          {lt.code}
                        </span>
                        <span className="font-semibold text-slate-900">
                          {lt.name}
                        </span>
                      </div>
                      {lt.description && (
                        <p className="mt-1 line-clamp-1 text-xs text-slate-500">
                          {lt.description}
                        </p>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-xs font-bold text-slate-900">
                      {Number(lt.maxQuota).toFixed(1)} Hari
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5">
                      <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-700">
                        {formatSubmissionLeadTime(lt.minSubmissionDays)} (
                        {lt.minSubmissionDays})
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5">
                      {lt.requiresAttachment ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                          <Paperclip className="h-3 w-3" aria-hidden="true" />
                          WAJIB
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500">Tidak</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5">
                      {lt.deductsAnnualQuota ? (
                        <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                          Ya (Kuota 12 Hr)
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500">Tidak</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-xs">
                      {lt.requiresMinOneYearTenure ? (
                        <span className="font-semibold text-purple-700">
                          Wajib (&gt;= 1 Thn)
                        </span>
                      ) : (
                        <span className="text-slate-500">Bebas</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5">
                      <StatusBadge status={lt.isActive ? "Aktif" : "Nonaktif"} />
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-right">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            setFormModalState({
                              isOpen: true,
                              mode: "edit",
                              leaveType: lt,
                            })
                          }
                          className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors duration-200 hover:bg-slate-100"
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleActive(lt)}
                          title={
                            lt.isActive
                              ? "Nonaktifkan jenis cuti ini"
                              : "Aktifkan kembali jenis cuti ini"
                          }
                          className={`inline-flex cursor-pointer items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors duration-200 ${
                            lt.isActive
                              ? "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                              : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          }`}
                        >
                          <Power className="h-3.5 w-3.5" aria-hidden="true" />
                          {lt.isActive ? "Nonaktifkan" : "Aktifkan"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modal Tambah / Edit Jenis Cuti */}
      <LeaveTypeFormModal
        isOpen={formModalState.isOpen}
        mode={formModalState.mode}
        initialLeaveType={formModalState.leaveType}
        existingLeaveTypes={cmsState.leaveTypes}
        onClose={() =>
          setFormModalState({ isOpen: false, mode: "create", leaveType: null })
        }
        onSubmit={handleSaveLeaveType}
      />
    </div>
  );
}
