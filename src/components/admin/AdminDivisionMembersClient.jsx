"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Crown,
  Info,
  Loader2,
  RefreshCw,
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
  assignMembersAction,
  removeMemberAction,
} from "@/actions/division-member-actions";

/**
 * Workspace CMS Modul 3: Manajemen Anggota Divisi (/admin/division-members) — Pure Production.
 * Terhubung ke PostgreSQL via Server Component initial load, Server Actions (assignMembersAction &
 * removeMemberAction), dan Route Handler GET /api/admin/division-members.
 */
export default function AdminDivisionMembersClient({
  initialDivisions = [],
  initialUsers = [],
  initialSelectedDivisionId = null,
}) {
  const router = useRouter();
  const removeDialogRef = useRef(null);
  const removeTitleId = useId();
  const tableCaptionId = useId();
  const selectorId = useId();

  const [divisions, setDivisions] = useState(initialDivisions);
  const [users, setUsers] = useState(initialUsers);
  const [selectedDivisionId, setSelectedDivisionId] = useState(
    initialSelectedDivisionId ?? initialDivisions[0]?.id ?? null
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("leader_first");

  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignError, setAssignError] = useState("");

  const [removeTarget, setRemoveTarget] = useState(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [removeError, setRemoveError] = useState("");

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toast, setToast] = useState(null); // { message: string, tone: "success" | "error" }

  useEffect(() => {
    setDivisions(initialDivisions);
  }, [initialDivisions]);

  useEffect(() => {
    setUsers(initialUsers);
  }, [initialUsers]);

  useEffect(() => {
    if (
      selectedDivisionId &&
      divisions.some((d) => d.id === selectedDivisionId)
    ) {
      return;
    }
    setSelectedDivisionId(divisions[0]?.id ?? null);
  }, [divisions, selectedDivisionId]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  // Sinkronisasi native <dialog> untuk modal konfirmasi keluarkan anggota
  useEffect(() => {
    const dialog = removeDialogRef.current;
    if (!dialog) return;

    if (removeTarget) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.close();
      dialog.returnValue = "";
    }
  }, [removeTarget]);

  // Event cancel/close & Safari light-dismiss fallback untuk remove <dialog>
  useEffect(() => {
    const dialog = removeDialogRef.current;
    if (!dialog || !removeTarget) return undefined;

    function handleCancel(event) {
      if (isRemoving) {
        event.preventDefault();
      }
    }

    function handleClose() {
      dialog.returnValue = "";
      if (!isRemoving) {
        setRemoveTarget(null);
        setRemoveError("");
      }
    }

    dialog.addEventListener("cancel", handleCancel);
    dialog.addEventListener("close", handleClose);

    let cleanupPointer = null;
    if (
      typeof HTMLDialogElement !== "undefined" &&
      !("closedBy" in HTMLDialogElement.prototype)
    ) {
      let pressedOutside = false;
      const isOutside = (e) => {
        const rect = dialog.getBoundingClientRect();
        return (
          e.clientX < rect.left ||
          e.clientX > rect.right ||
          e.clientY < rect.top ||
          e.clientY > rect.bottom
        );
      };
      const onPointerDown = (e) => {
        pressedOutside = isOutside(e);
      };
      const onPointerUp = (e) => {
        if (!isRemoving && pressedOutside && isOutside(e)) {
          dialog.close();
        }
        pressedOutside = false;
      };
      dialog.addEventListener("pointerdown", onPointerDown);
      dialog.addEventListener("pointerup", onPointerUp);
      cleanupPointer = () => {
        dialog.removeEventListener("pointerdown", onPointerDown);
        dialog.removeEventListener("pointerup", onPointerUp);
      };
    }

    return () => {
      dialog.removeEventListener("cancel", handleCancel);
      dialog.removeEventListener("close", handleClose);
      cleanupPointer?.();
    };
  }, [removeTarget, isRemoving]);

  function showToast(message, tone = "success") {
    setToast({ message, tone });
  }

  async function refreshFromApi({ silent = false } = {}) {
    setIsRefreshing(true);
    try {
      const qs = selectedDivisionId
        ? `?divisionId=${encodeURIComponent(selectedDivisionId)}`
        : "";
      const res = await fetch(`/api/admin/division-members${qs}`, {
        method: "GET",
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        if (!silent) {
          showToast(
            data.error || "Gagal menyinkronkan data anggota divisi.",
            "error"
          );
        }
        return;
      }
      setDivisions(data.divisions || []);
      setUsers(data.users || []);
      if (!silent) {
        showToast("Data anggota divisi disinkronkan dari PostgreSQL.");
      }
    } catch {
      if (!silent) {
        showToast("Koneksi jaringan bermasalah saat memuat ulang data.", "error");
      }
    } finally {
      setIsRefreshing(false);
    }
  }

  const activeDivision = useMemo(
    () => divisions.find((d) => d.id === selectedDivisionId) || null,
    [divisions, selectedDivisionId]
  );

  const activeLeader = activeDivision?.leader || null;

  const unassignedEmployeesCount = useMemo(
    () =>
      users.filter(
        (u) => u.role === "Karyawan" && u.isActive && u.divisionId === null
      ).length,
    [users]
  );

  const divisionMembers = useMemo(() => {
    if (!activeDivision) return [];
    return users.filter((u) => u.divisionId === activeDivision.id);
  }, [users, activeDivision]);

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

  async function handleAssignMembers(userIds) {
    if (!activeDivision || userIds.length === 0) return;

    setIsAssigning(true);
    setAssignError("");
    try {
      const result = await assignMembersAction(activeDivision.id, userIds);
      if (!result.ok) {
        setAssignError(result.error || "Gagal menempatkan karyawan ke divisi.");
        return;
      }

      setIsAssignOpen(false);
      showToast(
        result.message ||
          `${userIds.length} karyawan berhasil ditempatkan ke divisi ${activeDivision.name}.`
      );
      await refreshFromApi({ silent: true });
      router.refresh();
    } catch {
      setAssignError("Terjadi kesalahan jaringan saat menempatkan karyawan.");
    } finally {
      setIsAssigning(false);
    }
  }

  async function handleConfirmRemoveMember() {
    if (!removeTarget || !activeDivision) return;

    setIsRemoving(true);
    setRemoveError("");
    try {
      const result = await removeMemberAction(
        activeDivision.id,
        removeTarget.id
      );
      if (!result.ok) {
        setRemoveError(result.error || "Gagal mengeluarkan anggota dari divisi.");
        return;
      }

      setRemoveTarget(null);
      showToast(
        result.message ||
          `"${removeTarget.fullName}" dikeluarkan dari ${activeDivision.name} (division_id = NULL).`
      );
      await refreshFromApi({ silent: true });
      router.refresh();
    } catch {
      setRemoveError("Terjadi kesalahan jaringan saat mengeluarkan anggota.");
    } finally {
      setIsRemoving(false);
    }
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
            CMS Modul 03 · Struktur Keanggotaan
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Manajemen Anggota Divisi
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-600">
            Pilih divisi aktif untuk menempatkan (<em>Assign</em>) atau melepas
            anggota secara atomik di PostgreSQL tanpa menghapus akun pengguna.
          </p>
        </div>

        <button
          type="button"
          disabled={isRefreshing}
          onClick={() => refreshFromApi({ silent: false })}
          className="inline-flex w-fit cursor-pointer items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-800 transition-colors duration-150 hover:bg-[#F4F2EC] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
          Muat Ulang
        </button>
      </header>

      {/* Kartu Selector Divisi Aktif */}
      <section className="rounded-xl border border-stone-200 bg-white p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex-1 space-y-2">
            <label
              htmlFor={selectorId}
              className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-700"
            >
              <Building2 className="h-4 w-4 text-slate-800" aria-hidden="true" />
              Pilih Divisi Aktif
            </label>
            <select
              id={selectorId}
              value={selectedDivisionId ? String(selectedDivisionId) : ""}
              onChange={(e) =>
                setSelectedDivisionId(
                  e.target.value ? Number(e.target.value) : null
                )
              }
              className="w-full max-w-xl cursor-pointer rounded-lg border border-stone-300 bg-[#F4F2EC]/55 px-3.5 py-2.5 text-sm font-semibold text-slate-900 transition-colors duration-150 focus-visible:border-slate-900 focus-visible:bg-white focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-slate-900"
            >
              {divisions.length === 0 && (
                <option value="">Belum ada divisi tersedia</option>
              )}
              {divisions.map((div) => {
                const count = users.filter((u) => u.divisionId === div.id).length;
                return (
                  <option key={div.id} value={String(div.id)}>
                    {div.name} (Ketua:{" "}
                    {div.leader ? div.leader.fullName : "Belum Ada"} — {count}{" "}
                    Anggota)
                  </option>
                );
              })}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-950 tabular-nums">
              <Info className="h-3.5 w-3.5 text-amber-700" aria-hidden="true" />
              <span>
                <strong>{unassignedEmployeesCount}</strong> karyawan belum punya
                divisi
              </span>
            </div>

            <button
              type="button"
              disabled={!activeDivision}
              onClick={() => {
                setAssignError("");
                setIsAssignOpen(true);
              }}
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white transition-colors duration-150 hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              <UserPlus className="h-4 w-4" aria-hidden="true" />
              Assign Anggota
            </button>
          </div>
        </div>

        {/* Ringkasan Info Divisi Terpilih */}
        {activeDivision && (
          <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-stone-200 pt-4 text-xs text-slate-700">
            <span className="inline-flex items-center gap-1.5">
              <Crown className="h-4 w-4 text-slate-800" aria-hidden="true" />
              Ketua:{" "}
              <strong className="text-slate-900">
                {activeLeader ? activeLeader.fullName : "Belum Ditetapkan"}
              </strong>
            </span>
            <span className="inline-flex items-center gap-1.5 tabular-nums">
              <Users className="h-4 w-4 text-emerald-700" aria-hidden="true" />
              Total Anggota:{" "}
              <strong className="text-slate-900">
                {divisionMembers.length} Orang
              </strong>
            </span>
            {activeDivision.description && (
              <span className="text-slate-600">{activeDivision.description}</span>
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

      {/* Tabel Anggota Divisi (Responsive Container Query) */}
      <section className="overflow-hidden rounded-xl border border-stone-200 bg-white">
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
          <div
            tabIndex={0}
            role="region"
            aria-labelledby={tableCaptionId}
            className="otium-responsive-table-wrap focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-slate-900"
          >
            <table className="otium-responsive-table text-left text-sm">
              <caption id={tableCaptionId} className="sr-only">
                Daftar anggota pada divisi {activeDivision.name}
              </caption>
              <thead className="bg-[#F4F2EC] text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-700">
                <tr>
                  <th scope="col" className="border-b border-stone-200 px-5 py-3.5">
                    Nama Lengkap
                  </th>
                  <th scope="col" className="border-b border-stone-200 px-4 py-3.5">
                    Email
                  </th>
                  <th scope="col" className="border-b border-stone-200 px-4 py-3.5">
                    Role
                  </th>
                  <th scope="col" className="border-b border-stone-200 px-4 py-3.5">
                    Sisa Kuota
                  </th>
                  <th scope="col" className="border-b border-stone-200 px-4 py-3.5">
                    Status
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
                {filteredMembers.map((member) => {
                  const isDivisionLeader =
                    member.id === activeDivision.leaderId;
                  return (
                    <tr
                      key={member.id}
                      className="transition-colors duration-150 hover:bg-[#F4F2EC]/45"
                    >
                      <th
                        scope="row"
                        className="whitespace-nowrap px-5 py-3.5 font-normal"
                      >
                        <p className="font-semibold text-slate-900">
                          {member.fullName}
                        </p>
                        <p className="font-mono text-[11px] text-slate-600">
                          @{member.username}
                        </p>
                      </th>
                      <td
                        data-label="Email"
                        className="whitespace-nowrap px-4 py-3.5 text-xs text-slate-700"
                      >
                        {member.email}
                      </td>
                      <td
                        data-label="Role"
                        className="whitespace-nowrap px-4 py-3.5"
                      >
                        <StatusBadge status={member.role} />
                      </td>
                      <td
                        data-label="Sisa Kuota"
                        className="whitespace-nowrap px-4 py-3.5 text-xs font-bold text-slate-900 tabular-nums"
                      >
                        {Number(member.remainingLeaveQuota).toFixed(1)} Hari
                      </td>
                      <td
                        data-label="Status"
                        className="whitespace-nowrap px-4 py-3.5"
                      >
                        <StatusBadge
                          status={member.isActive ? "Aktif" : "Nonaktif"}
                        />
                      </td>
                      <td
                        data-label="Aksi"
                        className="whitespace-nowrap px-5 py-3.5 text-right"
                      >
                        {isDivisionLeader ? (
                          <span
                            title="Ganti Ketua Divisi melalui Modul 2 (Manajemen Divisi) terlebih dahulu"
                            className="inline-flex items-center gap-1 rounded-lg border border-stone-300 bg-[#F4F2EC] px-2.5 py-1.5 text-xs font-semibold text-slate-800"
                          >
                            <Crown className="h-3.5 w-3.5" aria-hidden="true" />
                            Ketua Divisi
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setRemoveError("");
                              setRemoveTarget(member);
                            }}
                            className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-800 transition-colors duration-150 hover:bg-rose-100 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-rose-700"
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
        <div className="flex items-center gap-2 border-t border-stone-200 bg-[#F4F2EC]/70 px-5 py-3 text-xs text-slate-700">
          <ShieldCheck
            className="h-4 w-4 shrink-0 text-emerald-700"
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
        users={users}
        divisions={divisions}
        isSubmitting={isAssigning}
        errorMessage={assignError}
        onClose={() => {
          if (!isAssigning) {
            setIsAssignOpen(false);
            setAssignError("");
          }
        }}
        onAssign={handleAssignMembers}
      />

      {/* Native <dialog> Modal Konfirmasi Keluarkan Anggota */}
      <dialog
        ref={removeDialogRef}
        closedby={isRemoving ? "none" : "any"}
        aria-labelledby={removeTitleId}
        className="otium-modal w-full max-w-md"
      >
        {removeTarget && activeDivision && (
          <div className="w-full overflow-hidden rounded-xl border border-stone-300 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-stone-200 bg-[#F4F2EC] px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-300 bg-amber-50 text-amber-800">
                  <UserMinus className="h-4 w-4" aria-hidden="true" />
                </div>
                <h2
                  id={removeTitleId}
                  className="text-sm font-bold tracking-tight text-slate-900"
                >
                  Keluarkan dari Divisi {activeDivision.name}?
                </h2>
              </div>
              <button
                type="button"
                disabled={isRemoving}
                onClick={() => setRemoveTarget(null)}
                aria-label="Tutup modal konfirmasi keluarkan anggota"
                className="cursor-pointer rounded-lg p-1 text-slate-600 transition-colors duration-150 hover:bg-stone-200/80 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-3 px-5 py-4 text-xs leading-relaxed text-slate-700">
              {removeError && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2.5 font-medium text-rose-950"
                >
                  <AlertCircle
                    className="mt-0.5 h-4 w-4 shrink-0 text-rose-700"
                    aria-hidden="true"
                  />
                  <span>{removeError}</span>
                </div>
              )}

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
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-950">
                Akun pengguna <strong>tidak akan dihapus</strong>. Pengguna
                hanya memiliki <code>division_id = NULL</code> dan dapat
                di-assign kembali ke divisi mana pun.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-stone-200 bg-[#F4F2EC]/70 px-5 py-3">
              <button
                type="button"
                autoFocus
                disabled={isRemoving}
                onClick={() => setRemoveTarget(null)}
                className="cursor-pointer rounded-lg border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 transition-colors duration-150 hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isRemoving}
                onClick={handleConfirmRemoveMember}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-rose-700 px-4 py-2 text-xs font-semibold text-white transition-colors duration-150 hover:bg-rose-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700 disabled:cursor-not-allowed disabled:bg-rose-300"
              >
                {isRemoving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <UserMinus className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {isRemoving ? "Mengeluarkan..." : "Ya, Keluarkan dari Divisi"}
              </button>
            </div>
          </div>
        )}
      </dialog>
    </div>
  );
}
