"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Search, UserPlus, X } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import EmptyState from "@/components/ui/EmptyState";

// Modal Assign Anggota Divisi (CMS Modul 3)
// Default menampilkan karyawan aktif tanpa divisi (division_id = NULL),
// dengan tab opsional untuk memindahkan karyawan dari divisi lain.
export default function AssignMemberModal({
  isOpen,
  targetDivision,
  users = [],
  divisions = [],
  onClose,
  onAssign,
}) {
  const [scopeTab, setScopeTab] = useState("unassigned");
  const [search, setSearch] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState([]);

  useEffect(() => {
    if (isOpen) {
      setScopeTab("unassigned");
      setSearch("");
      setSelectedUserIds([]);
    }
  }, [isOpen, targetDivision?.id]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(event) {
      if (event.key === "Escape") onClose?.();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const divisionNameMap = useMemo(() => {
    const map = new Map();
    divisions.forEach((d) => map.set(d.id, d.name));
    return map;
  }, [divisions]);

  const candidates = useMemo(() => {
    if (!targetDivision) return [];
    const q = search.trim().toLowerCase();

    return users.filter((u) => {
      if (u.role !== "Karyawan" || !u.isActive) return false;
      if (u.divisionId === targetDivision.id) return false;

      if (scopeTab === "unassigned" && u.divisionId !== null) return false;
      if (scopeTab === "transfer" && u.divisionId === null) return false;

      if (q) {
        const divName = u.divisionId ? divisionNameMap.get(u.divisionId) || "" : "";
        const hay = `${u.fullName} ${u.email} ${u.username} ${divName}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [users, targetDivision, scopeTab, search, divisionNameMap]);

  const unassignedCount = useMemo(
    () =>
      users.filter(
        (u) => u.role === "Karyawan" && u.isActive && u.divisionId === null
      ).length,
    [users]
  );

  const transferCount = useMemo(
    () =>
      users.filter(
        (u) =>
          u.role === "Karyawan" &&
          u.isActive &&
          u.divisionId !== null &&
          u.divisionId !== targetDivision?.id
      ).length,
    [users, targetDivision]
  );

  if (!isOpen || !targetDivision) return null;

  function toggleUser(userId) {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  }

  function handleConfirm() {
    if (selectedUserIds.length === 0) return;
    onAssign?.(selectedUserIds);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="assign-member-modal-title"
    >
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 bg-slate-50/70 px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-200">
              <UserPlus className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h3
                id="assign-member-modal-title"
                className="text-base font-bold text-slate-900"
              >
                Assign Anggota ke {targetDivision.name}
              </h3>
              <p className="mt-0.5 text-xs text-slate-600">
                Pilih satu atau lebih karyawan aktif untuk ditempatkan pada
                divisi ini.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal"
            className="cursor-pointer rounded-lg p-1.5 text-slate-400 transition-colors duration-200 hover:bg-slate-200/70 hover:text-slate-700"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Tab Scope + Pencarian */}
        <div className="space-y-3 border-b border-slate-200 px-5 py-3.5">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setScopeTab("unassigned")}
              className={`cursor-pointer rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors duration-200 ${
                scopeTab === "unassigned"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              Belum Punya Divisi ({unassignedCount})
            </button>
            <button
              type="button"
              onClick={() => setScopeTab("transfer")}
              className={`cursor-pointer rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors duration-200 ${
                scopeTab === "transfer"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              Pindahkan dari Divisi Lain ({transferCount})
            </button>
          </div>

          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama atau email karyawan..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        {/* Daftar Kandidat */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {candidates.length === 0 ? (
            <EmptyState
              title={
                scopeTab === "unassigned"
                  ? "Tidak ada karyawan tanpa divisi"
                  : "Tidak ada karyawan yang cocok"
              }
              description={
                scopeTab === "unassigned"
                  ? "Semua karyawan aktif sudah memiliki divisi. Anda dapat beralih ke tab Pindahkan dari Divisi Lain."
                  : "Ubah kata kunci pencarian untuk melihat karyawan dari divisi lain."
              }
            />
          ) : (
            <ul className="space-y-2">
              {candidates.map((user) => {
                const isSelected = selectedUserIds.includes(user.id);
                const prevDivisionName = user.divisionId
                  ? divisionNameMap.get(user.divisionId)
                  : null;

                return (
                  <li key={user.id}>
                    <button
                      type="button"
                      onClick={() => toggleUser(user.id)}
                      className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border p-3 text-left transition-colors duration-150 ${
                        isSelected
                          ? "border-blue-500 bg-blue-50/70 ring-1 ring-blue-500/30"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                            isSelected
                              ? "border-blue-600 bg-blue-600 text-white"
                              : "border-slate-300 bg-white"
                          }`}
                        >
                          {isSelected && (
                            <Check className="h-3.5 w-3.5" aria-hidden="true" />
                          )}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {user.fullName}
                          </p>
                          <p className="truncate text-xs text-slate-500">
                            {user.email}
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <StatusBadge status={user.role} />
                        {prevDivisionName ? (
                          <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                            Asal: {prevDivisionName}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-500">
                            Belum ada divisi
                          </span>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2.5 border-t border-slate-200 bg-slate-50/70 px-5 py-3.5">
          <span className="text-xs font-medium text-slate-600">
            <strong className="text-slate-900">{selectedUserIds.length}</strong>{" "}
            karyawan dipilih
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-colors duration-200 hover:bg-slate-100"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={selectedUserIds.length === 0}
              onClick={handleConfirm}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition-colors duration-200 hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
              Assign ke Divisi ({selectedUserIds.length})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
