"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
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
 * Workspace CMS Modul 4: Manajemen Jenis Cuti Dinamis (/admin/leave-types) — Swiss Archival.
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

  function handleColumnSort(col) {
    if (col === "name") {
      setSortBy((prev) => (prev === "name_asc" ? "name_desc" : "name_asc"));
    } else if (col === "quota") {
      setSortBy((prev) => (prev === "quota_desc" ? "quota_asc" : "quota_desc"));
    } else if (col === "lead") {
      setSortBy("lead_desc");
    }
  }

  function getAriaSort(col) {
    if (col === "name") {
      if (sortBy === "name_asc") return "ascending";
      if (sortBy === "name_desc") return "descending";
    }
    if (col === "quota") {
      if (sortBy === "quota_asc") return "ascending";
      if (sortBy === "quota_desc") return "descending";
    }
    if (col === "lead" && sortBy === "lead_desc") return "descending";
    return "none";
  }

  function renderSortIcon(col) {
    const dir = getAriaSort(col);
    if (dir === "ascending") {
      return <ArrowUp className="h-3 w-3 shrink-0" aria-hidden="true" />;
    }
    if (dir === "descending") {
      return <ArrowDown className="h-3 w-3 shrink-0" aria-hidden="true" />;
    }
    return (
      <ArrowUpDown
        className="h-3 w-3 shrink-0 opacity-45"
        aria-hidden="true"
      />
    );
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

  return (
    <div className="space-y-6">
      {/* Notifikasi Status / Error */}
      {toast && (
        <div
          role={toast.tone === "error" ? "alert" : "status"}
          aria-live={toast.tone === "error" ? "assertive" : "polite"}
          className={`notice fixed right-5 top-20 z-50 max-w-md items-center shadow-[var(--shadow-lg)] ${
            toast.tone === "error" ? "notice-danger" : "notice-success"
          }`}
        >
          {toast.tone === "error" ? (
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          )}
          <span className="flex-1 text-[12.5px] font-medium">
            {toast.message}
          </span>
          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Tutup notifikasi"
            className="btn-icon h-6 w-6 shrink-0"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Header Editorial Halaman */}
      <header className="flex flex-col gap-4 border-b border-[var(--rule-strong)] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[var(--ink-muted)]">
            CMS MODUL 04 · KONFIGURASI CUTI DINAMIS
          </p>
          <h1 className="mt-1 font-serif text-[28px] font-semibold leading-tight tracking-[-0.015em] text-[var(--ink)] sm:text-[32px]">
            Manajemen Jenis Cuti Dinamis
          </h1>
          <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-[var(--ink-soft)]">
            Atur seluruh kategori cuti (Tahunan, Sakit, dan Cuti Lainnya) secara
            dinamis dari PostgreSQL beserta kuota maksimal, batas waktu H-n/H+n,
            syarat lampiran, dan masa kerja.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={isRefreshing}
            onClick={() => refreshFromApi({ silent: false })}
            className="btn btn-sm"
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
            className="btn btn-primary btn-sm"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Tambah Jenis Cuti
          </button>
        </div>
      </header>

      {/* Metric Strip Swiss Archival (3 Kolom) */}
      <section
        aria-label="Ringkasan kategori jenis cuti"
        className="metric-strip lg:!grid-cols-3"
      >
        <div className="metric-cell">
          <p className="metric-label">Total Jenis Cuti</p>
          <p className="metric-val tabular-nums">
            {stats.total} <small>Kategori</small>
          </p>
          <p className="metric-note">
            {stats.deductsAnnual} kategori memotong kuota tahunan
          </p>
        </div>

        <div className="metric-cell">
          <p className="metric-label">Jenis Cuti Aktif</p>
          <p className="metric-val tabular-nums text-[var(--spruce)]">
            {stats.active} <small>Aktif</small>
          </p>
          <p className="metric-note">
            {stats.inactive} kategori dinonaktifkan dari form
          </p>
        </div>

        <div className="metric-cell">
          <p className="metric-label">Wajib Lampiran Bukti</p>
          <p className="metric-val tabular-nums text-[var(--ochre)]">
            {stats.withAttachment} <small>Kategori</small>
          </p>
          <p className="metric-note">
            Memerlukan unggahan surat dokter / dokumen
          </p>
        </div>
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

      {/* Ledger Jenis Cuti Dinamis */}
      <section className="panel overflow-hidden">
        {filteredLeaveTypes.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="Tidak ada jenis cuti yang cocok"
              description="Reset filter pencarian atau tambahkan kategori jenis cuti baru."
            />
          </div>
        ) : (
          <>
            {/* Desktop Sortable Swiss Ledger Table */}
            <div
              tabIndex={0}
              role="region"
              aria-labelledby={tableCaptionId}
              className="hidden overflow-x-auto focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--spruce)] md:block"
            >
              <table className="ledger">
                <caption id={tableCaptionId} className="sr-only">
                  Daftar konfigurasi jenis cuti dinamis pada tabel leave_types
                </caption>
                <thead>
                  <tr>
                    <th scope="col" className="w-11 text-center">
                      No.
                    </th>
                    <th scope="col" aria-sort={getAriaSort("name")}>
                      <button
                        type="button"
                        onClick={() => handleColumnSort("name")}
                      >
                        <span>Kode &amp; Nama Jenis Cuti</span>
                        {renderSortIcon("name")}
                      </button>
                    </th>
                    <th scope="col" aria-sort={getAriaSort("quota")}>
                      <button
                        type="button"
                        onClick={() => handleColumnSort("quota")}
                      >
                        <span>Kuota Maks</span>
                        {renderSortIcon("quota")}
                      </button>
                    </th>
                    <th scope="col" aria-sort={getAriaSort("lead")}>
                      <button
                        type="button"
                        onClick={() => handleColumnSort("lead")}
                      >
                        <span>Batas Ajuan</span>
                        {renderSortIcon("lead")}
                      </button>
                    </th>
                    <th scope="col">Lampiran</th>
                    <th scope="col">Potong Kuota Thn</th>
                    <th scope="col">Masa Kerja</th>
                    <th scope="col">Status</th>
                    <th scope="col" className="text-right">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeaveTypes.map((lt, idx) => {
                    const isRowToggling = togglingId === lt.id;
                    return (
                      <tr key={lt.id}>
                        <td className="row-idx text-center">
                          {String(idx + 1).padStart(2, "0")}
                        </td>
                        <th scope="row" className="max-w-xs font-normal">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="tag font-mono text-[10.5px]">
                              {lt.isCore && (
                                <Lock className="h-2.5 w-2.5" aria-hidden="true" />
                              )}
                              {lt.code}
                            </span>
                            <span className="text-[13px] font-semibold text-[var(--ink)]">
                              {lt.name}
                            </span>
                          </div>
                          {lt.description && (
                            <p className="mt-1 line-clamp-1 text-[11.5px] text-[var(--ink-soft)]">
                              {lt.description}
                            </p>
                          )}
                          <p className="mt-1 flex items-center gap-1 font-mono text-[10.5px] text-[var(--ink-muted)]">
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

                        <td className="whitespace-nowrap font-mono text-[12.5px] font-semibold tabular-nums text-[var(--ink)]">
                          {Number(lt.maxQuota).toFixed(1)} Hari
                        </td>

                        <td className="whitespace-nowrap">
                          <span className="tag font-mono tabular-nums">
                            <Clock className="h-3 w-3" aria-hidden="true" />
                            {formatSubmissionLeadTime(lt.minSubmissionDays)} (
                            {lt.minSubmissionDays})
                          </span>
                        </td>

                        <td className="whitespace-nowrap">
                          {lt.requiresAttachment ? (
                            <span className="tag tag-pending">
                              <Paperclip className="h-3 w-3" aria-hidden="true" />
                              Wajib
                            </span>
                          ) : (
                            <span className="text-[12px] text-[var(--ink-muted)]">
                              Tidak
                            </span>
                          )}
                        </td>

                        <td className="whitespace-nowrap">
                          {lt.deductsAnnualQuota ? (
                            <span className="tag tag-leader">
                              Ya (Kuota 12 Hr)
                            </span>
                          ) : (
                            <span className="text-[12px] text-[var(--ink-muted)]">
                              Tidak
                            </span>
                          )}
                        </td>

                        <td className="whitespace-nowrap text-[12px]">
                          {lt.requiresMinOneYearTenure ? (
                            <span className="inline-flex items-center gap-1 font-medium text-[var(--ink)]">
                              <ShieldCheck
                                className="h-3.5 w-3.5 text-[var(--spruce)]"
                                aria-hidden="true"
                              />
                              &gt;= 1 Tahun
                            </span>
                          ) : (
                            <span className="text-[var(--ink-muted)]">Bebas</span>
                          )}
                        </td>

                        <td className="whitespace-nowrap">
                          <StatusBadge
                            status={lt.isActive ? "Aktif" : "Nonaktif"}
                          />
                        </td>

                        <td className="whitespace-nowrap text-right">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEditModal(lt)}
                              disabled={isRowToggling}
                              className="btn btn-sm w-[68px] justify-center"
                            >
                              <Pencil className="h-3 w-3" aria-hidden="true" />
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
                              className={`btn btn-sm w-[116px] justify-center ${
                                lt.isActive ? "" : "btn-primary"
                              }`}
                            >
                              {isRowToggling ? (
                                <Loader2
                                  className="h-3 w-3 animate-spin"
                                  aria-hidden="true"
                                />
                              ) : (
                                <Power className="h-3 w-3" aria-hidden="true" />
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

            {/* Mobile Ledger Cards (< md) */}
            <div className="divide-y divide-[var(--rule)] md:hidden">
              {filteredLeaveTypes.map((lt, idx) => {
                const isRowToggling = togglingId === lt.id;
                return (
                  <article key={lt.id} className="ledger-card">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="tag font-mono text-[10px]">
                            {lt.isCore && (
                              <Lock className="h-2.5 w-2.5" aria-hidden="true" />
                            )}
                            {lt.code}
                          </span>
                          <StatusBadge
                            status={lt.isActive ? "Aktif" : "Nonaktif"}
                          />
                        </div>
                        <p className="mt-1.5 font-serif text-[17px] font-semibold text-[var(--ink)]">
                          {lt.name}
                        </p>
                        {lt.description && (
                          <p className="mt-0.5 text-[12px] text-[var(--ink-soft)]">
                            {lt.description}
                          </p>
                        )}
                      </div>
                      <span className="font-mono text-[10.5px] text-[var(--ink-muted)]">
                        #{String(idx + 1).padStart(2, "0")}
                      </span>
                    </div>

                    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-[var(--rule)] pt-3 text-[12px]">
                      <div>
                        <dt className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--ink-muted)]">
                          Kuota Maks
                        </dt>
                        <dd className="mt-0.5 font-mono font-semibold tabular-nums text-[var(--ink)]">
                          {Number(lt.maxQuota).toFixed(1)} Hari
                        </dd>
                      </div>
                      <div>
                        <dt className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--ink-muted)]">
                          Batas Ajuan
                        </dt>
                        <dd className="mt-0.5 font-mono text-[11.5px] tabular-nums text-[var(--ink)]">
                          {formatSubmissionLeadTime(lt.minSubmissionDays)} (
                          {lt.minSubmissionDays})
                        </dd>
                      </div>
                      <div>
                        <dt className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--ink-muted)]">
                          Lampiran / Masa Kerja
                        </dt>
                        <dd className="mt-0.5 text-[11.5px] text-[var(--ink-soft)]">
                          {lt.requiresAttachment ? "Wajib" : "Opsional"} ·{" "}
                          {lt.requiresMinOneYearTenure ? "≥ 1 Thn" : "Bebas"}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--ink-muted)]">
                          Potong Kuota Thn
                        </dt>
                        <dd className="mt-0.5 text-[11.5px] text-[var(--ink-soft)]">
                          {lt.deductsAnnualQuota ? "Ya (12 Hr)" : "Tidak"}
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-3 flex items-center justify-end gap-2 border-t border-[var(--rule)] pt-3">
                      <button
                        type="button"
                        onClick={() => openEditModal(lt)}
                        disabled={isRowToggling}
                        className="btn btn-sm"
                      >
                        <Pencil className="h-3 w-3" aria-hidden="true" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleActive(lt)}
                        disabled={togglingId !== null}
                        className={`btn btn-sm ${
                          lt.isActive ? "" : "btn-primary"
                        }`}
                      >
                        {isRowToggling ? (
                          <Loader2
                            className="h-3 w-3 animate-spin"
                            aria-hidden="true"
                          />
                        ) : (
                          <Power className="h-3 w-3" aria-hidden="true" />
                        )}
                        {lt.isActive ? "Nonaktifkan" : "Aktifkan"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
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
