"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  Save,
  ShieldAlert,
  Trash2,
  Users,
  X,
} from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatIndonesianDateRange } from "@/lib/date-utils";
import {
  createBlackoutPeriodAction,
  deleteBlackoutPeriodAction,
  toggleBlackoutPeriodStatusAction,
  updateBlackoutPeriodAction,
  updateDivisionCapacityAction,
} from "@/actions/policy-actions";

/**
 * CMS Fase 2 (8.6): Kapasitas Tim & Periode Blackout (/admin/policies).
 * Akses: Admin & HRD.
 */
export default function AdminPoliciesClient({
  initialBlackouts = [],
  initialDivisions = [],
  todayIso = "",
  actorRole = "Admin",
}) {
  const router = useRouter();
  const capacityCaptionId = useId();
  const blackoutCaptionId = useId();
  const formDialogRef = useRef(null);
  const deleteDialogRef = useRef(null);
  const formTitleId = useId();
  const deleteTitleId = useId();

  const [blackouts, setBlackouts] = useState(initialBlackouts);
  const [divisions, setDivisions] = useState(initialDivisions);
  const [capacityDrafts, setCapacityDrafts] = useState(() =>
    Object.fromEntries(
      initialDivisions.map((d) => [d.id, String(d.maxConcurrentLeavePct ?? 30)])
    )
  );
  const [savingDivId, setSavingDivId] = useState(null);

  const [modalState, setModalState] = useState({
    isOpen: false,
    mode: "create",
    item: null,
  });
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState(todayIso);
  const [endDate, setEndDate] = useState(todayIso);
  const [divisionId, setDivisionId] = useState("");
  const [reason, setReason] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formServerError, setFormServerError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    setBlackouts(initialBlackouts);
  }, [initialBlackouts]);

  useEffect(() => {
    setDivisions(initialDivisions);
    setCapacityDrafts(
      Object.fromEntries(
        initialDivisions.map((d) => [
          d.id,
          String(d.maxConcurrentLeavePct ?? 30),
        ])
      )
    );
  }, [initialDivisions]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const dialog = formDialogRef.current;
    if (!dialog) return;
    if (modalState.isOpen) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [modalState.isOpen]);

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
      const res = await fetch("/api/admin/policies", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        if (!silent) {
          showToast(data.error || "Gagal menyegarkan data kebijakan.", "error");
        }
        return;
      }
      setBlackouts(data.blackoutPeriods || []);
      setDivisions(data.divisions || []);
      setCapacityDrafts(
        Object.fromEntries(
          (data.divisions || []).map((d) => [
            d.id,
            String(d.maxConcurrentLeavePct ?? 30),
          ])
        )
      );
      if (!silent) {
        showToast("Data kebijakan blackout & kapasitas tim disinkronkan.");
      }
    } catch {
      if (!silent) {
        showToast("Gangguan koneksi saat memuat data kebijakan.", "error");
      }
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleSaveCapacity(div) {
    if (savingDivId) return;
    const rawVal = capacityDrafts[div.id];
    const parsed = Number(rawVal);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
      showToast("Batas kapasitas harus bilangan bulat 1% hingga 100%.", "error");
      return;
    }

    setSavingDivId(div.id);
    try {
      const res = await updateDivisionCapacityAction(div.id, parsed);
      if (!res.ok) {
        showToast(res.error || "Gagal memperbarui kapasitas divisi.", "error");
        return;
      }
      showToast(res.message);
      await refreshFromApi({ silent: true });
      router.refresh();
    } catch {
      showToast("Koneksi terputus saat menyimpan kapasitas divisi.", "error");
    } finally {
      setSavingDivId(null);
    }
  }

  function openCreateModal() {
    setName("");
    setStartDate(todayIso);
    setEndDate(todayIso);
    setDivisionId("");
    setReason("");
    setIsActive(true);
    setFieldErrors({});
    setFormServerError("");
    setModalState({ isOpen: true, mode: "create", item: null });
  }

  function openEditModal(item) {
    setName(item.name);
    setStartDate(item.startDate);
    setEndDate(item.endDate);
    setDivisionId(item.divisionId ? String(item.divisionId) : "");
    setReason(item.reason);
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

  async function handleSubmitBlackout(event) {
    event.preventDefault();
    if (isSaving) return;

    const errs = {};
    if (name.trim().length < 3) {
      errs.name = "Nama periode blackout minimal 3 karakter.";
    }
    if (!startDate) errs.startDate = "Tanggal mulai wajib diisi.";
    if (!endDate) errs.endDate = "Tanggal selesai wajib diisi.";
    else if (startDate && endDate < startDate) {
      errs.endDate = "Tanggal selesai tidak boleh lebih awal dari tanggal mulai.";
    }
    if (reason.trim().length < 5) {
      errs.reason = "Alasan larangan cuti minimal 5 karakter.";
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
        name: name.trim(),
        startDate,
        endDate,
        divisionId: divisionId ? Number(divisionId) : null,
        reason: reason.trim(),
        isActive,
      };
      const res =
        modalState.mode === "create"
          ? await createBlackoutPeriodAction(payload)
          : await updateBlackoutPeriodAction(modalState.item.id, payload);

      if (!res.ok) {
        setFormServerError(res.error || "Gagal menyimpan periode blackout.");
        if (res.fieldErrors) setFieldErrors(res.fieldErrors);
        return;
      }

      setModalState({ isOpen: false, mode: "create", item: null });
      showToast(res.message);
      await refreshFromApi({ silent: true });
      router.refresh();
    } catch {
      setFormServerError("Gangguan koneksi saat menghubungi server.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleBlackout(item) {
    if (togglingId) return;
    setTogglingId(item.id);
    try {
      const res = await toggleBlackoutPeriodStatusAction(
        item.id,
        !item.isActive
      );
      if (!res.ok) {
        showToast(res.error || "Gagal mengubah status periode blackout.", "error");
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
    try {
      const res = await deleteBlackoutPeriodAction(deleteTarget.id);
      if (!res.ok) {
        showToast(res.error || "Gagal menghapus periode blackout.", "error");
        return;
      }
      setDeleteTarget(null);
      showToast(res.message);
      await refreshFromApi({ silent: true });
      router.refresh();
    } catch {
      showToast("Gangguan koneksi saat menghapus periode blackout.", "error");
    } finally {
      setIsDeleting(false);
    }
  }

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
            FASE 2 · KEBIJAKAN OPERASIONAL ({actorRole.toUpperCase()})
          </p>
          <h1 className="mt-1 font-serif text-[28px] font-semibold leading-tight tracking-[-0.015em] text-[var(--ink)] sm:text-[32px]">
            Kapasitas Tim &amp; Blackout Period
          </h1>
          <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-[var(--ink-soft)]">
            Tetapkan batas persentase maksimal anggota divisi yang dapat cuti
            bersamaan serta rentang tanggal larangan cuti (<em>Blackout Period</em>)
            yang otomatis ditegakkan saat karyawan mengajukan cuti.
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
            Tambah Blackout Period
          </button>
        </div>
      </header>

      {/* BAGIAN 1: BATAS KAPASITAS TIM PER DIVISI */}
      <section className="panel overflow-hidden">
        <div className="panel-head">
          <div className="flex items-center gap-2.5">
            <Users className="h-4 w-4 text-[var(--spruce)]" aria-hidden="true" />
            <div>
              <span className="panel-eyebrow !mb-0">
                Team Capacity Limit (Default 30%)
              </span>
              <h2 className="panel-title">Batas Kapasitas Cuti per Divisi</h2>
            </div>
          </div>
          <span className="tag">{divisions.length} Divisi</span>
        </div>

        {divisions.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="Belum ada divisi terdaftar"
              description="Tambahkan divisi melalui Manajemen Divisi terlebih dahulu."
            />
          </div>
        ) : (
          <div
            tabIndex={0}
            role="region"
            aria-labelledby={capacityCaptionId}
            className="otium-responsive-table-wrap"
          >
            <table className="ledger otium-responsive-table text-left">
              <caption id={capacityCaptionId} className="visually-hidden">
                Konfigurasi batas persentase maksimal karyawan cuti bersamaan per divisi
              </caption>
              <thead>
                <tr>
                  <th scope="col" className="row-idx">
                    #
                  </th>
                  <th scope="col">Divisi &amp; Ketua</th>
                  <th scope="col">Anggota Aktif</th>
                  <th scope="col">Batas Maks. Cuti Bersamaan (%)</th>
                  <th scope="col" className="text-right">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody>
                {divisions.map((div, idx) => {
                  const draft = capacityDrafts[div.id] ?? "30";
                  const maxHeads = Math.floor(
                    (div.activeMembers * Number(draft || 30)) / 100
                  );
                  return (
                    <tr key={div.id}>
                      <td data-label="No" className="row-idx">
                        {String(idx + 1).padStart(2, "0")}
                      </td>
                      <th scope="row" className="font-normal">
                        <p className="font-semibold text-[var(--ink)]">
                          {div.name}
                        </p>
                        <p className="text-[11.5px] text-[var(--ink-muted)]">
                          Ketua: {div.leaderName}
                        </p>
                      </th>
                      <td data-label="Anggota Aktif" className="mono text-xs">
                        {div.activeMembers} orang
                      </td>
                      <td
                        data-label="Batas Kapasitas"
                        className="otium-mobile-stack"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            type="number"
                            min={1}
                            max={100}
                            step={1}
                            aria-label={`Batas kapasitas cuti divisi ${div.name} dalam persen`}
                            value={draft}
                            onChange={(e) =>
                              setCapacityDrafts((prev) => ({
                                ...prev,
                                [div.id]: e.target.value,
                              }))
                            }
                            className="input mono !w-24 !py-1.5 text-xs"
                          />
                          <span className="mono text-xs text-[var(--ink-muted)]">
                            % (≈ maks. {Math.max(0, maxHeads)} orang tanpa
                            peringatan)
                          </span>
                        </div>
                      </td>
                      <td data-label="Aksi" className="whitespace-nowrap text-right">
                        <button
                          type="button"
                          disabled={savingDivId === div.id}
                          onClick={() => handleSaveCapacity(div)}
                          className="btn btn-sm btn-primary"
                        >
                          {savingDivId === div.id ? (
                            <Loader2
                              className="h-3.5 w-3.5 animate-spin"
                              aria-hidden="true"
                            />
                          ) : (
                            <Save className="h-3.5 w-3.5" aria-hidden="true" />
                          )}
                          Simpan Limit
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* BAGIAN 2: BLACKOUT PERIODS */}
      <section className="panel overflow-hidden">
        <div className="panel-head">
          <div className="flex items-center gap-2.5">
            <ShieldAlert
              className="h-4 w-4 text-[var(--terracotta)]"
              aria-hidden="true"
            />
            <div>
              <span className="panel-eyebrow !mb-0">
                Periode Larangan Cuti (Hard Block)
              </span>
              <h2 className="panel-title">Daftar Blackout Period</h2>
            </div>
          </div>
          <span className="tag tag-rejected">
            {blackouts.filter((b) => b.isActive).length} Aktif
          </span>
        </div>

        {blackouts.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="Belum ada Periode Blackout"
              description="Tambahkan periode larangan cuti (misal: tutup buku akhir tahun atau peluncuran produk) untuk menolak pengajuan cuti pada tanggal kritis."
            />
          </div>
        ) : (
          <div
            tabIndex={0}
            role="region"
            aria-labelledby={blackoutCaptionId}
            className="otium-responsive-table-wrap"
          >
            <table className="ledger otium-responsive-table text-left">
              <caption id={blackoutCaptionId} className="visually-hidden">
                Daftar periode blackout larangan pengajuan cuti
              </caption>
              <thead>
                <tr>
                  <th scope="col" className="row-idx">
                    #
                  </th>
                  <th scope="col">Nama Periode &amp; Alasan</th>
                  <th scope="col">Rentang Tanggal</th>
                  <th scope="col">Cakupan</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="text-right">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody>
                {blackouts.map((bp, idx) => (
                  <tr key={bp.id}>
                    <td data-label="No" className="row-idx">
                      {String(idx + 1).padStart(2, "0")}
                    </td>
                    <th scope="row" className="font-normal">
                      <p className="font-semibold text-[var(--ink)]">{bp.name}</p>
                      <p className="mt-0.5 text-xs text-[var(--ink-soft)]">
                        {bp.reason}
                      </p>
                    </th>
                    <td data-label="Rentang" className="whitespace-nowrap">
                      <span className="mono text-xs font-semibold text-[var(--ink)]">
                        {formatIndonesianDateRange(bp.startDate, bp.endDate)}
                      </span>
                      <span className="mono block text-[10.5px] text-[var(--ink-muted)]">
                        {bp.startDate} s.d. {bp.endDate}
                      </span>
                    </td>
                    <td data-label="Cakupan" className="whitespace-nowrap">
                      <span className="tag">{bp.divisionName}</span>
                    </td>
                    <td data-label="Status" className="whitespace-nowrap">
                      <StatusBadge status={bp.isActive ? "Aktif" : "Nonaktif"} />
                    </td>
                    <td data-label="Aksi" className="whitespace-nowrap text-right">
                      <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditModal(bp)}
                          className="btn btn-sm"
                        >
                          <Pencil className="h-3 w-3" aria-hidden="true" />
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={togglingId === bp.id}
                          onClick={() => handleToggleBlackout(bp)}
                          className="btn btn-sm"
                        >
                          {togglingId === bp.id ? (
                            <Loader2
                              className="h-3 w-3 animate-spin"
                              aria-hidden="true"
                            />
                          ) : (
                            <Power className="h-3 w-3" aria-hidden="true" />
                          )}
                          {bp.isActive ? "Nonaktifkan" : "Aktifkan"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(bp)}
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

      {/* Modal Tambah / Edit Blackout Period */}
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
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--ink-muted)]">
                KEBIJAKAN BLACKOUT PERIOD
              </p>
              <h2
                id={formTitleId}
                className="mt-0.5 font-serif text-[20px] font-semibold text-[var(--ink)]"
              >
                {modalState.mode === "edit"
                  ? "Edit Blackout Period"
                  : "Tambah Blackout Period Baru"}
              </h2>
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
            id="blackout-form"
            noValidate
            onSubmit={handleSubmitBlackout}
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
                htmlFor="blackout-name"
                className="block text-xs font-semibold text-[var(--ink-soft)]"
              >
                Nama Periode Blackout{" "}
                <span className="text-[var(--terracotta)]">*</span>
              </label>
              <input
                id="blackout-name"
                type="text"
                required
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setFieldErrors((p) => ({ ...p, name: "" }));
                }}
                placeholder="Contoh: Peluncuran Produk Q4 / Tutup Buku"
                className="input otium-field-input mt-1 w-full"
              />
              {fieldErrors.name && (
                <p className="mt-1 text-xs font-medium text-[var(--terracotta)]">
                  {fieldErrors.name}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="blackout-start"
                  className="block text-xs font-semibold text-[var(--ink-soft)]"
                >
                  Tanggal Mulai{" "}
                  <span className="text-[var(--terracotta)]">*</span>
                </label>
                <input
                  id="blackout-start"
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (!endDate || endDate < e.target.value) {
                      setEndDate(e.target.value);
                    }
                    setFieldErrors((p) => ({ ...p, startDate: "" }));
                  }}
                  className="input mono otium-field-input mt-1 w-full"
                />
                {fieldErrors.startDate && (
                  <p className="mt-1 text-xs font-medium text-[var(--terracotta)]">
                    {fieldErrors.startDate}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="blackout-end"
                  className="block text-xs font-semibold text-[var(--ink-soft)]"
                >
                  Tanggal Selesai{" "}
                  <span className="text-[var(--terracotta)]">*</span>
                </label>
                <input
                  id="blackout-end"
                  type="date"
                  required
                  min={startDate || undefined}
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setFieldErrors((p) => ({ ...p, endDate: "" }));
                  }}
                  className="input mono otium-field-input mt-1 w-full"
                />
                {fieldErrors.endDate && (
                  <p className="mt-1 text-xs font-medium text-[var(--terracotta)]">
                    {fieldErrors.endDate}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label
                htmlFor="blackout-division"
                className="block text-xs font-semibold text-[var(--ink-soft)]"
              >
                Cakupan Divisi
              </label>
              <select
                id="blackout-division"
                value={divisionId}
                onChange={(e) => setDivisionId(e.target.value)}
                className="select otium-field-input mt-1 w-full"
              >
                <option value="">Seluruh Perusahaan (Semua Divisi)</option>
                {divisions.map((d) => (
                  <option key={d.id} value={String(d.id)}>
                    Khusus Divisi {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="blackout-reason"
                className="block text-xs font-semibold text-[var(--ink-soft)]"
              >
                Alasan / Keterangan{" "}
                <span className="text-[var(--terracotta)]">*</span>
              </label>
              <textarea
                id="blackout-reason"
                rows={3}
                required
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  setFieldErrors((p) => ({ ...p, reason: "" }));
                }}
                placeholder="Alasan larangan cuti ini akan tampil otomatis saat pengajuan karyawan diblokir..."
                className="textarea otium-field-input mt-1 w-full"
              />
              {fieldErrors.reason && (
                <p className="mt-1 text-xs font-medium text-[var(--terracotta)]">
                  {fieldErrors.reason}
                </p>
              )}
            </div>

            <label className="otium-checkbox-label flex cursor-pointer items-center gap-3 rounded-[4px] border border-[var(--rule-strong)] bg-[var(--alabaster)] px-3.5 py-2.5">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="otium-checkbox h-4 w-4 cursor-pointer"
              />
              <span className="text-[12.5px] font-medium text-[var(--ink)]">
                Aktif (otomatis menolak pengajuan cuti yang beririsan)
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
              form="blackout-form"
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

      {/* Modal Konfirmasi Hapus Blackout */}
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
              Hapus Blackout Period?
            </h2>
            <p className="mt-1 text-xs text-[var(--ink-soft)]">
              Periode <strong>{deleteTarget?.name}</strong> (
              <span className="mono">
                {deleteTarget?.startDate} s.d. {deleteTarget?.endDate}
              </span>
              ) akan dihapus permanen.
            </p>
          </div>
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
