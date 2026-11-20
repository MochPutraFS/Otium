"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  CheckCircle2,
  Crown,
  Info,
  RotateCcw,
  ShieldCheck,
  UserMinus,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import EmptyState from "@/components/ui/EmptyState";
import DataTableToolbar from "@/components/ui/DataTableToolbar";
import AssignMemberModal from "@/components/admin/AssignMemberModal";
import {
  getInitialAdminCmsState,
  loadAdminCmsPreviewState,
  resetAdminCmsPreviewState,
  saveAdminCmsPreviewState,
} from "@/lib/mock-admin-data";

// Workspace CMS Modul 3: Manajemen Anggota Divisi (/admin/division-members)
export default function AdminDivisionMembersClient({
  initialDivisionId = null,
}) {
  const [cmsState, setCmsState] = useState(getInitialAdminCmsState);
  const [selectedDivisionId, setSelectedDivisionId] = useState(
    initialDivisionId ? Number(initialDivisionId) : null
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("leader_first");

  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const loaded = loadAdminCmsPreviewState();
    setCmsState(loaded);
    setSelectedDivisionId((prev) => {
      if (prev && loaded.divisions.some((d) => d.id === prev)) return prev;
      return loaded.divisions[0]?.id ?? null;
    });
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

  const activeDivision = useMemo(
    () => cmsState.divisions.find((d) => d.id === selectedDivisionId) || null,
    [cmsState.divisions, selectedDivisionId]
  );

  const activeLeader = useMemo(() => {
    if (!activeDivision?.leaderId) return null;
    return cmsState.users.find((u) => u.id === activeDivision.leaderId) || null;
  }, [activeDivision, cmsState.users]);

  const unassignedEmployeesCount = useMemo(
    () =>
      cmsState.users.filter(
        (u) => u.role === "Karyawan" && u.isActive && u.divisionId === null
      ).length,
    [cmsState.users]
  );

  const divisionMembers = useMemo(() => {
    if (!activeDivision) return [];
    return cmsState.users.filter((u) => u.divisionId === activeDivision.id);
  }, [cmsState.users, activeDivision]);

  const filteredMembers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const list = divisionMembers.filter((m) => {
      if (q) {
        const hay = `${m.fullName} ${m.email} ${m.username}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (roleFilter !== "ALL" && m.role !== roleFilter) return false;
      if (statusFilter === "ACTIVE" && !m.isActive) return false;
      if (statusFilter === "INACTIVE" && m.isActive) return false;
      return true;
    });

    return [...list].sort((a, b) => {
      if (sortBy === "leader_first") {
        const aIsLeader = a.id === activeDivision?.leaderId ? 0 : 1;
        const bIsLeader = b.id === activeDivision?.leaderId ? 0 : 1;
        if (aIsLeader !== bIsLeader) return aIsLeader - bIsLeader;
        return a.fullName.localeCompare(b.fullName, "id");
      }
      if (sortBy === "name_desc") {
        return b.fullName.localeCompare(a.fullName, "id");
      }
      if (sortBy === "quota_desc") {
        return Number(b.remainingLeaveQuota) - Number(a.remainingLeaveQuota);
      }
      return a.fullName.localeCompare(b.fullName, "id");
    });
  }, [
    divisionMembers,
    searchQuery,
    roleFilter,
    statusFilter,
    sortBy,
    activeDivision,
  ]);

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    roleFilter !== "ALL" ||
    statusFilter !== "ALL";

  function handleResetFilters() {
    setSearchQuery("");
    setRoleFilter("ALL");
    setStatusFilter("ALL");
    setSortBy("leader_first");
  }

  function handleAssignMembers(userIds) {
    if (!activeDivision || userIds.length === 0) return;

    updateCmsState((prev) => ({
      ...prev,
      users: prev.users.map((u) =>
        userIds.includes(u.id) ? { ...u, divisionId: activeDivision.id } : u
      ),
    }));

    setIsAssignOpen(false);
    showToast(
      `${userIds.length} karyawan berhasil ditempatkan ke divisi ${activeDivision.name}.`
    );
  }

  function handleConfirmRemoveMember() {
    if (!removeTarget || !activeDivision) return;

    updateCmsState((prev) => ({
      ...prev,
      users: prev.users.map((u) =>
        u.id === removeTarget.id ? { ...u, divisionId: null } : u
      ),
    }));

    showToast(
      `"${removeTarget.fullName}" dikeluarkan dari ${activeDivision.name} (akun tetap aktif, division_id = NULL).`
    );
    setRemoveTarget(null);
  }

  function handleResetSimulation() {
    const fresh = resetAdminCmsPreviewState();
    setCmsState(fresh);
    setSelectedDivisionId(fresh.divisions[0]?.id ?? null);
    handleResetFilters();
    showToast("Data simulasi CMS Admin berhasil dikembalikan ke seed awal.");
  }

  const filterConfigs = [
    {
      key: "member-role",
      label: "Filter Role Anggota",
      value: roleFilter,
      onChange: setRoleFilter,
      options: [
        { value: "ALL", label: "Role: Semua" },
        { value: "Ketua Divisi", label: "Ketua Divisi" },
        { value: "Karyawan", label: "Karyawan" },
        { value: "HRD", label: "HRD" },
      ],
    },
    {
      key: "member-status",
      label: "Filter Status Anggota",
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
    { value: "leader_first", label: "Ketua Divisi Teratas" },
    { value: "name_asc", label: "Nama (A–Z)" },
    { value: "name_desc", label: "Nama (Z–A)" },
    { value: "quota_desc", label: "Sisa Kuota Terbanyak" },
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
              Manajemen Anggota Divisi
            </h2>
            <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700">
              CMS Modul 3
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Pilih divisi aktif untuk menempatkan (<em>Assign</em>) atau melepas
            anggota tanpa menghapus akun pengguna.
          </p>
        </div>

        <button
          type="button"
          onClick={handleResetSimulation}
          className="inline-flex w-fit cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-600 shadow-xs transition-colors duration-200 hover:bg-slate-50 hover:text-slate-900"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          Reset Simulasi
        </button>
      </div>

      {/* Kartu Selector Divisi Aktif */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex-1 space-y-2">
            <label
              htmlFor="active-division-selector"
              className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600"
            >
              <Building2 className="h-4 w-4 text-blue-600" aria-hidden="true" />
              Pilih Divisi Aktif
            </label>
            <select
              id="active-division-selector"
              value={selectedDivisionId ? String(selectedDivisionId) : ""}
              onChange={(e) =>
                setSelectedDivisionId(
                  e.target.value ? Number(e.target.value) : null
                )
              }
              className="w-full max-w-xl cursor-pointer rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-sm font-semibold text-slate-900 transition-colors duration-200 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {cmsState.divisions.length === 0 && (
                <option value="">Belum ada divisi tersedia</option>
              )}
              {cmsState.divisions.map((div) => {
                const count = cmsState.users.filter(
                  (u) => u.divisionId === div.id
                ).length;
                const leader = div.leaderId
                  ? cmsState.users.find((u) => u.id === div.leaderId)
                  : null;
                return (
                  <option key={div.id} value={String(div.id)}>
                    {div.name} (Ketua: {leader ? leader.fullName : "Belum Ada"} —{" "}
                    {count} Anggota)
                  </option>
                );
              })}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
              <Info className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" />
              <span>
                <strong>{unassignedEmployeesCount}</strong> karyawan belum punya
                divisi
              </span>
            </div>

            <button
              type="button"
              disabled={!activeDivision}
              onClick={() => setIsAssignOpen(true)}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm shadow-blue-600/20 transition-colors duration-200 hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              <UserPlus className="h-4 w-4" aria-hidden="true" />
              Assign Anggota
            </button>
          </div>
        </div>

        {/* Ringkasan Info Divisi Terpilih */}
        {activeDivision && (
          <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-4 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <Crown className="h-4 w-4 text-blue-600" aria-hidden="true" />
              Ketua:{" "}
              <strong className="text-slate-900">
                {activeLeader ? activeLeader.fullName : "Belum Ditetapkan"}
              </strong>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-4 w-4 text-emerald-600" aria-hidden="true" />
              Total Anggota:{" "}
              <strong className="text-slate-900">
                {divisionMembers.length} Orang
              </strong>
            </span>
            {activeDivision.description && (
              <span className="text-slate-500">{activeDivision.description}</span>
            )}
          </div>
        )}
      </section>

      {/* Toolbar Filter Anggota */}
      {activeDivision && (
        <DataTableToolbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={`Cari anggota di divisi ${activeDivision.name}...`}
          filters={filterConfigs}
          sortOptions={sortOptions}
          currentSort={sortBy}
          onSortChange={setSortBy}
          onReset={handleResetFilters}
          hasActiveFilters={hasActiveFilters}
          totalFiltered={filteredMembers.length}
          totalAll={divisionMembers.length}
        />
      )}

      {/* Tabel Anggota Divisi */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {!activeDivision ? (
          <div className="p-8">
            <EmptyState
              title="Belum ada divisi yang dipilih"
              description="Buat divisi terlebih dahulu di Modul 2 (Manajemen Divisi) untuk mengelola anggota."
            />
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="Belum ada anggota pada tampilan ini"
              description="Klik tombol Assign Anggota di atas untuk menambahkan karyawan ke divisi ini."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-600">
                <tr>
                  <th className="px-5 py-3.5">Nama Lengkap</th>
                  <th className="px-4 py-3.5">Email</th>
                  <th className="px-4 py-3.5">Role</th>
                  <th className="px-4 py-3.5">Sisa Kuota</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredMembers.map((member) => {
                  const isDivisionLeader =
                    member.id === activeDivision.leaderId;
                  return (
                    <tr
                      key={member.id}
                      className="transition-colors duration-150 hover:bg-slate-50/80"
                    >
                      <td className="whitespace-nowrap px-5 py-3.5">
                        <p className="font-semibold text-slate-900">
                          {member.fullName}
                        </p>
                        <p className="font-mono text-[11px] text-slate-500">
                          @{member.username}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-xs text-slate-600">
                        {member.email}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5">
                        <StatusBadge status={member.role} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-xs font-bold text-slate-900">
                        {Number(member.remainingLeaveQuota).toFixed(1)} Hari
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5">
                        <StatusBadge
                          status={member.isActive ? "Aktif" : "Nonaktif"}
                        />
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-right">
                        {isDivisionLeader ? (
                          <span
                            title="Ganti Ketua Divisi melalui Modul 2 (Manajemen Divisi) terlebih dahulu"
                            className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700"
                          >
                            <Crown className="h-3.5 w-3.5" aria-hidden="true" />
                            Ketua Divisi
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setRemoveTarget(member)}
                            className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 transition-colors duration-200 hover:bg-rose-100"
                          >
                            <UserMinus
                              className="h-3.5 w-3.5"
                              aria-hidden="true"
                            />
                            Keluarkan
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Catatan Invarian Modul 3 */}
        <div className="flex items-center gap-2 border-t border-slate-200 bg-slate-50/80 px-5 py-3 text-xs text-slate-600">
          <ShieldCheck
            className="h-4 w-4 shrink-0 text-emerald-600"
            aria-hidden="true"
          />
          <span>
            Tombol <strong>Keluarkan</strong> hanya melepas atribut divisi (
            <code>UPDATE users SET division_id = NULL</code>) dan{" "}
            <strong>TIDAK menghapus akun pengguna</strong>.
          </span>
        </div>
      </section>

      {/* Modal Assign Anggota */}
      <AssignMemberModal
        isOpen={isAssignOpen}
        targetDivision={activeDivision}
        users={cmsState.users}
        divisions={cmsState.divisions}
        onClose={() => setIsAssignOpen(false)}
        onAssign={handleAssignMembers}
      />

      {/* Modal Konfirmasi Keluarkan Anggota */}
      {removeTarget && activeDivision && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="remove-member-modal-title"
        >
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            onClick={() => setRemoveTarget(null)}
            aria-hidden="true"
          />
          <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 bg-slate-50/70 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                  <UserMinus className="h-4 w-4" aria-hidden="true" />
                </div>
                <h3
                  id="remove-member-modal-title"
                  className="text-sm font-bold text-slate-900"
                >
                  Keluarkan dari Divisi {activeDivision.name}?
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRemoveTarget(null)}
                aria-label="Tutup modal"
                className="cursor-pointer rounded-lg p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-3 px-5 py-4 text-xs leading-relaxed text-slate-600">
              <p>
                <strong className="text-slate-900">
                  {removeTarget.fullName}
                </strong>{" "}
                akan dilepas dari divisi{" "}
                <strong className="text-slate-900">
                  {activeDivision.name}
                </strong>
                .
              </p>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-900">
                Akun pengguna <strong>tidak akan dihapus</strong>. Pengguna
                hanya memiliki <code>division_id = NULL</code> dan dapat
                di-assign kembali ke divisi mana pun.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">
              <button
                type="button"
                onClick={() => setRemoveTarget(null)}
                className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmRemoveMember}
                className="cursor-pointer rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700"
              >
                Ya, Keluarkan dari Divisi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
