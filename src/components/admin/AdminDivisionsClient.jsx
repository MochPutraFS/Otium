"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  CheckCircle2,
  Crown,
  Eye,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  Users,
} from "lucide-react";
import StatsCard from "@/components/ui/StatsCard";
import EmptyState from "@/components/ui/EmptyState";
import DataTableToolbar from "@/components/ui/DataTableToolbar";
import DoubleConfirmDeleteModal from "@/components/ui/DoubleConfirmDeleteModal";
import DivisionFormModal from "@/components/admin/DivisionFormModal";
import DivisionDetailModal from "@/components/admin/DivisionDetailModal";
import {
  ADMIN_WORKSPACE_TODAY_ISO,
  formatShortIndonesianDate,
  getInitialAdminCmsState,
  loadAdminCmsPreviewState,
  resetAdminCmsPreviewState,
  saveAdminCmsPreviewState,
} from "@/lib/mock-admin-data";

// Workspace CMS Modul 2: Manajemen Divisi (/admin/divisions)
export default function AdminDivisionsClient() {
  const [cmsState, setCmsState] = useState(getInitialAdminCmsState);
  const [searchQuery, setSearchQuery] = useState("");
  const [leaderFilter, setLeaderFilter] = useState("ALL");
  const [sizeFilter, setSizeFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("members_desc");

  const [formModalState, setFormModalState] = useState({
    isOpen: false,
    mode: "create",
    division: null,
  });
  const [detailDivisionId, setDetailDivisionId] = useState(null);
  const [deleteDivisionId, setDeleteDivisionId] = useState(null);
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

  const userMap = useMemo(() => {
    const map = new Map();
    cmsState.users.forEach((u) => map.set(u.id, u));
    return map;
  }, [cmsState.users]);

  const enrichedDivisions = useMemo(() => {
    return cmsState.divisions.map((div) => {
      const leader = div.leaderId ? userMap.get(div.leaderId) || null : null;
      const members = cmsState.users.filter((u) => u.divisionId === div.id);
      return {
        ...div,
        leader,
        leaderName: leader ? leader.fullName : null,
        members,
        memberCount: members.length,
      };
    });
  }, [cmsState.divisions, cmsState.users, userMap]);

  const stats = useMemo(() => {
    const busyLeaderIds = new Set(
      cmsState.divisions.filter((d) => d.leaderId !== null).map((d) => d.leaderId)
    );
    const availableLeadersCount = cmsState.users.filter(
      (u) =>
        u.role === "Ketua Divisi" && u.isActive && !busyLeaderIds.has(u.id)
    ).length;
    const assignedMembersCount = cmsState.users.filter(
      (u) => u.divisionId !== null
    ).length;
    return {
      totalDivisions: cmsState.divisions.length,
      assignedMembersCount,
      availableLeadersCount,
    };
  }, [cmsState.divisions, cmsState.users]);

  const filteredDivisions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const list = enrichedDivisions.filter((div) => {
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
  }, [enrichedDivisions, searchQuery, leaderFilter, sizeFilter, sortBy]);

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

  function handleSaveDivision(payload) {
    if (formModalState.mode === "create") {
      const nextId =
        cmsState.divisions.reduce((max, d) => Math.max(max, d.id), 0) + 1;
      const newDivision = {
        id: nextId,
        name: payload.name,
        description: payload.description,
        leaderId: payload.leaderId,
        createdAt: ADMIN_WORKSPACE_TODAY_ISO,
      };

      updateCmsState((prev) => ({
        ...prev,
        divisions: [newDivision, ...prev.divisions],
        // Sinkronkan users.division_id sang Ketua Divisi
        users: prev.users.map((u) =>
          u.id === payload.leaderId ? { ...u, divisionId: nextId } : u
        ),
      }));
      showToast(`Divisi "${newDivision.name}" berhasil dibuat.`);
    } else {
      updateCmsState((prev) => ({
        ...prev,
        divisions: prev.divisions.map((d) =>
          d.id === payload.id
            ? {
                ...d,
                name: payload.name,
                description: payload.description,
                leaderId: payload.leaderId,
              }
            : d
        ),
        users: prev.users.map((u) =>
          u.id === payload.leaderId ? { ...u, divisionId: payload.id } : u
        ),
      }));
      showToast(`Divisi "${payload.name}" berhasil diperbarui.`);
    }

    setFormModalState({ isOpen: false, mode: "create", division: null });
  }

  function handleConfirmDeleteDivision(division) {
    const affectedCount = cmsState.users.filter(
      (u) => u.divisionId === division.id
    ).length;

    updateCmsState((prev) => ({
      ...prev,
      // Lepas atribut divisi seluruh anggota tanpa menghapus akun mereka
      users: prev.users.map((u) =>
        u.divisionId === division.id ? { ...u, divisionId: null } : u
      ),
      divisions: prev.divisions.filter((d) => d.id !== division.id),
    }));

    setDeleteDivisionId(null);
    showToast(
      `Divisi "${division.name}" dihapus. ${affectedCount} akun anggota tetap aman (division_id = NULL).`
    );
  }

  function handleResetSimulation() {
    const fresh = resetAdminCmsPreviewState();
    setCmsState(fresh);
    handleResetFilters();
    showToast("Data simulasi CMS Admin berhasil dikembalikan ke seed awal.");
  }

  const detailDivision = useMemo(
    () => enrichedDivisions.find((d) => d.id === detailDivisionId) || null,
    [enrichedDivisions, detailDivisionId]
  );

  const deleteDivision = useMemo(
    () => enrichedDivisions.find((d) => d.id === deleteDivisionId) || null,
    [enrichedDivisions, deleteDivisionId]
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
        ...enrichedDivisions
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
              Manajemen Divisi
            </h2>
            <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700">
              CMS Modul 2
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Kelola struktur divisi, penunjukan 1 Ketua per Divisi, serta
            penghapusan aman dengan Konfirmasi 2 Tahap (<em>Double Confirmation</em>).
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
              setFormModalState({ isOpen: true, mode: "create", division: null })
            }
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm shadow-blue-600/20 transition-colors duration-200 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Buat Divisi Baru
          </button>
        </div>
      </div>

      {/* Ringkasan Statistik */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatsCard
          title="Total Divisi Aktif"
          value={`${stats.totalDivisions} Divisi`}
          subtitle="Unit kerja terdaftar di sistem"
          icon={<Building2 className="h-5 w-5" aria-hidden="true" />}
          variant="blue"
        />
        <StatsCard
          title="Anggota Tergabung"
          value={`${stats.assignedMembersCount} Pengguna`}
          subtitle="Memiliki relasi division_id aktif"
          icon={<Users className="h-5 w-5" aria-hidden="true" />}
          variant="emerald"
        />
        <StatsCard
          title="Kandidat Ketua Tersedia"
          value={`${stats.availableLeadersCount} Ketua`}
          subtitle="Ketua Divisi yang belum memimpin divisi"
          icon={<Crown className="h-5 w-5" aria-hidden="true" />}
          variant="purple"
        />
      </div>

      {/* Toolbar */}
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
        totalAll={enrichedDivisions.length}
      />

      {/* Tabel Divisi */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {filteredDivisions.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="Tidak ada divisi yang cocok"
              description="Ubah kata kunci pencarian, reset filter, atau buat divisi baru."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-600">
                <tr>
                  <th className="px-5 py-3.5">Nama Divisi</th>
                  <th className="px-4 py-3.5">Deskripsi Singkat</th>
                  <th className="px-4 py-3.5">Ketua Divisi</th>
                  <th className="px-4 py-3.5">Jumlah Anggota</th>
                  <th className="px-4 py-3.5">Dibentuk</th>
                  <th className="px-5 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredDivisions.map((div) => (
                  <tr
                    key={div.id}
                    className="transition-colors duration-150 hover:bg-slate-50/80"
                  >
                    <td className="whitespace-nowrap px-5 py-3.5 font-semibold text-slate-900">
                      {div.name}
                    </td>
                    <td className="max-w-xs px-4 py-3.5 text-xs text-slate-600">
                      <p className="line-clamp-2">
                        {div.description || (
                          <span className="italic text-slate-400">
                            Tanpa deskripsi
                          </span>
                        )}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5">
                      {div.leader ? (
                        <div>
                          <p className="text-xs font-semibold text-slate-900">
                            {div.leader.fullName}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {div.leader.email}
                          </p>
                        </div>
                      ) : (
                        <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-medium text-amber-800">
                          Belum Ditetapkan
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        <Users className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                        {div.memberCount} Anggota
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-xs text-slate-600">
                      {formatShortIndonesianDate(div.createdAt)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-right">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setDetailDivisionId(div.id)}
                          className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 transition-colors duration-200 hover:bg-blue-100"
                        >
                          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                          Detail
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setFormModalState({
                              isOpen: true,
                              mode: "edit",
                              division: div,
                            })
                          }
                          className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors duration-200 hover:bg-slate-100"
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteDivisionId(div.id)}
                          className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 transition-colors duration-200 hover:bg-rose-100"
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
        divisions={cmsState.divisions}
        users={cmsState.users}
        onClose={() =>
          setFormModalState({ isOpen: false, mode: "create", division: null })
        }
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
        onClose={() => setDeleteDivisionId(null)}
        onConfirmDelete={handleConfirmDeleteDivision}
      />
    </div>
  );
}
