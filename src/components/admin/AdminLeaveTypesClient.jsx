"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  Lock,
  Paperclip,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import EmptyState from "@/components/ui/EmptyState";
import DataTableToolbar from "@/components/ui/DataTableToolbar";
import LeaveTypeFormModal from "@/components/admin/LeaveTypeFormModal";
import { formatSubmissionLeadTime } from "@/lib/leave-type-utils";
import {
  saveLeaveTypeAction,
  toggleLeaveTypeStatusAction,
} from "@/actions/leave-type-actions";

/**
 * Workspace CMS Modul 4: Manajemen Jenis Cuti Dinamis (/admin/leave-types) — Pure Production.
 * Terhubung ke PostgreSQL via Server Component initial load, Server Actions (`saveLeaveTypeAction`,
 * `toggleLeaveTypeStatusAction`), dan Route Handler `GET /api/admin/leave-types`.
 */
export default function AdminLeaveTypesClient({
  initialLeaveTypes = [],
  initialStats = {
    total: 0,
    active: 0,
    inactive: 0,
    withAttachment: 0,
    deductsAnnual: 0,
  },
}) {
  const router = useRouter();
  const tableCaptionId = useId();

  const [leaveTypes, setLeaveTypes] = useState(initialLeaveTypes);
  const [stats, setStats] = useState(initialStats);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [attachmentFilter, setAttachmentFilter] = useState("ALL");
  const [deductFilter, setDeductFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("default");

  const [formModalState, setFormModalState] = useState({
    isOpen: false,
    mode: "create",
    leaveType: null,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [formServerError, setFormServerError] = useState("");
  const [formServerFieldErrors, setFormServerFieldErrors] = useState(null);

  const [togglingId, setTogglingId] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toast, setToast] = useState(null); // { message: string, tone: "success" | "error" }

  useEffect(() => {
    setLeaveTypes(initialLeaveTypes);
  }, [initialLeaveTypes]);

  useEffect(() => {
    setStats(initialStats);
  }, [initialStats]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function showToast(message, tone = "success") {
    setToast({ message, tone });
  }

  async function refreshFromApi({ silent = false } = {}) {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/admin/leave-types", {
        method: "GET",
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        if (!silent) {
          showToast(
            data.error || "Gagal menyinkronkan data jenis cuti dari server.",
            "error"
          );
        }
        return;
      }
      setLeaveTypes(data.leaveTypes || []);
      if (data.stats) {
        setStats(data.stats);
      }
      if (!silent) {
        showToast("Daftar jenis cuti disinkronkan dari PostgreSQL.");
      }
    } catch {
      if (!silent) {
        showToast("Koneksi jaringan bermasalah saat memuat ulang data.", "error");
      }
    } finally {
      setIsRefreshing(false);
    }
  }

  const filteredLeaveTypes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const list = leaveTypes.filter((lt) => {
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

    if (sortBy === "default") {
      return list;
    }

    return [...list].sort((a, b) => {
      switch (sortBy) {
        case "name_asc":
          return a.name.localeCompare(b.name, "id");
        case "name_desc":
          return b.name.localeCompare(a.name, "id");
        case "quota_desc":
          return Number(b.maxQuota) - Number(a.maxQuota);
        case "quota_asc":
          return Number(a.maxQuota) - Number(b.maxQuota);
        case "lead_desc":
          return Number(b.minSubmissionDays) - Number(a.minSubmissionDays);
        case "usage_desc":
          return Number(b.usageCount || 0) - Number(a.usageCount || 0);
        default:
          return 0;
      }
    });
  }, [
    leaveTypes,
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
    setSortBy("default");
  }

  function openCreateModal() {
    setFormServerError("");
    setFormServerFieldErrors(null);
    setFormModalState({ isOpen: true, mode: "create", leaveType: null });
  }

  function openEditModal(lt) {
    setFormServerError("");
    setFormServerFieldErrors(null);
    setFormModalState({ isOpen: true, mode: "edit", leaveType: lt });
  }

  function closeFormModal() {
    if (isSaving) return;
    setFormServerError("");
    setFormServerFieldErrors(null);
    setFormModalState({ isOpen: false, mode: "create", leaveType: null });
  }

  async function handleSaveLeaveType(payload) {
    setIsSaving(true);
    setFormServerError("");
    setFormServerFieldErrors(null);

    try {
      const result = await saveLeaveTypeAction(payload);
      if (!result.ok) {
        setFormServerError(
          result.error ||
            "Gagal menyimpan jenis cuti. Periksa kembali konfigurasi."
        );
        if (result.fieldErrors) {
          setFormServerFieldErrors(result.fieldErrors);
        }
        return;
      }

      setFormModalState({ isOpen: false, mode: "create", leaveType: null });
      showToast(result.message || "Konfigurasi jenis cuti berhasil disimpan.");
      await refreshFromApi({ silent: true });
      router.refresh();
    } catch {
      setFormServerError(
        "Terjadi kesalahan jaringan saat menyimpan jenis cuti."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleActive(lt) {
    if (togglingId !== null) return;
    setTogglingId(lt.id);

    try {
      const result = await toggleLeaveTypeStatusAction(lt.id, !lt.isActive);
      if (!result.ok) {
        showToast(
          result.error || "Gagal mengubah status aktif jenis cuti.",
          "error"
        );
        return;
      }

      showToast(result.message || "Status jenis cuti berhasil diperbarui.");
      await refreshFromApi({ silent: true });
      router.refresh();
    } catch {
      showToast("Koneksi bermasalah saat mengubah status jenis cuti.", "error");
    } finally {
      setTogglingId(null);
    }
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
    { value: "default", label: "Urutan Baku (Inti -> A–Z)" },
    { value: "name_asc", label: "Nama (A–Z)" },
    { value: "name_desc", label: "Nama (Z–A)" },
    { value: "quota_desc", label: "Kuota (Terbesar)" },
    { value: "quota_asc", label: "Kuota (Terkecil)" },
    { value: "lead_desc", label: "Batas Ajuan (H-n)" },
    { value: "usage_desc", label: "Pemakaian (Terbanyak)" },
  ];

  const statCards = [
    {
      label: "Total Jenis Cuti",
      value: `${stats.total}`,
      unit: "Kategori",
      subtitle: `${stats.deductsAnnual} kategori memotong kuota tahunan`,
      icon: SlidersHorizontal,
      accentClass: "text-slate-900 bg-[#F4F2EC] border-stone-200",
    },
    {
      label: "Jenis Cuti Aktif",
      value: `${stats.active}`,
      unit: "Aktif",
      subtitle: `${stats.inactive} kategori dinonaktifkan dari form`,
      icon: CheckCircle2,
      accentClass: "text-emerald-800 bg-emerald-50 border-emerald-200/80",
    },
    {
      label: "Wajib Lampiran Bukti",
      value: `${stats.withAttachment}`,
      unit: "Kategori",
      subtitle: "Memerlukan unggahan surat dokter / dokumen",
      icon: Paperclip,
      accentClass: "text-amber-800 bg-amber-50 border-amber-200/80",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Notifikasi Status / Error */}
      {toast && (
        <div
          role={toast.tone === "error" ? "alert" : "status"}
          aria-live={toast.tone === "error" ? "assertive" : "polite"}
          className={`fixed right-5 top-20 z-50 flex max-w-md items-center gap-2.5 rounded-lg border px-4 py-3 text-xs font-semibold shadow-lg ${
            toast.tone === "error"
              ? "border-rose-300 bg-rose-50 text-rose-950"
              : "border-emerald-300 bg-emerald-50 text-emerald-950"
          }`}
        >
          {toast.tone === "error" ? (
            <AlertCircle
              className="h-4 w-4 shrink-0 text-rose-700"
              aria-hidden="true"
            />
          ) : (
            <CheckCircle2
              className="h-4 w-4 shrink-0 text-emerald-700"
              aria-hidden="true"
            />
          )}
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Tutup notifikasi"
            className="ml-1 cursor-pointer rounded p-0.5 opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-slate-900"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Header Editorial Halaman */}
      <header className="flex flex-col gap-4 border-b border-stone-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
            CMS Modul 04 · Konfigurasi Cuti Dinamis
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Manajemen Jenis Cuti Dinamis
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-600">
            Atur seluruh kategori cuti (Tahunan, Sakit, dan Cuti Lainnya) secara
            dinamis dari PostgreSQL beserta kuota maksimal, batas waktu H-n/H+n,
            syarat lampiran, dan masa kerja.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            disabled={isRefreshing}
            onClick={() => refreshFromApi({ silent: false })}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-800 transition-colors duration-150 hover:bg-[#F4F2EC] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            Muat Ulang
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white transition-colors duration-150 hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Tambah Jenis Cuti
          </button>
        </div>
      </header>

      {/* Ringkasan Statistik Editorial */}
      <section
        aria-label="Ringkasan kategori jenis cuti"
        className="grid grid-cols-1 gap-4 sm:grid-cols-3"
      >
        {statCards.map((card) => {
          const IconComponent = card.icon;
          return (
            <article
              key={card.label}
              className="flex items-start justify-between gap-4 rounded-xl border border-stone-200 bg-white p-5"
            >
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                  {card.label}
                </p>
                <p className="mt-2 flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold tracking-tight tabular-nums text-slate-900">
                    {card.value}
                  </span>
                  <span className="text-xs font-semibold text-slate-600">
                    {card.unit}
                  </span>
                </p>
                <p className="mt-1.5 text-xs text-slate-600">{card.subtitle}</p>
              </div>
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${card.accentClass}`}
              >
                <IconComponent className="h-5 w-5" aria-hidden="true" />
              </div>
            </article>
          );
        })}
      </section>

      {/* Toolbar Pencarian, Filter & Sort */}
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
        totalAll={leaveTypes.length}
      />

      {/* Tabel Responsif Jenis Cuti Dinamis */}
      <section className="overflow-hidden rounded-xl border border-stone-200 bg-white">
        {filteredLeaveTypes.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="Tidak ada jenis cuti yang cocok"
              description="Reset filter pencarian atau tambahkan kategori jenis cuti baru."
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
                Daftar konfigurasi jenis cuti dinamis pada tabel leave_types
              </caption>
              <thead className="border-b border-stone-200 bg-[#FAF9F6] text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                <tr>
                  <th scope="col" className="px-5 py-3.5">
                    Kode &amp; Nama Jenis Cuti
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Kuota Maks
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Batas Ajuan
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Lampiran
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Potong Kuota Thn
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Masa Kerja
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Status
                  </th>
                  <th scope="col" className="px-5 py-3.5 text-right">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 bg-white">
                {filteredLeaveTypes.map((lt) => {
                  const isRowToggling = togglingId === lt.id;
                  return (
                    <tr
                      key={lt.id}
                      className="transition-colors duration-150 hover:bg-[#FAF9F6]"
                    >
                      <th
                        scope="row"
                        className="max-w-xs px-5 py-3.5 font-normal"
                      >
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 rounded border border-stone-300 bg-[#F4F2EC] px-2 py-0.5 font-mono text-[11px] font-bold text-slate-800">
                            {lt.isCore && (
                              <Lock
                                className="h-2.5 w-2.5 text-slate-600"
                                aria-hidden="true"
                              />
                            )}
                            {lt.code}
                          </span>
                          <span className="font-semibold text-slate-900">
                            {lt.name}
                          </span>
                        </div>
                        {lt.description && (
                          <p className="mt-1 line-clamp-1 text-xs text-slate-600">
                            {lt.description}
                          </p>
                        )}
                        <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
                          <FileText
                            className="h-3 w-3 shrink-0"
                            aria-hidden="true"
                          />
                          <span className="tabular-nums">
                            {lt.usageCount > 0
                              ? `${lt.usageCount} riwayat pengajuan`
                              : "Belum ada transaksi"}
                          </span>
                        </p>
                      </th>

                      <td
                        data-label="Kuota Maks"
                        className="whitespace-nowrap px-4 py-3.5 text-xs font-bold tabular-nums text-slate-900"
                      >
                        {Number(lt.maxQuota).toFixed(1)} Hari
                      </td>

                      <td
                        data-label="Batas Ajuan"
                        className="whitespace-nowrap px-4 py-3.5"
                      >
                        <span className="inline-flex items-center gap-1 rounded border border-stone-300 bg-[#F4F2EC] px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-800">
                          <Clock
                            className="h-3 w-3 text-slate-600"
                            aria-hidden="true"
                          />
                          {formatSubmissionLeadTime(lt.minSubmissionDays)} (
                          {lt.minSubmissionDays})
                        </span>
                      </td>

                      <td
                        data-label="Lampiran"
                        className="whitespace-nowrap px-4 py-3.5"
                      >
                        {lt.requiresAttachment ? (
                          <span className="inline-flex items-center gap-1 rounded border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-900">
                            <Paperclip className="h-3 w-3" aria-hidden="true" />
                            Wajib
                          </span>
                        ) : (
                          <span className="text-xs text-slate-600">Tidak</span>
                        )}
                      </td>

                      <td
                        data-label="Potong Kuota Thn"
                        className="whitespace-nowrap px-4 py-3.5"
                      >
                        {lt.deductsAnnualQuota ? (
                          <span className="inline-flex items-center rounded border border-slate-300 bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-900">
                            Ya (Kuota 12 Hr)
                          </span>
                        ) : (
                          <span className="text-xs text-slate-600">Tidak</span>
                        )}
                      </td>

                      <td
                        data-label="Masa Kerja"
                        className="whitespace-nowrap px-4 py-3.5 text-xs"
                      >
                        {lt.requiresMinOneYearTenure ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-slate-900">
                            <ShieldCheck
                              className="h-3.5 w-3.5 text-slate-700"
                              aria-hidden="true"
                            />
                            &gt;= 1 Tahun
                          </span>
                        ) : (
                          <span className="text-slate-600">Bebas</span>
                        )}
                      </td>

                      <td
                        data-label="Status"
                        className="whitespace-nowrap px-4 py-3.5"
                      >
                        <StatusBadge
                          status={lt.isActive ? "Aktif" : "Nonaktif"}
                        />
                      </td>

                      <td
                        data-label="Aksi"
                        className="whitespace-nowrap px-5 py-3.5 text-right"
                      >
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(lt)}
                            disabled={isRowToggling}
                            className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 transition-colors duration-150 hover:bg-[#F4F2EC] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Pencil
                              className="h-3.5 w-3.5"
                              aria-hidden="true"
                            />
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleActive(lt)}
                            disabled={togglingId !== null}
                            aria-label={
                              lt.isActive
                                ? `Nonaktifkan ${lt.name}`
                                : `Aktifkan ${lt.name}`
                            }
                            className={`inline-flex cursor-pointer items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:opacity-60 ${
                              lt.isActive
                                ? "border-stone-300 bg-[#FAF9F6] text-slate-700 hover:bg-stone-200/70 hover:text-slate-900"
                                : "border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100"
                            }`}
                          >
                            {isRowToggling ? (
                              <Loader2
                                className="h-3.5 w-3.5 animate-spin"
                                aria-hidden="true"
                              />
                            ) : (
                              <Power
                                className="h-3.5 w-3.5"
                                aria-hidden="true"
                              />
                            )}
                            {lt.isActive ? "Nonaktifkan" : "Aktifkan"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modal Native <dialog> Tambah / Edit Jenis Cuti */}
      <LeaveTypeFormModal
        isOpen={formModalState.isOpen}
        mode={formModalState.mode}
        initialLeaveType={formModalState.leaveType}
        existingLeaveTypes={leaveTypes}
        isSubmitting={isSaving}
        serverError={formServerError}
        serverFieldErrors={formServerFieldErrors}
        onClose={closeFormModal}
        onSubmit={handleSaveLeaveType}
      />
    </div>
  );
}
