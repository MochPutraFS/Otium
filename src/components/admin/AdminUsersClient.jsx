"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle2,
  Loader2,
  Lock,
  Pencil,
  RefreshCw,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import EmptyState from "@/components/ui/EmptyState";
import DataTableToolbar from "@/components/ui/DataTableToolbar";
import UserFormModal from "@/components/admin/UserFormModal";
import { formatIndonesianDate } from "@/lib/date-utils";
import {
  createUserAction,
  deleteUserAction,
  updateUserAction,
} from "@/actions/user-actions";

/**
 * Workspace CMS Modul 1: Manajemen Pengguna (/admin/users) — Swiss Archival.
 * Terhubung ke PostgreSQL via Server Component initial load, Server Actions (mutasi),
 * dan Route Handler GET /api/admin/users (sinkronisasi realtime).
 */
export default function AdminUsersClient({
  initialUsers = [],
  divisions: initialDivisions = [],
  currentAdminId = null,
  todayIso = "",
}) {
  const router = useRouter();
  const deleteDialogRef = useRef(null);
  const deleteTitleId = useId();
  const tableCaptionId = useId();

  const [users, setUsers] = useState(initialUsers);
  const [divisions, setDivisions] = useState(initialDivisions);
  const [serverTodayIso, setServerTodayIso] = useState(todayIso);

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
  const [isSaving, setIsSaving] = useState(false);
  const [formServerError, setFormServerError] = useState("");
  const [formServerFieldErrors, setFormServerFieldErrors] = useState(null);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toast, setToast] = useState(null); // { message: string, tone: "success" | "error" }

  useEffect(() => {
    setUsers(initialUsers);
  }, [initialUsers]);

  useEffect(() => {
    setDivisions(initialDivisions);
  }, [initialDivisions]);

  useEffect(() => {
    setServerTodayIso(todayIso);
  }, [todayIso]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  // Sinkronisasi native <dialog> untuk modal konfirmasi hapus
  useEffect(() => {
    const dialog = deleteDialogRef.current;
    if (!dialog) return;

    if (deleteTarget) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.close();
      dialog.returnValue = "";
    }
  }, [deleteTarget]);

  // Event close/cancel & Safari light-dismiss fallback untuk delete <dialog>
  useEffect(() => {
    const dialog = deleteDialogRef.current;
    if (!dialog || !deleteTarget) return undefined;

    function handleCancel(event) {
      if (isDeleting) {
        event.preventDefault();
      }
    }

    function handleClose() {
      dialog.returnValue = "";
      if (!isDeleting) {
        setDeleteTarget(null);
        setDeleteError("");
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
        if (!isDeleting && pressedOutside && isOutside(e)) {
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
  }, [deleteTarget, isDeleting]);

  function showToast(message, tone = "success") {
    setToast({ message, tone });
  }

  async function refreshFromApi({ silent = false } = {}) {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "GET",
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        if (!silent) {
          showToast(
            data.error || "Gagal menyinkronkan data pengguna dari server.",
            "error"
          );
        }
        return;
      }
      setUsers(data.users || []);
      setDivisions(data.divisions || []);
      if (data.todayIso) {
        setServerTodayIso(data.todayIso);
      }
      if (!silent) {
        showToast("Daftar pengguna disinkronkan dari PostgreSQL.");
      }
    } catch {
      if (!silent) {
        showToast("Koneksi jaringan bermasalah saat memuat ulang data.", "error");
      }
    } finally {
      setIsRefreshing(false);
    }
  }

  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.isActive).length;
    const inactive = total - active;
    const ineligible = users.filter(
      (u) => !u.tenure?.isEligible && u.isActive
    ).length;
    const protectedCount = users.filter((u) => u.isProtected).length;
    return { total, active, inactive, ineligible, protectedCount };
  }, [users]);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const list = users.filter((user) => {
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
      if (tenureFilter === "ELIGIBLE" && !user.tenure?.isEligible) return false;
      if (tenureFilter === "INELIGIBLE" && user.tenure?.isEligible) return false;
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
          return (a.divisionName || "zzzz").localeCompare(
            b.divisionName || "zzzz",
            "id"
          );
        case "quota_desc":
          return Number(b.remainingLeaveQuota) - Number(a.remainingLeaveQuota);
        case "quota_asc":
          return Number(a.remainingLeaveQuota) - Number(b.remainingLeaveQuota);
        case "name_asc":
        default:
          return a.fullName.localeCompare(b.fullName, "id");
      }
    });
  }, [
    users,
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

  function handleColumnSort(col) {
    if (col === "name") {
      setSortBy((prev) => (prev === "name_asc" ? "name_desc" : "name_asc"));
    } else if (col === "division") {
      setSortBy("division_asc");
    } else if (col === "join") {
      setSortBy((prev) =>
        prev === "join_newest" ? "join_oldest" : "join_newest"
      );
    } else if (col === "quota") {
      setSortBy((prev) => (prev === "quota_desc" ? "quota_asc" : "quota_desc"));
    }
  }

  function getAriaSort(col) {
    if (col === "name") {
      if (sortBy === "name_asc") return "ascending";
      if (sortBy === "name_desc") return "descending";
    }
    if (col === "division" && sortBy === "division_asc") return "ascending";
    if (col === "join") {
      if (sortBy === "join_oldest") return "ascending";
      if (sortBy === "join_newest") return "descending";
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

  function openCreateModal() {
    setFormServerError("");
    setFormServerFieldErrors(null);
    setFormModalState({ isOpen: true, mode: "create", user: null });
  }

  function openEditModal(user) {
    setFormServerError("");
    setFormServerFieldErrors(null);
    setFormModalState({ isOpen: true, mode: "edit", user });
  }

  function closeFormModal() {
    if (isSaving) return;
    setFormModalState({ isOpen: false, mode: "create", user: null });
    setFormServerError("");
    setFormServerFieldErrors(null);
  }

  async function handleSaveUser(payload) {
    setIsSaving(true);
    setFormServerError("");
    setFormServerFieldErrors(null);

    try {
      const result =
        formModalState.mode === "create"
          ? await createUserAction(payload)
          : await updateUserAction(payload.id, payload);

      if (!result.ok) {
        setFormServerError(
          result.error || "Gagal menyimpan data pengguna."
        );
        if (result.fieldErrors) {
          setFormServerFieldErrors(result.fieldErrors);
        }
        return;
      }

      setFormModalState({ isOpen: false, mode: "create", user: null });
      showToast(result.message || "Data pengguna berhasil disimpan.");
      await refreshFromApi({ silent: true });
      router.refresh();
    } catch {
      setFormServerError("Terjadi kesalahan jaringan saat menghubungi server.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleConfirmDeleteUser() {
    if (!deleteTarget || isDeleting) return;
    setIsDeleting(true);
    setDeleteError("");

    try {
      const result = await deleteUserAction(deleteTarget.id);
      if (!result.ok) {
        setDeleteError(result.error || "Gagal menghapus akun pengguna.");
        return;
      }

      setDeleteTarget(null);
      showToast(result.message || "Akun pengguna berhasil dihapus.");
      await refreshFromApi({ silent: true });
      router.refresh();
    } catch {
      setDeleteError("Terjadi kesalahan jaringan saat menghapus akun.");
    } finally {
      setIsDeleting(false);
    }
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
        ...divisions.map((div) => ({
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
        { value: "ELIGIBLE", label: "≥ 1 Tahun (Eligible)" },
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
    { value: "quota_desc", label: "Sisa Kuota (Terbanyak)" },
    { value: "quota_asc", label: "Sisa Kuota (Tersedikit)" },
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
            CMS MODUL 01 · MASTER DATA PENGGUNA
          </p>
          <h1 className="mt-1 font-serif text-[28px] font-semibold leading-tight tracking-[-0.015em] text-[var(--ink)] sm:text-[32px]">
            Manajemen Pengguna
          </h1>
          <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-[var(--ink-soft)]">
            Kelola akun lintas 4 role, kuota cuti tahunan awal, tanggal
            bergabung, serta proteksi penghapusan akun Admin &amp; HRD secara
            langsung di PostgreSQL.
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
            <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
            Tambah Pengguna
          </button>
        </div>
      </header>

      {/* Metric Strip Swiss Archival (4 Kolom) */}
      <section aria-label="Ringkasan statistik pengguna" className="metric-strip">
        <div className="metric-cell">
          <p className="metric-label">Total Pengguna</p>
          <p className="metric-val tabular-nums">
            {stats.total} <small>Akun</small>
          </p>
          <p className="metric-note">Terdaftar lintas 4 role RBAC</p>
        </div>

        <div className="metric-cell">
          <p className="metric-label">Akun Aktif</p>
          <p className="metric-val tabular-nums text-[var(--spruce)]">
            {stats.active} <small>Aktif</small>
          </p>
          <p className="metric-note">
            {stats.inactive} akun berstatus Nonaktif
          </p>
        </div>

        <div className="metric-cell">
          <p className="metric-label">Masa Kerja &lt; 1 Thn</p>
          <p className="metric-val tabular-nums text-[var(--ochre)]">
            {stats.ineligible} <small>Karyawan</small>
          </p>
          <p className="metric-note">Belum eligible Cuti Tahunan</p>
        </div>

        <div className="metric-cell">
          <p className="metric-label">Akun Diproteksi</p>
          <p className="metric-val tabular-nums">
            {stats.protectedCount} <small>Akun</small>
          </p>
          <p className="metric-note">Role Admin &amp; HRD tidak dapat dihapus</p>
        </div>
      </section>

      {/* Toolbar Pencarian, Multi-Filter & Sortir */}
      <DataTableToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Cari nama lengkap, email, username, atau divisi..."
        filters={filterConfigs}
        sortOptions={sortOptions}
        currentSort={sortBy}
        onSortChange={setSortBy}
        onReset={handleResetFilters}
        hasActiveFilters={hasActiveFilters}
        totalFiltered={filteredUsers.length}
        totalAll={users.length}
      />

      {/* Ledger Data Pengguna */}
      <section className="panel overflow-hidden">
        {filteredUsers.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="Tidak ada pengguna yang cocok"
              description="Coba ubah kata kunci pencarian atau reset filter untuk melihat seluruh akun terdaftar."
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
                  Daftar akun pengguna sistem manajemen cuti Otium
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
                        <span>Nama &amp; Email</span>
                        {renderSortIcon("name")}
                      </button>
                    </th>
                    <th scope="col">Username</th>
                    <th scope="col">Role &amp; Status</th>
                    <th scope="col" aria-sort={getAriaSort("division")}>
                      <button
                        type="button"
                        onClick={() => handleColumnSort("division")}
                      >
                        <span>Divisi</span>
                        {renderSortIcon("division")}
                      </button>
                    </th>
                    <th scope="col" aria-sort={getAriaSort("join")}>
                      <button
                        type="button"
                        onClick={() => handleColumnSort("join")}
                      >
                        <span>Tgl Bergabung</span>
                        {renderSortIcon("join")}
                      </button>
                    </th>
                    <th scope="col" aria-sort={getAriaSort("quota")}>
                      <button
                        type="button"
                        onClick={() => handleColumnSort("quota")}
                      >
                        <span>Sisa Kuota</span>
                        {renderSortIcon("quota")}
                      </button>
                    </th>
                    <th scope="col" className="text-right">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user, idx) => {
                    const isSelf = Number(user.id) === Number(currentAdminId);
                    return (
                      <tr key={user.id}>
                        <td className="row-idx text-center">
                          {String(idx + 1).padStart(2, "0")}
                        </td>
                        <th scope="row" className="whitespace-nowrap font-normal">
                          <div className="flex items-center gap-3">
                            <div className="avatar-sq">{user.initials}</div>
                            <div className="min-w-0">
                              <p className="flex items-center gap-1.5 text-[13px] font-semibold text-[var(--ink)]">
                                <span className="truncate">{user.fullName}</span>
                                {isSelf && (
                                  <span className="tag text-[9.5px]">Anda</span>
                                )}
                              </p>
                              <p className="truncate text-[11.5px] text-[var(--ink-muted)]">
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </th>
                        <td className="whitespace-nowrap font-mono text-[12px] text-[var(--ink-soft)]">
                          @{user.username}
                        </td>
                        <td className="whitespace-nowrap">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <StatusBadge status={user.role} />
                            <StatusBadge
                              status={user.isActive ? "Aktif" : "Nonaktif"}
                            />
                          </div>
                        </td>
                        <td className="whitespace-nowrap text-[12.5px] text-[var(--ink)]">
                          {user.divisionName ? (
                            <span className="inline-flex items-center gap-1.5 font-medium">
                              <span>{user.divisionName}</span>
                              {user.ledDivisionName && (
                                <span className="tag tag-leader text-[9.5px]">
                                  Ketua
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="italic text-[var(--ink-muted)]">
                              Belum ada divisi
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap">
                          <p className="font-mono text-[12px] tabular-nums text-[var(--ink)]">
                            {formatIndonesianDate(user.joinDate)}
                          </p>
                          <div className="mt-1 flex items-center gap-1.5">
                            <span className="font-mono text-[10.5px] text-[var(--ink-muted)]">
                              {user.tenure?.label}
                            </span>
                            {!user.tenure?.isEligible && (
                              <StatusBadge status="Belum Eligible" />
                            )}
                          </div>
                        </td>
                        <td className="whitespace-nowrap">
                          <p className="font-mono text-[13px] font-semibold tabular-nums text-[var(--ink)]">
                            {Number(user.remainingLeaveQuota).toFixed(1)}{" "}
                            <span className="text-[11px] font-normal text-[var(--ink-muted)]">
                              / {Number(user.initialLeaveQuota).toFixed(1)} Hr
                            </span>
                          </p>
                        </td>
                        <td className="whitespace-nowrap text-right">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEditModal(user)}
                              className="btn btn-sm w-[68px] justify-center"
                            >
                              <Pencil className="h-3 w-3" aria-hidden="true" />
                              Edit
                            </button>

                            {user.isProtected || isSelf ? (
                              <button
                                type="button"
                                disabled
                                title="Akun Admin dan HRD diproteksi dari penghapusan"
                                aria-label={`Akun ${user.fullName} diproteksi dari penghapusan`}
                                className="btn btn-sm w-[104px] cursor-not-allowed justify-center opacity-60"
                              >
                                <Lock className="h-3 w-3" aria-hidden="true" />
                                Diproteksi
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setDeleteError("");
                                  setDeleteTarget(user);
                                }}
                                className="btn btn-sm btn-danger-ghost w-[104px] justify-center"
                              >
                                <Trash2 className="h-3 w-3" aria-hidden="true" />
                                Hapus
                              </button>
                            )}
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
              {filteredUsers.map((user, idx) => {
                const isSelf = Number(user.id) === Number(currentAdminId);
                return (
                  <article key={user.id} className="ledger-card">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <div className="avatar-sq">{user.initials}</div>
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 text-[13.5px] font-semibold text-[var(--ink)]">
                            <span className="truncate">{user.fullName}</span>
                            {isSelf && (
                              <span className="tag text-[9.5px]">Anda</span>
                            )}
                          </p>
                          <p className="truncate font-mono text-[11px] text-[var(--ink-muted)]">
                            @{user.username} · {user.email}
                          </p>
                        </div>
                      </div>
                      <span className="font-mono text-[10.5px] text-[var(--ink-muted)]">
                        #{String(idx + 1).padStart(2, "0")}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      <StatusBadge status={user.role} />
                      <StatusBadge
                        status={user.isActive ? "Aktif" : "Nonaktif"}
                      />
                      {!user.tenure?.isEligible && (
                        <StatusBadge status="Belum Eligible" />
                      )}
                    </div>

                    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-[var(--rule)] pt-3 text-[12px]">
                      <div>
                        <dt className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--ink-muted)]">
                          Divisi
                        </dt>
                        <dd className="mt-0.5 font-medium text-[var(--ink)]">
                          {user.divisionName || (
                            <span className="italic text-[var(--ink-muted)]">
                              Belum ada divisi
                            </span>
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--ink-muted)]">
                          Sisa Kuota
                        </dt>
                        <dd className="mt-0.5 font-mono font-semibold tabular-nums text-[var(--ink)]">
                          {Number(user.remainingLeaveQuota).toFixed(1)} /{" "}
                          {Number(user.initialLeaveQuota).toFixed(1)} Hr
                        </dd>
                      </div>
                      <div className="col-span-2">
                        <dt className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--ink-muted)]">
                          Tanggal Bergabung
                        </dt>
                        <dd className="mt-0.5 font-mono text-[11.5px] tabular-nums text-[var(--ink-soft)]">
                          {formatIndonesianDate(user.joinDate)} (
                          {user.tenure?.label})
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-3 flex items-center justify-end gap-2 border-t border-[var(--rule)] pt-3">
                      <button
                        type="button"
                        onClick={() => openEditModal(user)}
                        className="btn btn-sm"
                      >
                        <Pencil className="h-3 w-3" aria-hidden="true" />
                        Edit
                      </button>
                      {user.isProtected || isSelf ? (
                        <button
                          type="button"
                          disabled
                          title="Akun Admin dan HRD diproteksi dari penghapusan"
                          className="btn btn-sm cursor-not-allowed opacity-60"
                        >
                          <Lock className="h-3 w-3" aria-hidden="true" />
                          Diproteksi
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteError("");
                            setDeleteTarget(user);
                          }}
                          className="btn btn-sm btn-danger-ghost"
                        >
                          <Trash2 className="h-3 w-3" aria-hidden="true" />
                          Hapus
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </section>

      {/* Modal Tambah / Edit Pengguna (Native <dialog>) */}
      <UserFormModal
        isOpen={formModalState.isOpen}
        mode={formModalState.mode}
        initialUser={formModalState.user}
        currentAdminId={currentAdminId}
        todayIso={serverTodayIso}
        existingUsers={users}
        divisions={divisions}
        isSubmitting={isSaving}
        serverError={formServerError}
        serverFieldErrors={formServerFieldErrors}
        onClose={closeFormModal}
        onSubmit={handleSaveUser}
      />

      {/* Modal Konfirmasi Hapus Pengguna (Native <dialog>, khusus Karyawan & Ketua Divisi) */}
      <dialog
        ref={deleteDialogRef}
        closedby={isDeleting ? "none" : "any"}
        aria-labelledby={deleteTitleId}
        className="otium-modal w-full max-w-md"
      >
        {deleteTarget && (
          <div className="w-full overflow-hidden rounded-[6px] border border-[var(--ink)] bg-[var(--paper-pure)] shadow-[var(--shadow-lg)]">
            <div className="flex items-start justify-between gap-3 border-b border-[var(--terracotta-border)] bg-[var(--terracotta-tint)] px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[4px] border border-[var(--terracotta-border)] bg-[var(--paper-pure)] text-[var(--terracotta)]">
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--terracotta)]">
                    KONFIRMASI PENGHAPUSAN AKUN
                  </p>
                  <h2
                    id={deleteTitleId}
                    className="font-serif text-[18px] font-semibold leading-snug text-[var(--ink)]"
                  >
                    Hapus Akun Pengguna?
                  </h2>
                </div>
              </div>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteTarget(null)}
                aria-label="Tutup dialog"
                className="btn-icon h-7 w-7 shrink-0"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-3 px-5 py-4 text-[12.5px] leading-relaxed text-[var(--ink-soft)]">
              {deleteError && (
                <div role="alert" className="notice notice-danger">
                  <AlertCircle
                    className="mt-0.5 h-4 w-4 shrink-0"
                    aria-hidden="true"
                  />
                  <span>{deleteError}</span>
                </div>
              )}

              <p>
                Anda akan menghapus permanen akun{" "}
                <strong className="text-[var(--ink)]">
                  {deleteTarget.fullName}
                </strong>{" "}
                (<StatusBadge status={deleteTarget.role} />) dengan email{" "}
                <strong className="font-mono text-[12px] text-[var(--ink)]">
                  {deleteTarget.email}
                </strong>
                .
              </p>

              {(deleteTarget.role === "Ketua Divisi" ||
                deleteTarget.ledDivisionName) && (
                <div className="notice notice-warn">
                  <span>
                    Pengguna ini adalah <strong>Ketua Divisi</strong>
                    {deleteTarget.ledDivisionName
                      ? ` (${deleteTarget.ledDivisionName})`
                      : ""}
                    . Posisi kepemimpinan divisi akan dikosongkan otomatis dalam
                    transaksi SQL.
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-[var(--rule)] bg-[var(--alabaster)] px-5 py-3">
              <button
                type="button"
                autoFocus
                disabled={isDeleting}
                onClick={() => setDeleteTarget(null)}
                className="btn btn-sm"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDeleteUser}
                className="btn btn-sm btn-danger"
              >
                {isDeleting && (
                  <Loader2
                    className="h-3.5 w-3.5 animate-spin"
                    aria-hidden="true"
                  />
                )}
                {isDeleting ? "Menghapus..." : "Ya, Hapus Akun"}
              </button>
            </div>
          </div>
        )}
      </dialog>
    </div>
  );
}
