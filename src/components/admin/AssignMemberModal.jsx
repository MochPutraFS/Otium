"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { AlertCircle, Check, Loader2, Search, UserPlus, X } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import EmptyState from "@/components/ui/EmptyState";

/**
 * Modal Assign Anggota Divisi (CMS Modul 3) — Native <dialog className="otium-modal">.
 * Menggunakan tab `.otium-tab` (`role="tablist"`):
 * - Tab 1: Karyawan aktif tanpa divisi (division_id = NULL)
 * - Tab 2: Pindahkan karyawan aktif dari divisi lain
 */
export default function AssignMemberModal({
  isOpen,
  targetDivision,
  users = [],
  divisions = [],
  isSubmitting = false,
  errorMessage = "",
  onClose,
  onAssign,
}) {
  const dialogRef = useRef(null);
  const titleId = useId();
  const searchId = useId();

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

  // Sinkronisasi native <dialog>
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && targetDivision) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.close();
      dialog.returnValue = "";
    }
  }, [isOpen, targetDivision]);

  // Event cancel/close & Safari light-dismiss fallback
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !isOpen || !targetDivision) return undefined;

    function handleCancel(event) {
      if (isSubmitting) {
        event.preventDefault();
      }
    }

    function handleClose() {
      dialog.returnValue = "";
      if (!isSubmitting) {
        onClose?.();
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
        if (!isSubmitting && pressedOutside && isOutside(e)) {
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
  }, [isOpen, targetDivision, isSubmitting, onClose]);

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

  function toggleUser(userId) {
    if (isSubmitting) return;
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  }

  function handleConfirm() {
    if (selectedUserIds.length === 0 || isSubmitting) return;
    onAssign?.(selectedUserIds);
  }

  return (
    <dialog
      ref={dialogRef}
      closedby={isSubmitting ? "none" : "any"}
      aria-labelledby={titleId}
      className="otium-modal w-full max-w-xl"
    >
      {targetDivision && (
        <div className="flex max-h-[calc(100dvh-2rem)] w-full flex-col overflow-hidden rounded-xl border border-stone-300 bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 border-b border-stone-200 bg-[#F4F2EC] px-5 py-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-stone-300 bg-white text-slate-900">
                <UserPlus className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                  Penempatan Anggota · CMS Modul 03
                </p>
                <h2
                  id={titleId}
                  className="text-base font-bold tracking-tight text-slate-900"
                >
                  Assign Anggota ke {targetDivision.name}
                </h2>
                <p className="mt-0.5 text-xs text-slate-600">
                  Pilih satu atau lebih karyawan aktif untuk ditempatkan secara
                  atomik ke divisi ini.
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => onClose?.()}
              aria-label="Tutup modal assign anggota"
              className="cursor-pointer rounded-lg p-1.5 text-slate-600 transition-colors duration-150 hover:bg-stone-200/80 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {/* Tab Scope (.otium-tab) + Pencarian */}
          <div className="space-y-3 border-b border-stone-200 px-5 pt-3 pb-3.5">
            {errorMessage && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2.5 text-xs font-medium text-rose-950"
              >
                <AlertCircle
                  className="mt-0.5 h-4 w-4 shrink-0 text-rose-700"
                  aria-hidden="true"
                />
                <span>{errorMessage}</span>
              </div>
            )}

            <div
              role="tablist"
              aria-label="Sumber kandidat karyawan"
              className="flex flex-wrap gap-5 border-b border-stone-200"
            >
              <button
                type="button"
                role="tab"
                aria-selected={scopeTab === "unassigned"}
                onClick={() => setScopeTab("unassigned")}
                className={`otium-tab cursor-pointer pb-2.5 text-xs font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 ${
                  scopeTab === "unassigned"
                    ? "text-slate-900"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Belum Punya Divisi{" "}
                <span className="ml-1 rounded bg-[#F4F2EC] px-1.5 py-0.5 text-[11px] font-bold text-slate-800 tabular-nums">
                  {unassignedCount}
                </span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={scopeTab === "transfer"}
                onClick={() => setScopeTab("transfer")}
                className={`otium-tab cursor-pointer pb-2.5 text-xs font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 ${
                  scopeTab === "transfer"
                    ? "text-slate-900"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Pindahkan dari Divisi Lain{" "}
                <span className="ml-1 rounded bg-[#F4F2EC] px-1.5 py-0.5 text-[11px] font-bold text-slate-800 tabular-nums">
                  {transferCount}
                </span>
              </button>
            </div>

            <div className="relative">
              <label htmlFor={searchId} className="sr-only">
                Cari nama atau email karyawan
              </label>
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                aria-hidden="true"
              />
              <input
                id={searchId}
                type="search"
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama, username, atau email karyawan..."
                className="w-full rounded-lg border border-stone-300 bg-[#F4F2EC]/55 py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-500 transition-colors duration-150 focus-visible:border-slate-900 focus-visible:bg-white focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-slate-900"
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
                    ? "Semua karyawan aktif sudah memiliki divisi. Beralih ke tab Pindahkan dari Divisi Lain jika ingin memindahkan anggota."
                    : "Ubah kata kunci pencarian untuk melihat karyawan dari divisi lain."
                }
              />
            ) : (
              <ul className="space-y-2">
                {candidates.map((user) => {
                  const isSelected = selectedUserIds.includes(user.id);
                  const prevDivisionName = user.divisionId
                    ? divisionNameMap.get(user.divisionId) || user.divisionName
                    : null;

                  return (
                    <li key={user.id}>
                      <button
                        type="button"
                        aria-pressed={isSelected}
                        disabled={isSubmitting}
                        onClick={() => toggleUser(user.id)}
                        className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border p-3 text-left transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:opacity-60 ${
                          isSelected
                            ? "border-slate-900 bg-[#F4F2EC] ring-1 ring-slate-900/20"
                            : "border-stone-200 bg-white hover:border-stone-300 hover:bg-[#F4F2EC]/45"
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                              isSelected
                                ? "border-slate-900 bg-slate-900 text-white"
                                : "border-stone-400 bg-white"
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
                            <p className="truncate text-xs text-slate-600">
                              {user.email} · @{user.username}
                            </p>
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <StatusBadge status={user.role} />
                          {prevDivisionName ? (
                            <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-900">
                              Asal: {prevDivisionName}
                            </span>
                          ) : (
                            <span className="text-[11px] font-medium text-slate-600">
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
          <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-stone-200 bg-[#F4F2EC]/70 px-5 py-3.5">
            <span className="text-xs font-medium text-slate-700 tabular-nums">
              <strong className="text-slate-900">
                {selectedUserIds.length}
              </strong>{" "}
              karyawan dipilih
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => onClose?.()}
                className="cursor-pointer rounded-lg border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 transition-colors duration-150 hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={selectedUserIds.length === 0 || isSubmitting}
                onClick={handleConfirm}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-colors duration-150 hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {isSubmitting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {isSubmitting
                  ? "Menempatkan..."
                  : `Assign ke Divisi (${selectedUserIds.length})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </dialog>
  );
}
