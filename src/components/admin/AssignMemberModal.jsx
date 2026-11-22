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
        <div className="flex max-h-[calc(100dvh-2rem)] w-full flex-col overflow-hidden rounded-[6px] border border-[var(--ink)] bg-[var(--paper-pure)] shadow-[var(--shadow-lg)]">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 border-b border-[var(--rule)] bg-[var(--alabaster)] px-5 py-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[4px] border border-[var(--rule-strong)] bg-[var(--paper-pure)] text-[var(--spruce)]">
                <UserPlus className="h-4 w-4" aria-hidden="true" />
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--ink-muted)]">
                  PENEMPATAN ANGGOTA · CMS MODUL 03
                </p>
                <h2
                  id={titleId}
                  className="font-serif text-[20px] font-semibold leading-snug text-[var(--ink)]"
                >
                  Assign Anggota ke {targetDivision.name}
                </h2>
                <p className="mt-0.5 text-[12px] text-[var(--ink-soft)]">
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
              className="btn-icon h-7 w-7 shrink-0"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {/* Tab Scope (.seg-group) + Pencarian */}
          <div className="space-y-3 border-b border-[var(--rule)] px-5 py-3.5">
            {errorMessage && (
              <div role="alert" className="notice notice-danger">
                <AlertCircle
                  className="mt-0.5 h-4 w-4 shrink-0"
                  aria-hidden="true"
                />
                <span>{errorMessage}</span>
              </div>
            )}

            <div
              role="tablist"
              aria-label="Sumber kandidat karyawan"
              className="seg-group w-fit"
            >
              <button
                type="button"
                role="tab"
                aria-selected={scopeTab === "unassigned"}
                aria-pressed={scopeTab === "unassigned"}
                onClick={() => setScopeTab("unassigned")}
                className="seg-btn"
              >
                Belum Punya Divisi{" "}
                <span className="ml-1 font-mono text-[11px] tabular-nums opacity-80">
                  ({unassignedCount})
                </span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={scopeTab === "transfer"}
                aria-pressed={scopeTab === "transfer"}
                onClick={() => setScopeTab("transfer")}
                className="seg-btn"
              >
                Pindahkan dari Divisi Lain{" "}
                <span className="ml-1 font-mono text-[11px] tabular-nums opacity-80">
                  ({transferCount})
                </span>
              </button>
            </div>

            <div className="relative">
              <label htmlFor={searchId} className="sr-only">
                Cari nama atau email karyawan
              </label>
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--ink-muted)]"
                aria-hidden="true"
              />
              <input
                id={searchId}
                type="search"
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama, username, atau email karyawan..."
                className="input w-full pl-9"
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
                        className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-[4px] border p-3 text-left transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--spruce)] disabled:cursor-not-allowed disabled:opacity-60 ${
                          isSelected
                            ? "border-[var(--spruce)] bg-[var(--spruce-tint)]"
                            : "border-[var(--rule)] bg-[var(--paper-pure)] hover:border-[var(--rule-strong)] hover:bg-[var(--alabaster)]"
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border ${
                              isSelected
                                ? "border-[var(--spruce)] bg-[var(--spruce)] text-white"
                                : "border-[var(--rule-strong)] bg-[var(--paper-pure)]"
                            }`}
                          >
                            {isSelected && (
                              <Check className="h-3 w-3" aria-hidden="true" />
                            )}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-semibold text-[var(--ink)]">
                              {user.fullName}
                            </p>
                            <p className="truncate font-mono text-[11px] text-[var(--ink-muted)]">
                              {user.email} · @{user.username}
                            </p>
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <StatusBadge status={user.role} />
                          {prevDivisionName ? (
                            <span className="tag tag-pending text-[10px]">
                              Asal: {prevDivisionName}
                            </span>
                          ) : (
                            <span className="font-mono text-[10.5px] text-[var(--ink-muted)]">
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
          <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-[var(--rule)] bg-[var(--alabaster)] px-5 py-3.5">
            <span className="font-mono text-[12px] tabular-nums text-[var(--ink-soft)]">
              <strong className="text-[var(--ink)]">
                {selectedUserIds.length}
              </strong>{" "}
              karyawan dipilih
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => onClose?.()}
                className="btn btn-sm"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={selectedUserIds.length === 0 || isSubmitting}
                onClick={handleConfirm}
                className="btn btn-sm btn-primary"
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
