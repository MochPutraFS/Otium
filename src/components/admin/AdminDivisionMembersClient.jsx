"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
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
 * Workspace CMS Modul 3: Manajemen Anggota Divisi (/admin/division-members) — Swiss Archival.
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
      if (sortBy === "quota_asc") {
        return Number(a.remainingLeaveQuota) - Number(b.remainingLeaveQuota);
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

  function handleColumnSort(col) {
    if (col === "name") {
      setSortBy((prev) => (prev === "name_asc" ? "name_desc" : "name_asc"));
    } else if (col === "quota") {
      setSortBy((prev) => (prev === "quota_desc" ? "quota_asc" : "quota_desc"));
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
    { value: "quota_asc", label: "Sisa Kuota Tersedikit" },
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
            CMS MODUL 03 · STRUKTUR KEANGGOTAAN
          </p>
          <h1 className="mt-1 font-serif text-[28px] font-semibold leading-tight tracking-[-0.015em] text-[var(--ink)] sm:text-[32px]">
            Manajemen Anggota Divisi
          </h1>
          <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-[var(--ink-soft)]">
            Pilih divisi aktif untuk menempatkan (<em>Assign</em>) atau melepas
            anggota secara atomik di PostgreSQL tanpa menghapus akun pengguna.
          </p>
        </div>

        <button
          type="button"
          disabled={isRefreshing}
          onClick={() => refreshFromApi({ silent: false })}
          className="btn btn-sm w-fit"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
          Muat Ulang
        </button>
      </header>

      {/* Kartu Selector Divisi Aktif */}
      <section className="panel">
        <div className="panel-body">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex-1 space-y-2">
              <label
                htmlFor={selectorId}
                className="flex items-center gap-1.5 font-mono text-[10.5px] font-medium uppercase tracking-[0.12em] text-[var(--ink-muted)]"
              >
                <Building2 className="h-3.5 w-3.5 text-[var(--spruce)]" aria-hidden="true" />
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
                className="select w-full max-w-xl font-medium"
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
              <div className="notice notice-warn !py-1.5 !px-3 text-[12px] tabular-nums">
                <Info className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>
                  <strong>{unassignedEmployeesCount}</strong> karyawan belum
                  punya divisi
                </span>
              </div>

              <button
                type="button"
                disabled={!activeDivision}
                onClick={() => {
                  setAssignError("");
                  setIsAssignOpen(true);
                }}
                className="btn btn-primary btn-sm"
              >
                <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
                Assign Anggota
              </button>
            </div>
          </div>

          {/* Ringkasan Info Divisi Terpilih */}
          {activeDivision && (
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[var(--rule)] pt-4 text-[12.5px] text-[var(--ink-soft)]">
              <span className="inline-flex items-center gap-1.5">
                <Crown
                  className="h-3.5 w-3.5 text-[var(--ochre)]"
                  aria-hidden="true"
                />
                Ketua:{" "}
                <strong className="text-[var(--ink)]">
                  {activeLeader ? activeLeader.fullName : "Belum Ditetapkan"}
                </strong>
              </span>
              <span className="inline-flex items-center gap-1.5 tabular-nums">
                <Users
                  className="h-3.5 w-3.5 text-[var(--spruce)]"
                  aria-hidden="true"
                />
                Total Anggota:{" "}
                <strong className="font-mono text-[var(--ink)]">
                  {divisionMembers.length} Orang
                </strong>
              </span>
              {activeDivision.description && (
                <span className="text-[var(--ink-muted)]">
                  {activeDivision.description}
                </span>
              )}
            </div>
          )}
        </div>
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

      {/* Ledger Anggota Divisi */}
      <section className="panel overflow-hidden">
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
                  Daftar anggota pada divisi {activeDivision.name}
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
                        <span>Nama Lengkap</span>
                        {renderSortIcon("name")}
                      </button>
                    </th>
                    <th scope="col">Email</th>
                    <th scope="col">Role</th>
                    <th scope="col" aria-sort={getAriaSort("quota")}>
                      <button
                        type="button"
                        onClick={() => handleColumnSort("quota")}
                      >
                        <span>Sisa Kuota</span>
                        {renderSortIcon("quota")}
                      </button>
                    </th>
                    <th scope="col">Status</th>
                    <th scope="col" className="text-right">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map((member, idx) => {
                    const isDivisionLeader =
                      member.id === activeDivision.leaderId;
                    return (
                      <tr key={member.id}>
                        <td className="row-idx text-center">
                          {String(idx + 1).padStart(2, "0")}
                        </td>
                        <th scope="row" className="whitespace-nowrap font-normal">
                          <p className="text-[13px] font-semibold text-[var(--ink)]">
                            {member.fullName}
                          </p>
                          <p className="font-mono text-[11px] text-[var(--ink-muted)]">
                            @{member.username}
                          </p>
                        </th>
                        <td className="whitespace-nowrap font-mono text-[12px] text-[var(--ink-soft)]">
                          {member.email}
                        </td>
                        <td className="whitespace-nowrap">
                          <StatusBadge status={member.role} />
                        </td>
                        <td className="whitespace-nowrap font-mono text-[12.5px] font-semibold tabular-nums text-[var(--ink)]">
                          {Number(member.remainingLeaveQuota).toFixed(1)} Hari
                        </td>
                        <td className="whitespace-nowrap">
                          <StatusBadge
                            status={member.isActive ? "Aktif" : "Nonaktif"}
                          />
                        </td>
                        <td className="whitespace-nowrap text-right">
                          {isDivisionLeader ? (
                            <span
                              title="Ganti Ketua Divisi melalui Modul 2 (Manajemen Divisi) terlebih dahulu"
                              className="tag tag-leader w-[112px] justify-center"
                            >
                              <Crown className="h-3 w-3" aria-hidden="true" />
                              Ketua Divisi
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setRemoveError("");
                                setRemoveTarget(member);
                              }}
                              className="btn btn-sm btn-danger-ghost w-[112px] justify-center"
                            >
                              <UserMinus
                                className="h-3 w-3"
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

            {/* Mobile Ledger Cards (< md) */}
            <div className="divide-y divide-[var(--rule)] md:hidden">
              {filteredMembers.map((member, idx) => {
                const isDivisionLeader = member.id === activeDivision.leaderId;
                return (
                  <article key={member.id} className="ledger-card">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-[13.5px] font-semibold text-[var(--ink)]">
                          {member.fullName}
                        </p>
                        <p className="truncate font-mono text-[11px] text-[var(--ink-muted)]">
                          @{member.username} · {member.email}
                        </p>
                      </div>
                      <span className="font-mono text-[10.5px] text-[var(--ink-muted)]">
                        #{String(idx + 1).padStart(2, "0")}
                      </span>
                    </div>

                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      <StatusBadge status={member.role} />
                      <StatusBadge
                        status={member.isActive ? "Aktif" : "Nonaktif"}
                      />
                      <span className="tag font-mono tabular-nums">
                        Sisa: {Number(member.remainingLeaveQuota).toFixed(1)} Hr
                      </span>
                    </div>

                    <div className="mt-3 flex items-center justify-end border-t border-[var(--rule)] pt-3">
                      {isDivisionLeader ? (
                        <span className="tag tag-leader">
                          <Crown className="h-3 w-3" aria-hidden="true" />
                          Ketua Divisi
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setRemoveError("");
                            setRemoveTarget(member);
                          }}
                          className="btn btn-sm btn-danger-ghost"
                        >
                          <UserMinus className="h-3 w-3" aria-hidden="true" />
                          Keluarkan
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}

        {/* Catatan Invarian Modul 3 */}
        <div className="flex items-center gap-2 border-t border-[var(--rule)] bg-[var(--alabaster)] px-5 py-3 text-[12px] text-[var(--ink-soft)]">
          <ShieldCheck
            className="h-4 w-4 shrink-0 text-[var(--spruce)]"
            aria-hidden="true"
          />
          <span>
            Tombol <strong className="text-[var(--ink)]">Keluarkan</strong> hanya
            melepas atribut divisi (
            <code className="font-mono text-[11px] text-[var(--ink)]">
              UPDATE users SET division_id = NULL
            </code>
            ) dan{" "}
            <strong className="text-[var(--ink)]">
              TIDAK menghapus akun pengguna
            </strong>
            .
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
          <div className="w-full overflow-hidden rounded-[6px] border border-[var(--ink)] bg-[var(--paper-pure)] shadow-[var(--shadow-lg)]">
            <div className="flex items-start justify-between gap-3 border-b border-[var(--ochre-border)] bg-[var(--ochre-tint)] px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[4px] border border-[var(--ochre-border)] bg-[var(--paper-pure)] text-[var(--ochre)]">
                  <UserMinus className="h-4 w-4" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--ochre)]">
                    LEPAS KEANGGOTAAN DIVISI
                  </p>
                  <h2
                    id={removeTitleId}
                    className="font-serif text-[18px] font-semibold leading-snug text-[var(--ink)]"
                  >
                    Keluarkan dari {activeDivision.name}?
                  </h2>
                </div>
              </div>
              <button
                type="button"
                disabled={isRemoving}
                onClick={() => setRemoveTarget(null)}
                aria-label="Tutup modal konfirmasi keluarkan anggota"
                className="btn-icon h-7 w-7 shrink-0"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-3 px-5 py-4 text-[12.5px] leading-relaxed text-[var(--ink-soft)]">
              {removeError && (
                <div role="alert" className="notice notice-danger">
                  <AlertCircle
                    className="mt-0.5 h-4 w-4 shrink-0"
                    aria-hidden="true"
                  />
                  <span>{removeError}</span>
                </div>
              )}

              <p>
                <strong className="text-[var(--ink)]">
                  {removeTarget.fullName}
                </strong>{" "}
                akan dilepas dari divisi{" "}
                <strong className="text-[var(--ink)]">
                  {activeDivision.name}
                </strong>
                .
              </p>
              <div className="notice notice-success">
                <span>
                  Akun pengguna <strong>tidak akan dihapus</strong>. Pengguna
                  hanya memiliki{" "}
                  <code className="font-mono text-[11px]">
                    division_id = NULL
                  </code>{" "}
                  dan dapat di-assign kembali ke divisi mana pun.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-[var(--rule)] bg-[var(--alabaster)] px-5 py-3">
              <button
                type="button"
                autoFocus
                disabled={isRemoving}
                onClick={() => setRemoveTarget(null)}
                className="btn btn-sm"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isRemoving}
                onClick={handleConfirmRemoveMember}
                className="btn btn-sm btn-danger"
              >
                {isRemoving ? (
                  <Loader2
                    className="h-3.5 w-3.5 animate-spin"
                    aria-hidden="true"
                  />
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
