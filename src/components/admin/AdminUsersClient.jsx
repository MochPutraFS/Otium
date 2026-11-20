"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Lock,
  Pencil,
  RefreshCw,
  Shield,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
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
 * Workspace CMS Modul 1: Manajemen Pengguna (/admin/users) — Pure Production.
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
  ];

  const statCards = [
    {
      label: "Total Pengguna",
      value: `${stats.total}`,
      unit: "Akun",
      subtitle: "Terdaftar lintas 4 role RBAC",
      icon: Users,
      accentClass: "text-slate-900 bg-[#F4F2EC] border-stone-200",
    },
    {
      label: "Akun Aktif",
      value: `${stats.active}`,
      unit: "Aktif",
      subtitle: `${stats.inactive} akun berstatus Nonaktif`,
      icon: UserCheck,
      accentClass: "text-emerald-800 bg-emerald-50 border-emerald-200/80",
    },
    {
      label: "Masa Kerja < 1 Thn",
      value: `${stats.ineligible}`,
      unit: "Karyawan",
      subtitle: "Belum eligible Cuti Tahunan",
      icon: AlertTriangle,
      accentClass: "text-amber-800 bg-amber-50 border-amber-200/80",
    },
    {
      label: "Akun Diproteksi",
      value: `${stats.protectedCount}`,
      unit: "Akun",
      subtitle: "Role Admin & HRD tidak dapat dihapus",
      icon: Shield,
      accentClass: "text-slate-800 bg-stone-100 border-stone-300/80",
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
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-700" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
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
            CMS Modul 01 · Master Data Pengguna
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Manajemen Pengguna
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-600">
            Kelola akun lintas 4 role, kuota cuti tahunan awal, tanggal
            bergabung, serta proteksi penghapusan akun Admin &amp; HRD secara
            langsung di PostgreSQL.
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
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            Tambah Pengguna
          </button>
        </div>
      </header>

      {/* Ringkasan Statistik Editorial */}
      <section
        aria-label="Ringkasan statistik pengguna"
        className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4"
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

      {/* Tabel Data Pengguna (Responsive Container Query) */}
      <section className="overflow-hidden rounded-xl border border-stone-200 bg-white">
        {filteredUsers.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="Tidak ada pengguna yang cocok"
              description="Coba ubah kata kunci pencarian atau reset filter untuk melihat seluruh akun terdaftar."
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
                Daftar akun pengguna sistem manajemen cuti Otium
              </caption>
              <thead className="bg-[#F4F2EC] text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-700">
                <tr className="border-b border-stone-200">
                  <th scope="col" className="border-b border-stone-200 px-5 py-3.5">
                    Nama &amp; Email
                  </th>
                  <th scope="col" className="border-b border-stone-200 px-4 py-3.5">
                    Username
                  </th>
                  <th scope="col" className="border-b border-stone-200 px-4 py-3.5">
                    Role &amp; Status
                  </th>
                  <th scope="col" className="border-b border-stone-200 px-4 py-3.5">
                    Divisi
                  </th>
                  <th scope="col" className="border-b border-stone-200 px-4 py-3.5">
                    Tgl Bergabung
                  </th>
                  <th scope="col" className="border-b border-stone-200 px-4 py-3.5">
                    Sisa Kuota
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
                {filteredUsers.map((user) => {
                  const isSelf = Number(user.id) === Number(currentAdminId);
                  return (
                    <tr
                      key={user.id}
                      className="transition-colors duration-150 hover:bg-[#F4F2EC]/55"
                    >
                      <th
                        scope="row"
                        className="whitespace-nowrap px-5 py-3.5 font-normal"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-stone-200 bg-[#F4F2EC] text-[11px] font-bold text-slate-800">
                            {user.initials}
                          </div>
                          <div className="min-w-0">
                            <p className="flex items-center gap-1.5 font-semibold text-slate-900">
                              <span className="truncate">{user.fullName}</span>
                              {isSelf && (
                                <span className="rounded border border-stone-300 bg-[#F4F2EC] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-700">
                                  Anda
                                </span>
                              )}
                            </p>
                            <p className="truncate text-xs text-slate-600">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </th>
                      <td
                        data-label="Username"
                        className="whitespace-nowrap px-4 py-3.5 font-mono text-xs text-slate-700"
                      >
                        {user.username}
                      </td>
                      <td
                        data-label="Role & Status"
                        className="whitespace-nowrap px-4 py-3.5"
                      >
                        <div className="flex flex-wrap items-center justify-end gap-1.5 sm:justify-start">
                          <StatusBadge status={user.role} />
                          <StatusBadge
                            status={user.isActive ? "Aktif" : "Nonaktif"}
                          />
                        </div>
                      </td>
                      <td
                        data-label="Divisi"
                        className="whitespace-nowrap px-4 py-3.5 text-xs font-medium text-slate-800"
                      >
                        {user.divisionName ? (
                          <span>
                            {user.divisionName}
                            {user.ledDivisionName && (
                              <span className="ml-1.5 rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">
                                Ketua
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="italic text-slate-600">
                            Belum ada divisi
                          </span>
                        )}
                      </td>
                      <td
                        data-label="Tgl Bergabung"
                        className="whitespace-nowrap px-4 py-3.5"
                      >
                        <div className="text-right sm:text-left">
                          <p className="text-xs font-medium text-slate-900 tabular-nums">
                            {formatIndonesianDate(user.joinDate)}
                          </p>
                          <div className="mt-1 flex items-center justify-end gap-1.5 sm:justify-start">
                            <span className="text-[11px] text-slate-600">
                              {user.tenure?.label}
                            </span>
                            {!user.tenure?.isEligible && (
                              <StatusBadge status="Belum Eligible" />
                            )}
                          </div>
                        </div>
                      </td>
                      <td
                        data-label="Sisa Kuota"
                        className="whitespace-nowrap px-4 py-3.5"
                      >
                        <p className="text-sm font-bold text-slate-900 tabular-nums">
                          {Number(user.remainingLeaveQuota).toFixed(1)}{" "}
                          <span className="text-xs font-normal text-slate-600">
                            / {Number(user.initialLeaveQuota).toFixed(1)} Hr
                          </span>
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(user)}
                            className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 transition-colors duration-150 hover:bg-[#F4F2EC] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
                          >
                            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                            Edit
                          </button>

                          {user.isProtected || isSelf ? (
                            <button
                              type="button"
                              disabled
                              title="Akun Admin dan HRD diproteksi dari penghapusan"
                              aria-label={`Akun ${user.fullName} diproteksi dari penghapusan`}
                              className="inline-flex cursor-not-allowed items-center gap-1 rounded-lg border border-stone-200 bg-stone-100 px-2.5 py-1.5 text-xs font-semibold text-slate-600"
                            >
                              <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                              Diproteksi
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setDeleteError("");
                                setDeleteTarget(user);
                              }}
                              className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-800 transition-colors duration-150 hover:bg-rose-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
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
          <div className="w-full overflow-hidden rounded-xl border border-stone-300 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-rose-200 bg-rose-50/80 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-rose-200 bg-white text-rose-700">
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </div>
                <h2
                  id={deleteTitleId}
                  className="text-sm font-bold text-slate-900"
                >
                  Hapus Akun Pengguna?
                </h2>
              </div>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteTarget(null)}
                aria-label="Tutup dialog"
                className="cursor-pointer rounded-lg p-1 text-slate-600 transition-colors hover:bg-rose-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-3 px-5 py-4 text-xs leading-relaxed text-slate-700">
              {deleteError && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-lg border border-rose-300 bg-rose-50 p-3 text-rose-900"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-700" aria-hidden="true" />
                  <span>{deleteError}</span>
                </div>
              )}

              <p>
                Anda akan menghapus permanen akun{" "}
                <strong className="text-slate-900">
                  {deleteTarget.fullName}
                </strong>{" "}
                (<StatusBadge status={deleteTarget.role} />) dengan email{" "}
                <strong className="text-slate-900">{deleteTarget.email}</strong>.
              </p>

              {(deleteTarget.role === "Ketua Divisi" ||
                deleteTarget.ledDivisionName) && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-950">
                  Pengguna ini adalah <strong>Ketua Divisi</strong>
                  {deleteTarget.ledDivisionName
                    ? ` (${deleteTarget.ledDivisionName})`
                    : ""}
                  . Posisi kepemimpinan divisi akan dikosongkan otomatis dalam
                  transaksi SQL.
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-stone-200 bg-[#F4F2EC] px-5 py-3">
              <button
                type="button"
                autoFocus
                disabled={isDeleting}
                onClick={() => setDeleteTarget(null)}
                className="cursor-pointer rounded-lg border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 transition-colors hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDeleteUser}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-rose-700 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-rose-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDeleting && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
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
