"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Crown,
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
 * Workspace CMS Modul 2: Manajemen Divisi (/admin/divisions) — Pure Production.
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

  const statCards = [
    {
      label: "Total Divisi Aktif",
      value: `${stats.totalDivisions}`,
      unit: "Divisi",
      subtitle: "Unit kerja terdaftar di PostgreSQL",
      icon: Building2,
      accentClass: "text-slate-900 bg-[#F4F2EC] border-stone-200",
    },
    {
      label: "Anggota Tergabung",
      value: `${stats.assignedMembersCount}`,
      unit: "Pengguna",
      subtitle: "Memiliki relasi division_id aktif",
      icon: Users,
      accentClass: "text-emerald-800 bg-emerald-50 border-emerald-200/80",
    },
    {
      label: "Kandidat Ketua Tersedia",
      value: `${stats.availableLeadersCount}`,
      unit: "Ketua",
      subtitle: "Ketua Divisi aktif yang belum memimpin divisi",
      icon: Crown,
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
            CMS Modul 02 · Master Data Divisi
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Manajemen Divisi
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-600">
            Kelola unit organisasi, penunjukan 1 Ketua per Divisi, serta
            penghapusan aman dengan Konfirmasi 2 Tahap (<em>Double Confirmation</em>)
            tanpa menghapus akun anggota.
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
            Buat Divisi Baru
          </button>
        </div>
      </header>

      {/* Ringkasan Statistik Editorial */}
      <section
        aria-label="Ringkasan statistik divisi"
        className="grid grid-cols-1 gap-3.5 sm:grid-cols-3"
      >
        {statCards.map((card) => {
          const IconComponent = card.icon;
          return (
            <div
              key={card.label}
              className="flex flex-col justify-between rounded-xl border border-stone-200 bg-white p-4 transition-colors duration-150 hover:border-stone-300"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                    {card.label}
                  </p>
                  <p className="mt-2 flex items-baseline gap-1.5 text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
                    <span>{card.value}</span>
                    <span className="text-xs font-medium text-slate-600">
                      {card.unit}
                    </span>
                  </p>
                </div>
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${card.accentClass}`}
                >
                  <IconComponent className="h-4 w-4" aria-hidden="true" />
                </div>
              </div>
              <p className="mt-2.5 border-t border-stone-100 pt-2 text-xs text-slate-600">
                {card.subtitle}
              </p>
            </div>
          );
        })}
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

      {/* Tabel Divisi (Responsive Container Query) */}
      <section className="overflow-hidden rounded-xl border border-stone-200 bg-white">
        {filteredDivisions.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="Tidak ada divisi yang cocok"
              description="Ubah kata kunci pencarian, reset filter, atau buat divisi baru."
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
              <caption id={tableCaptionId} className="sr-only">
                Daftar divisi aktif pada sistem manajemen cuti Otium
              </caption>
              <thead className="bg-[#F4F2EC] text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-700">
                <tr>
                  <th scope="col" className="border-b border-stone-200 px-5 py-3.5">
                    Nama Divisi
                  </th>
                  <th scope="col" className="border-b border-stone-200 px-4 py-3.5">
                    Deskripsi Singkat
                  </th>
                  <th scope="col" className="border-b border-stone-200 px-4 py-3.5">
                    Ketua Divisi
                  </th>
                  <th scope="col" className="border-b border-stone-200 px-4 py-3.5">
                    Jumlah Anggota
                  </th>
                  <th scope="col" className="border-b border-stone-200 px-4 py-3.5">
                    Dibentuk
                  </th>
                  <th
                    scope="col"
                    className="border-b border-stone-200 px-5 py-3.5 text-right"
                  >
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 bg-white">
                {filteredDivisions.map((div) => (
                  <tr
                    key={div.id}
                    className="transition-colors duration-150 hover:bg-[#F4F2EC]/45"
                  >
                    <th
                      scope="row"
                      className="whitespace-nowrap px-5 py-3.5 font-semibold text-slate-900"
                    >
                      {div.name}
                    </th>
                    <td
                      data-label="Deskripsi"
                      className="max-w-xs px-4 py-3.5 text-xs text-slate-600"
                    >
                      <p className="line-clamp-2">
                        {div.description || (
                          <span className="italic text-slate-500">
                            Tanpa deskripsi
                          </span>
                        )}
                      </p>
                    </td>
                    <td
                      data-label="Ketua Divisi"
                      className="whitespace-nowrap px-4 py-3.5"
                    >
                      {div.leader ? (
                        <div>
                          <p className="text-xs font-semibold text-slate-900">
                            {div.leader.fullName}
                          </p>
                          <p className="text-[11px] text-slate-600">
                            {div.leader.email}
                          </p>
                        </div>
                      ) : (
                        <span className="inline-flex items-center rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
                          Belum Ditetapkan
                        </span>
                      )}
                    </td>
                    <td
                      data-label="Jumlah Anggota"
                      className="whitespace-nowrap px-4 py-3.5"
                    >
                      <span className="inline-flex items-center gap-1.5 rounded-md border border-stone-200 bg-[#F4F2EC]/70 px-2.5 py-1 text-xs font-semibold text-slate-800 tabular-nums">
                        <Users
                          className="h-3.5 w-3.5 text-slate-600"
                          aria-hidden="true"
                        />
                        {div.memberCount} Anggota
                      </span>
                    </td>
                    <td
                      data-label="Dibentuk"
                      className="whitespace-nowrap px-4 py-3.5 text-xs text-slate-700"
                    >
                      {formatIndonesianDate(div.createdAt)}
                    </td>
                    <td
                      data-label="Aksi"
                      className="whitespace-nowrap px-5 py-3.5 text-right"
                    >
                      <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setDetailDivisionId(div.id)}
                          className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-stone-300 bg-[#F4F2EC]/70 px-2.5 py-1.5 text-xs font-semibold text-slate-900 transition-colors duration-150 hover:bg-stone-200/80 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-slate-900"
                        >
                          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                          Detail
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(div)}
                          className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 transition-colors duration-150 hover:bg-[#F4F2EC] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-slate-900"
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteError("");
                            setDeleteDivisionId(div.id);
                          }}
                          className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-800 transition-colors duration-150 hover:bg-rose-100 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-rose-700"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
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
