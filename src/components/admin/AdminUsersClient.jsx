"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Lock,
  Pencil,
  RotateCcw,
  Shield,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import StatsCard from "@/components/ui/StatsCard";
import StatusBadge from "@/components/ui/StatusBadge";
import EmptyState from "@/components/ui/EmptyState";
import DataTableToolbar from "@/components/ui/DataTableToolbar";
import UserFormModal from "@/components/admin/UserFormModal";
import {
  ADMIN_WORKSPACE_TODAY_ISO,
  PROTECTED_USER_ROLES,
  calculateTenureMeta,
  formatShortIndonesianDate,
  getInitialAdminCmsState,
  loadAdminCmsPreviewState,
  resetAdminCmsPreviewState,
  saveAdminCmsPreviewState,
} from "@/lib/mock-admin-data";

// Workspace CMS Modul 1: Manajemen Pengguna (/admin/users)
export default function AdminUsersClient() {
  const [cmsState, setCmsState] = useState(getInitialAdminCmsState);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [divisionFilter, setDivisionFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [tenureFilter, setTenureFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("name_asc");

  const [formModalState, setFormModalState] = useState({
    isOpen: false,
    mode: "create",
    user: null,
  });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    setCmsState(loadAdminCmsPreviewState());
  }, []);

  function showToast(message, tone = "success") {
    setToast({ message, tone });
    window.setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 3600);
  }

  function updateCmsState(updater) {
    setCmsState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      saveAdminCmsPreviewState(next);
      return next;
    });
  }

  const divisionMap = useMemo(() => {
    const map = new Map();
    cmsState.divisions.forEach((div) => map.set(div.id, div));
    return map;
  }, [cmsState.divisions]);

  const enrichedUsers = useMemo(() => {
    return cmsState.users.map((user) => {
      const division = user.divisionId ? divisionMap.get(user.divisionId) : null;
      const tenure = calculateTenureMeta(
        user.joinDate,
        ADMIN_WORKSPACE_TODAY_ISO
      );
      const isProtected = PROTECTED_USER_ROLES.includes(user.role);
      return {
        ...user,
        divisionName: division ? division.name : null,
        tenure,
        isProtected,
      };
    });
  }, [cmsState.users, divisionMap]);

  const stats = useMemo(() => {
    const total = enrichedUsers.length;
    const active = enrichedUsers.filter((u) => u.isActive).length;
    const inactive = total - active;
    const ineligible = enrichedUsers.filter(
      (u) => !u.tenure.isEligible && u.isActive
    ).length;
    const protectedCount = enrichedUsers.filter((u) => u.isProtected).length;
    return { total, active, inactive, ineligible, protectedCount };
  }, [enrichedUsers]);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const list = enrichedUsers.filter((user) => {
      if (q) {
        const hay =
          `${user.fullName} ${user.email} ${user.username} ${user.divisionName || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (roleFilter !== "ALL" && user.role !== roleFilter) return false;
      if (divisionFilter === "NONE" && user.divisionId !== null) return false;
      if (
        divisionFilter !== "ALL" &&
        divisionFilter !== "NONE" &&
        String(user.divisionId) !== divisionFilter
      ) {
        return false;
      }
      if (statusFilter === "ACTIVE" && !user.isActive) return false;
      if (statusFilter === "INACTIVE" && user.isActive) return false;
      if (tenureFilter === "ELIGIBLE" && !user.tenure.isEligible) return false;
      if (tenureFilter === "INELIGIBLE" && user.tenure.isEligible) return false;
      return true;
    });

    return [...list].sort((a, b) => {
      switch (sortBy) {
        case "name_desc":
          return b.fullName.localeCompare(a.fullName, "id");
        case "join_newest":
          return (b.joinDate || "").localeCompare(a.joinDate || "");
        case "join_oldest":
          return (a.joinDate || "").localeCompare(b.joinDate || "");
        case "division_asc":
          return (a.divisionName || "zzz").localeCompare(
            b.divisionName || "zzz",
            "id"
          );
        case "name_asc":
        default:
          return a.fullName.localeCompare(b.fullName, "id");
      }
    });
  }, [
    enrichedUsers,
    searchQuery,
    roleFilter,
    divisionFilter,
    statusFilter,
    tenureFilter,
    sortBy,
  ]);

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    roleFilter !== "ALL" ||
    divisionFilter !== "ALL" ||
    statusFilter !== "ALL" ||
    tenureFilter !== "ALL";

  function handleResetFilters() {
    setSearchQuery("");
    setRoleFilter("ALL");
    setDivisionFilter("ALL");
    setStatusFilter("ALL");
    setTenureFilter("ALL");
    setSortBy("name_asc");
  }

  function handleSaveUser(payload) {
    if (formModalState.mode === "create") {
      const nextId =
        cmsState.users.reduce((max, u) => Math.max(max, u.id), 0) + 1;
      const newUser = {
        id: nextId,
        username: payload.username,
        email: payload.email,
        fullName: payload.fullName,
        role: payload.role,
        divisionId: payload.divisionId,
        initialLeaveQuota: payload.initialLeaveQuota,
        remainingLeaveQuota: payload.remainingLeaveQuota,
        joinDate: payload.joinDate,
        isActive: payload.isActive,
        phone: "-",
      };
      updateCmsState((prev) => ({
        ...prev,
        users: [newUser, ...prev.users],
      }));
      showToast(`Pengguna "${newUser.fullName}" berhasil ditambahkan.`);
    } else {
      updateCmsState((prev) => {
        const nextUsers = prev.users.map((u) =>
          u.id === payload.id
            ? {
                ...u,
                username: payload.username,
                email: payload.email,
                fullName: payload.fullName,
                role: payload.role,
                divisionId: payload.divisionId,
                initialLeaveQuota: payload.initialLeaveQuota,
                remainingLeaveQuota: payload.remainingLeaveQuota,
                joinDate: payload.joinDate,
                isActive: payload.isActive,
              }
            : u
        );

        // Jika mantan Ketua Divisi diubah role-nya atau dinonaktifkan, lepaskan leader_id divisi
        const shouldClearLeader =
          payload.role !== "Ketua Divisi" || !payload.isActive;
        const nextDivisions = shouldClearLeader
          ? prev.divisions.map((div) =>
              div.leaderId === payload.id ? { ...div, leaderId: null } : div
            )
          : prev.divisions;

        return {
          ...prev,
          users: nextUsers,
          divisions: nextDivisions,
        };
      });
      showToast(`Data pengguna "${payload.fullName}" berhasil diperbarui.`);
    }

    setFormModalState({ isOpen: false, mode: "create", user: null });
  }

  function handleConfirmDeleteUser() {
    if (!deleteTarget) return;
    if (PROTECTED_USER_ROLES.includes(deleteTarget.role)) {
      showToast(
        "Akun Admin dan HRD diproteksi dan tidak dapat dihapus.",
        "error"
      );
      setDeleteTarget(null);
      return;
    }

    updateCmsState((prev) => ({
      ...prev,
      users: prev.users.filter((u) => u.id !== deleteTarget.id),
      divisions: prev.divisions.map((div) =>
        div.leaderId === deleteTarget.id ? { ...div, leaderId: null } : div
      ),
    }));
    showToast(`Akun "${deleteTarget.fullName}" berhasil dihapus.`);
    setDeleteTarget(null);
  }

  function handleResetSimulation() {
    const fresh = resetAdminCmsPreviewState();
    setCmsState(fresh);
    handleResetFilters();
    showToast("Data simulasi CMS Admin berhasil dikembalikan ke seed awal.");
  }

  const filterConfigs = [
    {
      key: "role",
      label: "Filter Role",
      value: roleFilter,
      onChange: setRoleFilter,
      options: [
        { value: "ALL", label: "Role: Semua" },
        { value: "Admin", label: "Admin" },
        { value: "HRD", label: "HRD" },
        { value: "Ketua Divisi", label: "Ketua Divisi" },
        { value: "Karyawan", label: "Karyawan" },
      ],
    },
    {
      key: "division",
      label: "Filter Divisi",
      value: divisionFilter,
      onChange: setDivisionFilter,
      options: [
        { value: "ALL", label: "Divisi: Semua" },
        { value: "NONE", label: "Belum Punya Divisi" },
        ...cmsState.divisions.map((div) => ({
          value: String(div.id),
          label: div.name,
        })),
      ],
    },
    {
      key: "status",
      label: "Filter Status Akun",
      value: statusFilter,
      onChange: setStatusFilter,
      options: [
        { value: "ALL", label: "Status: Semua" },
        { value: "ACTIVE", label: "Aktif" },
        { value: "INACTIVE", label: "Nonaktif" },
      ],
    },
    {
      key: "tenure",
      label: "Filter Kelayakan Masa Kerja",
      value: tenureFilter,
      onChange: setTenureFilter,
      options: [
        { value: "ALL", label: "Masa Kerja: Semua" },
        { value: "ELIGIBLE", label: ">= 1 Tahun (Eligible)" },
        { value: "INELIGIBLE", label: "< 1 Tahun (Belum Eligible)" },
      ],
    },
  ];

  const sortOptions = [
    { value: "name_asc", label: "Nama (A–Z)" },
    { value: "name_desc", label: "Nama (Z–A)" },
    { value: "join_newest", label: "Tgl Bergabung (Terbaru)" },
    { value: "join_oldest", label: "Tgl Bergabung (Terlama)" },
    { value: "division_asc", label: "Divisi (A–Z)" },
  ];

  return (
    <div className="space-y-6">
      {/* Toast Notifikasi */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed right-5 top-20 z-50 flex max-w-md items-center gap-2.5 rounded-xl border px-4 py-3 text-xs font-semibold shadow-lg ${
            toast.tone === "error"
              ? "border-rose-200 bg-rose-50 text-rose-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Halaman */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              Manajemen Pengguna
            </h2>
            <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700">
              CMS Modul 1
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Kelola akun 4 role, kuota cuti tahunan awal, tanggal bergabung, serta
            proteksi penghapusan akun Admin &amp; HRD.
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
              setFormModalState({ isOpen: true, mode: "create", user: null })
            }
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm shadow-blue-600/20 transition-colors duration-200 hover:bg-blue-700"
          >
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            Tambah Pengguna
          </button>
        </div>
      </div>

      {/* Ringkasan Statistik */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Pengguna"
          value={`${stats.total} Akun`}
          subtitle="Seluruh akun terdaftar lintas 4 role"
          icon={<Users className="h-5 w-5" aria-hidden="true" />}
          variant="blue"
        />
        <StatsCard
          title="Status Akun"
          value={`${stats.active} Aktif`}
          subtitle={`${stats.inactive} akun berstatus Nonaktif`}
          icon={<UserCheck className="h-5 w-5" aria-hidden="true" />}
          variant="emerald"
        />
        <StatsCard
          title="Masa Kerja < 1 Tahun"
          value={`${stats.ineligible} Karyawan`}
          subtitle="Belum eligible Cuti Tahunan"
          icon={<AlertTriangle className="h-5 w-5" aria-hidden="true" />}
          variant="amber"
        />
        <StatsCard
          title="Akun Diproteksi"
          value={`${stats.protectedCount} Akun`}
          subtitle="Role Admin & HRD tidak dapat dihapus"
          icon={<Shield className="h-5 w-5" aria-hidden="true" />}
          variant="purple"
        />
      </div>

      {/* Toolbar Pencarian, Multi-Filter & Sortir */}
      <DataTableToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Cari nama lengkap, email, atau username..."
        filters={filterConfigs}
        sortOptions={sortOptions}
        currentSort={sortBy}
        onSortChange={setSortBy}
        onReset={handleResetFilters}
        hasActiveFilters={hasActiveFilters}
        totalFiltered={filteredUsers.length}
        totalAll={enrichedUsers.length}
      />

      {/* Tabel Data Pengguna */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {filteredUsers.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="Tidak ada pengguna yang cocok"
              description="Coba ubah kata kunci pencarian atau reset filter untuk melihat seluruh pengguna."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-600">
                <tr>
                  <th className="px-5 py-3.5">Nama &amp; Email</th>
                  <th className="px-4 py-3.5">Username</th>
                  <th className="px-4 py-3.5">Role &amp; Status</th>
                  <th className="px-4 py-3.5">Divisi</th>
                  <th className="px-4 py-3.5">Tgl Bergabung</th>
                  <th className="px-4 py-3.5">Sisa Kuota</th>
                  <th className="px-5 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="transition-colors duration-150 hover:bg-slate-50/80"
                  >
                    <td className="whitespace-nowrap px-5 py-3.5">
                      <p className="font-semibold text-slate-900">
                        {user.fullName}
                      </p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 font-mono text-xs text-slate-700">
                      {user.username}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <StatusBadge status={user.role} />
                        <StatusBadge
                          status={user.isActive ? "Aktif" : "Nonaktif"}
                        />
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-xs font-medium text-slate-700">
                      {user.divisionName ? (
                        user.divisionName
                      ) : (
                        <span className="italic text-slate-400">
                          Belum ada divisi
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5">
                      <p className="text-xs font-medium text-slate-800">
                        {formatShortIndonesianDate(user.joinDate)}
                      </p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="text-[11px] text-slate-500">
                          {user.tenure.label}
                        </span>
                        {!user.tenure.isEligible && (
                          <StatusBadge status="Belum Eligible" />
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5">
                      <p className="text-sm font-bold text-slate-900">
                        {Number(user.remainingLeaveQuota).toFixed(1)}{" "}
                        <span className="text-xs font-normal text-slate-500">
                          / {Number(user.initialLeaveQuota).toFixed(1)} Hr
                        </span>
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-right">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            setFormModalState({
                              isOpen: true,
                              mode: "edit",
                              user,
                            })
                          }
                          className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors duration-200 hover:bg-slate-100"
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                          Edit
                        </button>

                        {user.isProtected ? (
                          <button
                            type="button"
                            disabled
                            title="Akun Admin dan HRD diproteksi dari penghapusan"
                            aria-label="Akun Admin dan HRD diproteksi dari penghapusan"
                            className="inline-flex cursor-not-allowed items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-400"
                          >
                            <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                            Diproteksi
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(user)}
                            className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 transition-colors duration-200 hover:bg-rose-100"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            Hapus
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modal Tambah / Edit Pengguna */}
      <UserFormModal
        isOpen={formModalState.isOpen}
        mode={formModalState.mode}
        initialUser={formModalState.user}
        existingUsers={cmsState.users}
        divisions={cmsState.divisions}
        onClose={() =>
          setFormModalState({ isOpen: false, mode: "create", user: null })
        }
        onSubmit={handleSaveUser}
      />

      {/* Modal Konfirmasi Hapus Pengguna (Khusus Karyawan & Ketua Divisi) */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-user-modal-title"
        >
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            onClick={() => setDeleteTarget(null)}
            aria-hidden="true"
          />
          <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-rose-200 bg-rose-50/70 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </div>
                <h3
                  id="delete-user-modal-title"
                  className="text-sm font-bold text-slate-900"
                >
                  Hapus Akun Pengguna?
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                aria-label="Tutup modal"
                className="cursor-pointer rounded-lg p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-3 px-5 py-4 text-xs leading-relaxed text-slate-600">
              <p>
                Anda akan menghapus akun{" "}
                <strong className="text-slate-900">
                  {deleteTarget.fullName}
                </strong>{" "}
                (<StatusBadge status={deleteTarget.role} />) dengan email{" "}
                <strong className="text-slate-800">{deleteTarget.email}</strong>.
              </p>
              {deleteTarget.role === "Ketua Divisi" && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900">
                  Jika pengguna ini sedang memimpin divisi, posisi Ketua Divisi
                  pada divisi tersebut akan dikosongkan otomatis.
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteUser}
                className="cursor-pointer rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700"
              >
                Ya, Hapus Akun
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
