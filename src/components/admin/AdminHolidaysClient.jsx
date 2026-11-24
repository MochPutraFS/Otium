"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CalendarOff,
  CalendarPlus,
  CheckCircle2,
  Loader2,
  Pencil,
  Power,
  RefreshCw,
  Save,
  Trash2,
  X,
} from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import StatusBadge from "@/components/ui/StatusBadge";
import DataTableToolbar from "@/components/ui/DataTableToolbar";
import { formatIndonesianDate } from "@/lib/date-utils";
import {
  createHolidayAction,
  deleteHolidayAction,
  toggleHolidayStatusAction,
  updateHolidayAction,
} from "@/actions/holiday-actions";

const HOLIDAY_TYPE_LABELS = {
  "National Holiday": "Libur Nasional",
  "Collective Leave": "Cuti Bersama",
};

/**
 * CMS Hari Libur Nasional & Cuti Bersama (/admin/holidays) — Fase 2 (8.3).
 * Akses: Admin & HRD. Terhubung realtime ke PostgreSQL via Server Actions & GET /api/admin/holidays.
 */
export default function AdminHolidaysClient({
  initialHolidays = [],
  todayIso = "",
  currentYear = 2026,
  actorRole = "Admin",
}) {
  const router = useRouter();
  const tableCaptionId = useId();
  const formDialogRef = useRef(null);
  const deleteDialogRef = useRef(null);
  const formTitleId = useId();
  const deleteTitleId = useId();

  const [holidays, setHolidays] = useState(initialHolidays);
  const [searchQuery, setSearchQuery] = useState("");
  const [yearFilter, setYearFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("date_asc");

  const [modalState, setModalState] = useState({
    isOpen: false,
    mode: "create",
    item: null,
  });
  const [holidayDate, setHolidayDate] = useState(todayIso);
  const [name, setName] = useState("");
  const [holidayType, setHolidayType] = useState("National Holiday");
  const [isActive, setIsActive] = useState(true);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formServerError, setFormServerError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const [togglingId, setTogglingId] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    setHolidays(initialHolidays);
  }, [initialHolidays]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  // Sinkronkan native <dialog> form modal
  useEffect(() => {
    const dialog = formDialogRef.current;
    if (!dialog) return;
    if (modalState.isOpen) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [modalState.isOpen]);

  // Sinkronkan native <dialog> delete modal
  useEffect(() => {
    const dialog = deleteDialogRef.current;
    if (!dialog) return;
    if (deleteTarget) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [deleteTarget]);

  function showToast(message, tone = "success") {
    setToast({ message, tone });
  }

  async function refreshFromApi({ silent = false } = {}) {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/admin/holidays", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        if (!silent) {
          showToast(data.error || "Gagal menyegarkan data hari libur.", "error");
        }
        return;
      }
      setHolidays(data.holidays || []);
      if (!silent) {
        showToast("Daftar hari libur disinkronkan dari PostgreSQL.");
      }
    } catch {
      if (!silent) {
        showToast("Koneksi terputus saat menyegarkan data hari libur.", "error");
      }
    } finally {
      setIsRefreshing(false);
    }
  }

  const yearOptions = useMemo(() => {
    const set = new Set([currentYear, ...holidays.map((h) => h.year)]);
    return Array.from(set).sort((a, b) => b - a);
  }, [holidays, currentYear]);

  const stats = useMemo(() => {
    const total = holidays.length;
    const active = holidays.filter((h) => h.isActive).length;
    const national = holidays.filter(
      (h) => h.isActive && h.holidayType === "National Holiday"
    ).length;
    const collective = holidays.filter(
      (h) => h.isActive && h.holidayType === "Collective Leave"
    ).length;
    const upcoming = holidays.filter(
      (h) => h.isActive && todayIso && h.holidayDate >= todayIso
    ).length;
    return { total, active, national, collective, upcoming };
  }, [holidays, todayIso]);

  const filteredHolidays = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = holidays.filter((item) => {
      if (q && !item.name.toLowerCase().includes(q) && !item.holidayDate.includes(q)) {
        return false;
      }
      if (yearFilter !== "ALL" && String(item.year) !== yearFilter) return false;
      if (typeFilter !== "ALL" && item.holidayType !== typeFilter) return false;
      if (statusFilter === "ACTIVE" && !item.isActive) return false;
      if (statusFilter === "INACTIVE" && item.isActive) return false;
      return true;
    });

    return [...list].sort((a, b) => {
      if (sortBy === "date_desc") return b.holidayDate.localeCompare(a.holidayDate);
      if (sortBy === "name_asc") return a.name.localeCompare(b.name, "id");
      return a.holidayDate.localeCompare(b.holidayDate);
    });
  }, [holidays, searchQuery, yearFilter, typeFilter, statusFilter, sortBy]);

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    yearFilter !== "ALL" ||
    typeFilter !== "ALL" ||
    statusFilter !== "ALL";

  function handleResetFilters() {
    setSearchQuery("");
    setYearFilter("ALL");
    setTypeFilter("ALL");
    setStatusFilter("ALL");
    setSortBy("date_asc");
  }

  function openCreateModal() {
    setHolidayDate(todayIso || `${currentYear}-01-01`);
    setName("");
    setHolidayType("National Holiday");
    setIsActive(true);
    setFieldErrors({});
    setFormServerError("");
    setModalState({ isOpen: true, mode: "create", item: null });
  }

  function openEditModal(item) {
    setHolidayDate(item.holidayDate);
    setName(item.name);
    setHolidayType(item.holidayType);
    setIsActive(Boolean(item.isActive));
    setFieldErrors({});
    setFormServerError("");
    setModalState({ isOpen: true, mode: "edit", item });
  }

  function closeFormModal() {
    if (isSaving) return;
    setModalState({ isOpen: false, mode: "create", item: null });
    setFieldErrors({});
    setFormServerError("");
  }

  async function handleSubmitForm(event) {
    event.preventDefault();
    if (isSaving) return;

    const errs = {};
    if (!/^\d{4}-\d{2}-\d{2}$/.test(holidayDate)) {
      errs.holidayDate = "Tanggal hari libur wajib diisi.";
    }
    if (name.trim().length < 3) {
      errs.name = "Nama hari libur wajib diisi minimal 3 karakter.";
    }
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }

    setIsSaving(true);
    setFieldErrors({});
    setFormServerError("");

    try {
      const payload = {
        holidayDate,
        name: name.trim(),
        holidayType,
        isActive,
      };
      const res =
        modalState.mode === "create"
          ? await createHolidayAction(payload)
          : await updateHolidayAction(modalState.item.id, payload);

      if (!res.ok) {
        setFormServerError(res.error || "Gagal menyimpan data hari libur.");
        if (res.fieldErrors) setFieldErrors(res.fieldErrors);
        return;
      }

      setModalState({ isOpen: false, mode: "create", item: null });
      showToast(res.message || "Data hari libur berhasil disimpan.");
      await refreshFromApi({ silent: true });
      router.refresh();
    } catch {
      setFormServerError("Gangguan koneksi saat menghubungi server.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleActive(item) {
    if (togglingId) return;
    setTogglingId(item.id);
    try {
      const res = await toggleHolidayStatusAction(item.id, !item.isActive);
      if (!res.ok) {
        showToast(res.error || "Gagal mengubah status hari libur.", "error");
        return;
      }
      showToast(res.message);
      await refreshFromApi({ silent: true });
      router.refresh();
    } catch {
      showToast("Koneksi terputus saat memperbarui status.", "error");
    } finally {
      setTogglingId(null);
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget || isDeleting) return;
    setIsDeleting(true);
    setDeleteError("");
    try {
      const res = await deleteHolidayAction(deleteTarget.id);
      if (!res.ok) {
        setDeleteError(res.error || "Gagal menghapus hari libur.");
        return;
      }
      setDeleteTarget(null);
      showToast(res.message || "Hari libur berhasil dihapus.");
      await refreshFromApi({ silent: true });
      router.refresh();
    } catch {
      setDeleteError("Koneksi terputus saat menghapus hari libur.");
    } finally {
      setIsDeleting(false);
    }
  }

  const filterConfigs = [
    {
      key: "year",
      label: "Filter Tahun",
      value: yearFilter,
      onChange: setYearFilter,
      options: [
        { value: "ALL", label: "Tahun: Semua" },
        ...yearOptions.map((y) => ({ value: String(y), label: String(y) })),
      ],
    },
    {
      key: "type",
      label: "Filter Kategori",
      value: typeFilter,
      onChange: setTypeFilter,
      options: [
        { value: "ALL", label: "Kategori: Semua" },
        { value: "National Holiday", label: "Libur Nasional" },
        { value: "Collective Leave", label: "Cuti Bersama" },
      ],
    },
    {
      key: "status",
      label: "Filter Status",
      value: statusFilter,
      onChange: setStatusFilter,
      options: [
        { value: "ALL", label: "Status: Semua" },
        { value: "ACTIVE", label: "Aktif" },
        { value: "INACTIVE", label: "Nonaktif" },
      ],
    },
  ];

  const sortOptions = [
    { value: "date_asc", label: "Tanggal (Terdekat)" },
    { value: "date_desc", label: "Tanggal (Terjauh)" },
    { value: "name_asc", label: "Nama (A–Z)" },
  ];

  return (
    <div className="space-y-6">
      {toast && (
        <div
          role={toast.tone === "error" ? "alert" : "status"}
          aria-live={toast.tone === "error" ? "assertive" : "polite"}
          className={`notice fixed right-5 top-20 z-50 max-w-md items-center shadow-lg ${
            toast.tone === "error" ? "notice-danger" : "notice-success"
          }`}
        >
          {toast.tone === "error" ? (
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          )}
          <span className="flex-1 text-[12.5px] font-medium">{toast.message}</span>
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

      {/* Header Editorial */}
      <header className="flex flex-col gap-4 border-b border-[var(--rule-strong)] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[var(--ink-muted)]">
            FASE 2 · KEBIJAKAN KALENDER ({actorRole.toUpperCase()})
          </p>
          <h1 className="mt-1 font-serif text-[28px] font-semibold leading-tight tracking-[-0.015em] text-[var(--ink)] sm:text-[32px]">
            Hari Libur Nasional &amp; Cuti Bersama
          </h1>
          <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-[var(--ink-soft)]">
            Tanggal aktif pada tabel ini otomatis dikecualikan oleh kalkulator
            durasi hari kerja pada formulir pengajuan cuti sehingga tidak
            memotong kuota karyawan.
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
            <CalendarPlus className="h-3.5 w-3.5" aria-hidden="true" />
            Tambah Hari Libur
          </button>
        </div>
      </header>

      {/* Metric Strip */}
      <section aria-label="Ringkasan statistik hari libur" className="metric-strip">
        <div className="metric-cell">
          <p className="metric-label">Total Terdaftar</p>
          <p className="metric-val tabular-nums">
            {stats.total} <small>Tanggal</small>
          </p>
          <p className="metric-note">{stats.active} tanggal berstatus Aktif</p>
        </div>
        <div className="metric-cell">
          <p className="metric-label">Libur Nasional Aktif</p>
          <p className="metric-val tabular-nums text-[var(--slate-blue)]">
            {stats.national} <small>Hari</small>
          </p>
          <p className="metric-note">Tanggal merah resmi pemerintah</p>
        </div>
        <div className="metric-cell">
          <p className="metric-label">Cuti Bersama Aktif</p>
          <p className="metric-val tabular-nums text-[var(--ochre)]">
            {stats.collective} <small>Hari</small>
          </p>
          <p className="metric-note">Dikecualikan dari potongan kuota</p>
        </div>
        <div className="metric-cell">
          <p className="metric-label">Akan Datang</p>
          <p className="metric-val tabular-nums text-[var(--spruce)]">
            {stats.upcoming} <small>Tanggal</small>
          </p>
          <p className="metric-note">Mulai dari hari ini ({todayIso})</p>
        </div>
      </section>

      <DataTableToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Cari nama hari libur atau tanggal (YYYY-MM-DD)..."
        filters={filterConfigs}
        sortOptions={sortOptions}
        currentSort={sortBy}
        onSortChange={setSortBy}
        onReset={handleResetFilters}
        hasActiveFilters={hasActiveFilters}
        totalFiltered={filteredHolidays.length}
        totalAll={holidays.length}
      />

      {/* Tabel Ledger Hari Libur */}
      <section className="panel overflow-hidden">
        {filteredHolidays.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="Belum ada tanggal hari libur yang cocok"
              description="Tambahkan Hari Libur Nasional atau Cuti Bersama baru, atau ubah filter pencarian Anda."
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
                Daftar Hari Libur Nasional dan Cuti Bersama perusahaan
              </caption>
              <thead>
                <tr>
                  <th scope="col" className="row-idx">
                    #
                  </th>
                  <th scope="col">Tanggal</th>
                  <th scope="col">Nama Hari Libur / Cuti Bersama</th>
                  <th scope="col">Kategori</th>
                  <th scope="col">Status</th>
                  <th scope="col">Ditambahkan Oleh</th>
                  <th scope="col" className="text-right">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredHolidays.map((item, idx) => (
                  <tr key={item.id}>
                    <td data-label="No" className="row-idx">
                      {String(idx + 1).padStart(2, "0")}
                    </td>
                    <td data-label="Tanggal" className="whitespace-nowrap">
                      <span className="mono font-semibold text-[var(--ink)]">
                        {formatIndonesianDate(item.holidayDate)}
                      </span>
                      <span className="mono block text-[10.5px] text-[var(--ink-muted)]">
                        {item.holidayDate}
                      </span>
                    </td>
                    <th scope="row" className="font-semibold text-[var(--ink)]">
                      {item.name}
                    </th>
                    <td data-label="Kategori" className="whitespace-nowrap">
                      <span
                        className={`tag ${
                          item.holidayType === "Collective Leave"
                            ? "tag-pending"
                            : "tag-leader"
                        }`}
                      >
                        {HOLIDAY_TYPE_LABELS[item.holidayType] || item.holidayType}
                      </span>
                    </td>
                    <td data-label="Status" className="whitespace-nowrap">
                      <StatusBadge status={item.isActive ? "Aktif" : "Nonaktif"} />
                    </td>
                    <td
                      data-label="Dibuat Oleh"
                      className="whitespace-nowrap text-xs text-[var(--ink-soft)]"
                    >
                      {item.createdByName}
                    </td>
                    <td data-label="Aksi" className="whitespace-nowrap text-right">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          className="btn btn-sm"
                        >
                          <Pencil className="h-3 w-3" aria-hidden="true" />
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={togglingId === item.id}
                          onClick={() => handleToggleActive(item)}
                          title={
                            item.isActive
                              ? "Nonaktifkan tanggal ini"
                              : "Aktifkan kembali tanggal ini"
                          }
                          className="btn btn-sm"
                        >
                          {togglingId === item.id ? (
                            <Loader2
                              className="h-3 w-3 animate-spin"
                              aria-hidden="true"
                            />
                          ) : (
                            <Power className="h-3 w-3" aria-hidden="true" />
                          )}
                          {item.isActive ? "Nonaktifkan" : "Aktifkan"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteError("");
                            setDeleteTarget(item);
                          }}
                          className="btn btn-sm btn-danger-ghost"
                        >
                          <Trash2 className="h-3 w-3" aria-hidden="true" />
                          Hapus
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

      {/* Native <dialog> Modal Tambah / Edit Hari Libur */}
      <dialog
        ref={formDialogRef}
        aria-labelledby={formTitleId}
        onCancel={(e) => {
          if (isSaving) e.preventDefault();
          else closeFormModal();
        }}
        className="otium-modal w-full max-w-lg"
      >
        <div className="flex w-full flex-col overflow-hidden rounded-[6px] border border-[var(--ink)] bg-[var(--paper-pure)] shadow-xl">
          <div className="flex items-start justify-between gap-4 border-b border-[var(--rule)] bg-[var(--alabaster)] px-5 py-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[4px] border border-[var(--rule-strong)] bg-[var(--paper-pure)] text-[var(--spruce)]">
                <CalendarOff className="h-4 w-4" aria-hidden="true" />
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--ink-muted)]">
                  {modalState.mode === "edit"
                    ? "PEMBARUAN TANGGAL MERAH"
                    : "ENTRI HARI LIBUR BARU"}
                </p>
                <h2
                  id={formTitleId}
                  className="mt-0.5 font-serif text-[20px] font-semibold text-[var(--ink)]"
                >
                  {modalState.mode === "edit"
                    ? "Edit Hari Libur"
                    : "Tambah Hari Libur / Cuti Bersama"}
                </h2>
              </div>
            </div>
            <button
              type="button"
              disabled={isSaving}
              onClick={closeFormModal}
              aria-label="Tutup dialog"
              className="btn-icon h-7 w-7 shrink-0"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <form
            id="holiday-form"
            noValidate
            onSubmit={handleSubmitForm}
            className="space-y-4 px-5 py-5"
          >
            {formServerError && (
              <div role="alert" className="notice notice-danger">
                <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{formServerError}</span>
              </div>
            )}

            <div>
              <label
                htmlFor="holiday-date"
                className="block text-xs font-semibold text-[var(--ink-soft)]"
              >
                Tanggal <span className="text-[var(--terracotta)]">*</span>
              </label>
              <input
                id="holiday-date"
                name="holidayDate"
                type="date"
                required
                value={holidayDate}
                onChange={(e) => {
                  setHolidayDate(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, holidayDate: "" }));
                }}
                aria-invalid={Boolean(fieldErrors.holidayDate)}
                className="input mono otium-field-input mt-1 w-full"
              />
              {fieldErrors.holidayDate && (
                <p className="mt-1 text-xs font-medium text-[var(--terracotta)]">
                  {fieldErrors.holidayDate}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="holiday-name"
                className="block text-xs font-semibold text-[var(--ink-soft)]"
              >
                Nama Hari Libur / Keterangan{" "}
                <span className="text-[var(--terracotta)]">*</span>
              </label>
              <input
                id="holiday-name"
                name="name"
                type="text"
                required
                minLength={3}
                maxLength={150}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, name: "" }));
                }}
                aria-invalid={Boolean(fieldErrors.name)}
                placeholder="Contoh: Hari Raya Idul Fitri 1448 H"
                className="input otium-field-input mt-1 w-full"
              />
              {fieldErrors.name && (
                <p className="mt-1 text-xs font-medium text-[var(--terracotta)]">
                  {fieldErrors.name}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="holiday-type"
                className="block text-xs font-semibold text-[var(--ink-soft)]"
              >
                Kategori <span className="text-[var(--terracotta)]">*</span>
              </label>
              <select
                id="holiday-type"
                name="holidayType"
                value={holidayType}
                onChange={(e) => setHolidayType(e.target.value)}
                className="select otium-field-input mt-1 w-full"
              >
                <option value="National Holiday">
                  Libur Nasional (National Holiday)
                </option>
                <option value="Collective Leave">
                  Cuti Bersama (Collective Leave)
                </option>
              </select>
            </div>

            <label className="otium-checkbox-label flex cursor-pointer items-center gap-3 rounded-[4px] border border-[var(--rule-strong)] bg-[var(--alabaster)] px-3.5 py-2.5">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="otium-checkbox h-4 w-4 cursor-pointer"
              />
              <span className="text-[12.5px] font-medium text-[var(--ink)]">
                Aktif (dikecualikan otomatis dari kalkulator hari kerja cuti)
              </span>
            </label>
          </form>

          <div className="flex items-center justify-end gap-2 border-t border-[var(--rule)] bg-[var(--alabaster)] px-5 py-3.5">
            <button
              type="button"
              disabled={isSaving}
              onClick={closeFormModal}
              className="btn btn-sm"
            >
              Batal
            </button>
            <button
              type="submit"
              form="holiday-form"
              disabled={isSaving}
              className="btn btn-primary btn-sm"
            >
              {isSaving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Save className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {isSaving ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </div>
      </dialog>

      {/* Native <dialog> Konfirmasi Hapus */}
      <dialog
        ref={deleteDialogRef}
        aria-labelledby={deleteTitleId}
        onCancel={(e) => {
          if (isDeleting) e.preventDefault();
          else setDeleteTarget(null);
        }}
        className="otium-modal w-full max-w-md"
      >
        <div className="flex w-full flex-col overflow-hidden rounded-[6px] border border-[var(--ink)] bg-[var(--paper-pure)] shadow-xl">
          <div className="border-b border-[var(--rule)] bg-[var(--alabaster)] px-5 py-4">
            <h2
              id={deleteTitleId}
              className="font-serif text-lg font-semibold text-[var(--ink)]"
            >
              Hapus Hari Libur?
            </h2>
            <p className="mt-1 text-xs text-[var(--ink-soft)]">
              Tanggal{" "}
              <strong className="mono text-[var(--ink)]">
                {deleteTarget?.holidayDate}
              </strong>{" "}
              ({deleteTarget?.name}) akan dihapus dari master hari libur.
            </p>
          </div>
          {deleteError && (
            <div className="px-5 pt-4">
              <div role="alert" className="notice notice-danger">
                <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{deleteError}</span>
              </div>
            </div>
          )}
          <div className="flex items-center justify-end gap-2 px-5 py-4">
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => setDeleteTarget(null)}
              className="btn btn-sm"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={handleConfirmDelete}
              className="btn btn-danger btn-sm"
            >
              {isDeleting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {isDeleting ? "Menghapus..." : "Hapus Permanen"}
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
