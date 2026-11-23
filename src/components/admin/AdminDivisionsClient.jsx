"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle2,
  Eye,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Users,
  X,
} from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import DataTableToolbar from "@/components/ui/DataTableToolbar";
import DoubleConfirmDeleteModal from "@/components/ui/DoubleConfirmDeleteModal";
import DivisionFormModal from "@/components/admin/DivisionFormModal";
import DivisionDetailModal from "@/components/admin/DivisionDetailModal";
import { formatIndonesianDate } from "@/lib/date-utils";
import {
  createDivisionAction,
  deleteDivisionAction,
  updateDivisionAction,
} from "@/actions/division-actions";

/**
 * Workspace CMS Modul 2: Manajemen Divisi (/admin/divisions) — Swiss Archival.
 * Terhubung ke PostgreSQL via Server Component initial load, Server Actions (mutasi atomik),
 * dan Route Handler GET /api/admin/divisions (sinkronisasi realtime).
 */
export default function AdminDivisionsClient({
  initialDivisions = [],
  initialAvailableLeaders = [],
  initialStats = {
    totalDivisions: 0,
    assignedMembersCount: 0,
    availableLeadersCount: 0,
  },
}) {
  const router = useRouter();
  const tableCaptionId = useId();

  const [divisions, setDivisions] = useState(initialDivisions);
  const [availableLeaders, setAvailableLeaders] = useState(
    initialAvailableLeaders
  );
  const [stats, setStats] = useState(initialStats);

  const [searchQuery, setSearchQuery] = useState("");
  const [leaderFilter, setLeaderFilter] = useState("ALL");
  const [sizeFilter, setSizeFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("members_desc");

  const [formModalState, setFormModalState] = useState({
    isOpen: false,
    mode: "create",
    division: null,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [formServerError, setFormServerError] = useState("");
  const [formServerFieldErrors, setFormServerFieldErrors] = useState(null);

  const [detailDivisionId, setDetailDivisionId] = useState(null);

  const [deleteDivisionId, setDeleteDivisionId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toast, setToast] = useState(null); // { message: string, tone: "success" | "error" }

  useEffect(() => {
    setDivisions(initialDivisions);
  }, [initialDivisions]);

  useEffect(() => {
    setAvailableLeaders(initialAvailableLeaders);
  }, [initialAvailableLeaders]);

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
      const res = await fetch("/api/admin/divisions", {
        method: "GET",
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        if (!silent) {
          showToast(
            data.error || "Gagal menyinkronkan data divisi dari server.",
            "error"
          );
        }
        return;
      }
      setDivisions(data.divisions || []);
      setAvailableLeaders(data.availableLeaders || []);
      if (data.stats) {
        setStats(data.stats);
      }
      if (!silent) {
        showToast("Daftar divisi disinkronkan dari PostgreSQL.");
      }
    } catch {
      if (!silent) {
        showToast("Koneksi jaringan bermasalah saat memuat ulang data.", "error");
      }
    } finally {
      setIsRefreshing(false);
    }
  }

  const filteredDivisions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const list = divisions.filter((div) => {
      if (q) {
        const hay =
          `${div.name} ${div.description || ""} ${div.leaderName || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      if (leaderFilter === "HAS_LEADER" && !div.leader) return false;
      if (leaderFilter === "NO_LEADER" && div.leader) return false;
      if (
        leaderFilter !== "ALL" &&
        leaderFilter !== "HAS_LEADER" &&
        leaderFilter !== "NO_LEADER" &&
        String(div.leaderId) !== leaderFilter
      ) {
        return false;
      }

      if (sizeFilter === "ZERO" && div.memberCount !== 0) return false;
      if (
        sizeFilter === "SMALL" &&
        (div.memberCount < 1 || div.memberCount > 5)
      ) {
        return false;
      }
      if (sizeFilter === "LARGE" && div.memberCount <= 5) return false;

      return true;
    });

    return [...list].sort((a, b) => {
      switch (sortBy) {
        case "name_asc":
          return a.name.localeCompare(b.name, "id");
        case "name_desc":
          return b.name.localeCompare(a.name, "id");
        case "members_asc":
          return a.memberCount - b.memberCount;
        case "created_newest":
          return (b.createdAt || "").localeCompare(a.createdAt || "");
        case "created_oldest":
          return (a.createdAt || "").localeCompare(b.createdAt || "");
        case "members_desc":
        default:
          return b.memberCount - a.memberCount;
      }
    });
  }, [divisions, searchQuery, leaderFilter, sizeFilter, sortBy]);

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    leaderFilter !== "ALL" ||
    sizeFilter !== "ALL";

  function handleResetFilters() {
    setSearchQuery("");
    setLeaderFilter("ALL");
    setSizeFilter("ALL");
    setSortBy("members_desc");
  }

  function handleColumnSort(col) {
    if (col === "name") {
      setSortBy((prev) => (prev === "name_asc" ? "name_desc" : "name_asc"));
    } else if (col === "members") {
      setSortBy((prev) =>
        prev === "members_desc" ? "members_asc" : "members_desc"
      );
    } else if (col === "created") {
      setSortBy((prev) =>
        prev === "created_newest" ? "created_oldest" : "created_newest"
      );
    }
  }

  function getAriaSort(col) {
    if (col === "name") {
      if (sortBy === "name_asc") return "ascending";
      if (sortBy === "name_desc") return "descending";
    }
    if (col === "members") {
      if (sortBy === "members_asc") return "ascending";
      if (sortBy === "members_desc") return "descending";
    }
    if (col === "created") {
      if (sortBy === "created_oldest") return "ascending";
      if (sortBy === "created_newest") return "descending";
    }
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
    setFormModalState({ isOpen: true, mode: "create", division: null });
  }

  function openEditModal(division) {
    setFormServerError("");
    setFormServerFieldErrors(null);
    setFormModalState({ isOpen: true, mode: "edit", division });
  }

  function closeFormModal() {
    if (isSaving) return;
    setFormServerError("");
    setFormServerFieldErrors(null);
    setFormModalState({ isOpen: false, mode: "create", division: null });
  }

  async function handleSaveDivision(payload) {
    setIsSaving(true);
    setFormServerError("");
    setFormServerFieldErrors(null);

    try {
      const result =
        formModalState.mode === "create"
          ? await createDivisionAction(payload)
          : await updateDivisionAction(payload.id, payload);

      if (!result.ok) {
        setFormServerError(
          result.error || "Gagal menyimpan data divisi. Periksa kembali isian."
        );
        if (result.fieldErrors) {
          setFormServerFieldErrors(result.fieldErrors);
        }
        return;
      }

      setFormModalState({ isOpen: false, mode: "create", division: null });
      showToast(result.message || "Data divisi berhasil disimpan.");
      await refreshFromApi({ silent: true });
      router.refresh();
    } catch {
      setFormServerError("Terjadi kesalahan jaringan saat menyimpan divisi.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleConfirmDeleteDivision(division) {
    setIsDeleting(true);
    setDeleteError("");

    try {
      const result = await deleteDivisionAction(division.id, {
        isDoubleConfirmed: true,
      });

      if (!result.ok) {
        setDeleteError(result.error || "Gagal menghapus divisi.");
        return;
      }

      setDeleteDivisionId(null);
      if (detailDivisionId === division.id) {
        setDetailDivisionId(null);
      }
      showToast(
        result.message ||
          `Divisi "${division.name}" berhasil dihapus tanpa menghapus akun anggota.`
      );
      await refreshFromApi({ silent: true });
      router.refresh();
    } catch {
      setDeleteError("Terjadi kesalahan jaringan saat menghapus divisi.");
    } finally {
      setIsDeleting(false);
    }
  }

  const detailDivision = useMemo(
    () => divisions.find((d) => d.id === detailDivisionId) || null,
    [divisions, detailDivisionId]
  );

  const deleteDivision = useMemo(
    () => divisions.find((d) => d.id === deleteDivisionId) || null,
    [divisions, deleteDivisionId]
  );

  const filterConfigs = [
    {
      key: "leader",
      label: "Filter Ketua Divisi",
      value: leaderFilter,
      onChange: setLeaderFilter,
      options: [
        { value: "ALL", label: "Ketua Divisi: Semua" },
        { value: "HAS_LEADER", label: "Sudah Ada Ketua" },
        { value: "NO_LEADER", label: "Belum Ada Ketua" },
        ...divisions
          .filter((d) => d.leader)
          .map((d) => ({
            value: String(d.leaderId),
            label: `Ketua: ${d.leaderName}`,
          })),
      ],
    },
    {
      key: "size",
      label: "Filter Jumlah Anggota",
      value: sizeFilter,
      onChange: setSizeFilter,
      options: [
        { value: "ALL", label: "Anggota: Semua" },
        { value: "ZERO", label: "0 Anggota" },
        { value: "SMALL", label: "1–5 Anggota" },
        { value: "LARGE", label: "> 5 Anggota" },
      ],
    },
  ];

  const sortOptions = [
    { value: "members_desc", label: "Anggota (Terbanyak)" },
    { value: "members_asc", label: "Anggota (Tersedikit)" },
    { value: "name_asc", label: "Nama Divisi (A–Z)" },
    { value: "name_desc", label: "Nama Divisi (Z–A)" },
    { value: "created_newest", label: "Dibentuk (Terbaru)" },
    { value: "created_oldest", label: "Dibentuk (Terlama)" },
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
            CMS MODUL 02 · MASTER DATA DIVISI
          </p>
          <h1 className="mt-1 font-serif text-[28px] font-semibold leading-tight tracking-[-0.015em] text-[var(--ink)] sm:text-[32px]">
            Manajemen Divisi
          </h1>
          <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-[var(--ink-soft)]">
            Kelola unit organisasi, penunjukan 1 Ketua per Divisi, serta
            penghapusan aman dengan Konfirmasi 2 Tahap (
            <em>Double Confirmation</em>) tanpa menghapus akun anggota.
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
            Buat Divisi Baru
          </button>
        </div>
      </header>

      {/* Metric Strip Swiss Archival (3 Kolom) */}
      <section
        aria-label="Ringkasan statistik divisi"
        className="metric-strip lg:!grid-cols-3"
      >
        <div className="metric-cell">
          <p className="metric-label">Total Divisi Aktif</p>
          <p className="metric-val tabular-nums">
            {stats.totalDivisions} <small>Divisi</small>
          </p>
          <p className="metric-note">Unit kerja terdaftar di PostgreSQL</p>
        </div>

        <div className="metric-cell">
          <p className="metric-label">Anggota Tergabung</p>
          <p className="metric-val tabular-nums text-[var(--spruce)]">
            {stats.assignedMembersCount} <small>Pengguna</small>
          </p>
          <p className="metric-note">Memiliki relasi division_id aktif</p>
        </div>

        <div className="metric-cell">
          <p className="metric-label">Kandidat Ketua Tersedia</p>
          <p className="metric-val tabular-nums text-[var(--ochre)]">
            {stats.availableLeadersCount} <small>Ketua</small>
          </p>
          <p className="metric-note">
            Ketua Divisi aktif yang belum memimpin divisi
          </p>
        </div>
      </section>

      {/* Toolbar Pencarian, Filter & Sortir */}
      <DataTableToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Cari nama divisi, deskripsi, atau ketua divisi..."
        filters={filterConfigs}
        sortOptions={sortOptions}
        currentSort={sortBy}
        onSortChange={setSortBy}
        onReset={handleResetFilters}
        hasActiveFilters={hasActiveFilters}
        totalFiltered={filteredDivisions.length}
        totalAll={divisions.length}
      />

      {/* Ledger Divisi */}
      <section className="panel overflow-hidden">
        {filteredDivisions.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="Tidak ada divisi yang cocok"
              description="Ubah kata kunci pencarian, reset filter, atau buat divisi baru."
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
                  Daftar divisi aktif pada sistem manajemen cuti Otium
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
                        <span>Nama Divisi</span>
                        {renderSortIcon("name")}
                      </button>
                    </th>
                    <th scope="col">Deskripsi Singkat</th>
                    <th scope="col">Ketua Divisi</th>
                    <th scope="col" aria-sort={getAriaSort("members")}>
                      <button
                        type="button"
                        onClick={() => handleColumnSort("members")}
                      >
                        <span>Jumlah Anggota</span>
                        {renderSortIcon("members")}
                      </button>
                    </th>
                    <th scope="col" aria-sort={getAriaSort("created")}>
                      <button
                        type="button"
                        onClick={() => handleColumnSort("created")}
                      >
                        <span>Dibentuk</span>
                        {renderSortIcon("created")}
                      </button>
                    </th>
                    <th scope="col" className="text-right">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDivisions.map((div, idx) => (
                    <tr key={div.id}>
                      <td className="row-idx text-center">
                        {String(idx + 1).padStart(2, "0")}
                      </td>
                      <th
                        scope="row"
                        className="whitespace-nowrap font-semibold text-[var(--ink)]"
                      >
                        {div.name}
                      </th>
                      <td className="max-w-xs text-[12px] text-[var(--ink-soft)]">
                        <p className="line-clamp-2">
                          {div.description || (
                            <span className="italic text-[var(--ink-muted)]">
                              Tanpa deskripsi
                            </span>
                          )}
                        </p>
                      </td>
                      <td className="whitespace-nowrap">
                        {div.leader ? (
                          <div>
                            <p className="text-[12.5px] font-semibold text-[var(--ink)]">
                              {div.leader.fullName}
                            </p>
                            <p className="font-mono text-[11px] text-[var(--ink-muted)]">
                              {div.leader.email}
                            </p>
                          </div>
                        ) : (
                          <span className="tag tag-pending">
                            Belum Ditetapkan
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap">
                        <span className="tag tabular-nums">
                          <Users className="h-3 w-3" aria-hidden="true" />
                          {div.memberCount} Anggota
                        </span>
                      </td>
                      <td className="whitespace-nowrap font-mono text-[12px] tabular-nums text-[var(--ink-soft)]">
                        {formatIndonesianDate(div.createdAt)}
                      </td>
                      <td className="whitespace-nowrap text-right">
                        <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setDetailDivisionId(div.id)}
                            className="btn btn-sm"
                          >
                            <Eye className="h-3 w-3" aria-hidden="true" />
                            Detail
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(div)}
                            className="btn btn-sm"
                          >
                            <Pencil className="h-3 w-3" aria-hidden="true" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteError("");
                              setDeleteDivisionId(div.id);
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

            {/* Mobile Ledger Cards (< md) */}
            <div className="divide-y divide-[var(--rule)] md:hidden">
              {filteredDivisions.map((div, idx) => (
                <article key={div.id} className="ledger-card">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-serif text-[17px] font-semibold text-[var(--ink)]">
                        {div.name}
                      </p>
                      <p className="mt-0.5 text-[12px] text-[var(--ink-soft)]">
                        {div.description || (
                          <span className="italic text-[var(--ink-muted)]">
                            Tanpa deskripsi
                          </span>
                        )}
                      </p>
                    </div>
                    <span className="font-mono text-[10.5px] text-[var(--ink-muted)]">
                      #{String(idx + 1).padStart(2, "0")}
                    </span>
                  </div>

                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-[var(--rule)] pt-3 text-[12px]">
                    <div>
                      <dt className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--ink-muted)]">
                        Ketua Divisi
                      </dt>
                      <dd className="mt-0.5">
                        {div.leader ? (
                          <span className="font-medium text-[var(--ink)]">
                            {div.leader.fullName}
                          </span>
                        ) : (
                          <span className="tag tag-pending text-[10px]">
                            Belum Ditetapkan
                          </span>
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--ink-muted)]">
                        Jumlah Anggota
                      </dt>
                      <dd className="mt-0.5 font-mono font-semibold tabular-nums text-[var(--ink)]">
                        {div.memberCount} Anggota
                      </dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--ink-muted)]">
                        Dibentuk
                      </dt>
                      <dd className="mt-0.5 font-mono text-[11.5px] tabular-nums text-[var(--ink-soft)]">
                        {formatIndonesianDate(div.createdAt)}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-3 flex flex-wrap items-center justify-end gap-2 border-t border-[var(--rule)] pt-3">
                    <button
                      type="button"
                      onClick={() => setDetailDivisionId(div.id)}
                      className="btn btn-sm"
                    >
                      <Eye className="h-3 w-3" aria-hidden="true" />
                      Detail
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditModal(div)}
                      className="btn btn-sm"
                    >
                      <Pencil className="h-3 w-3" aria-hidden="true" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteError("");
                        setDeleteDivisionId(div.id);
                      }}
                      className="btn btn-sm btn-danger-ghost"
                    >
                      <Trash2 className="h-3 w-3" aria-hidden="true" />
                      Hapus
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      {/* Modal Form Create / Edit Divisi */}
      <DivisionFormModal
        isOpen={formModalState.isOpen}
        mode={formModalState.mode}
        initialDivision={formModalState.division}
        divisions={divisions}
        initialAvailableLeaders={availableLeaders}
        isSubmitting={isSaving}
        serverError={formServerError}
        serverFieldErrors={formServerFieldErrors}
        onClose={closeFormModal}
        onSubmit={handleSaveDivision}
      />

      {/* Modal Detail Divisi */}
      <DivisionDetailModal
        isOpen={Boolean(detailDivision)}
        division={detailDivision}
        leader={detailDivision?.leader}
        members={detailDivision?.members || []}
        onClose={() => setDetailDivisionId(null)}
      />

      {/* Modal Double Confirmation Delete Divisi */}
      <DoubleConfirmDeleteModal
        isOpen={Boolean(deleteDivision)}
        division={deleteDivision}
        members={deleteDivision?.members || []}
        isDeleting={isDeleting}
        errorMessage={deleteError}
        onClose={() => {
          if (!isDeleting) {
            setDeleteDivisionId(null);
            setDeleteError("");
          }
        }}
        onConfirmDelete={handleConfirmDeleteDivision}
      />
    </div>
  );
}
