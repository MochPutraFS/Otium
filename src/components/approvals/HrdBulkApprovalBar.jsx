"use client";

import { useEffect, useId, useRef } from "react";
import { CheckCheck } from "lucide-react";

/**
 * Sticky bar aksi Multi-Approve Checkbox (Bulk Approval) khusus Portal HRD.
 * - Bahasa desain Warm Alabaster — Swiss Editorial Minimalism (`border-stone-200`, `slate-900` ink).
 * - Menyinkronkan properti DOM `checkbox.indeterminate` melalui `useRef` + `useEffect`
 *   saat hanya sebagian antrean yang dicentang (`modern-web-guidance: checkbox`).
 * - Hit target `<label>` minimal `44px` (`min-h-[44px]`) dengan `.otium-checkbox` & `focus-visible`.
 */
export default function HrdBulkApprovalBar({
  totalVisibleCount = 0,
  selectedCount = 0,
  allSelected = false,
  bulkNotes = "",
  isSubmitting = false,
  onToggleSelectAll,
  onBulkNotesChange,
  onRequestBulkApprove,
}) {
  const selectAllRef = useRef(null);
  const selectAllId = useId();
  const bulkNotesId = useId();

  const isIndeterminate = selectedCount > 0 && !allSelected;

  useEffect(() => {
    const el = selectAllRef.current;
    if (!el) return;
    el.indeterminate = isIndeterminate;
  }, [isIndeterminate]);

  if (totalVisibleCount === 0) return null;

  return (
    <div
      role="region"
      aria-label="Kontrol Multi-Approve HRD"
      className="sticky top-16 z-20 flex flex-col gap-3 border-b border-stone-200 bg-[#F4F2EC]/95 px-4 py-2.5 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between"
    >
      <label
        htmlFor={selectAllId}
        className="otium-checkbox-label inline-flex min-h-[44px] cursor-pointer items-center gap-2.5 text-xs font-semibold text-slate-800 select-none"
      >
        <input
          ref={selectAllRef}
          id={selectAllId}
          type="checkbox"
          checked={allSelected}
          disabled={isSubmitting}
          onChange={(event) => onToggleSelectAll?.(event.target.checked)}
          className="otium-checkbox h-4 w-4 cursor-pointer rounded border-stone-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <span>
          Pilih Semua Antrean{" "}
          <span className="font-normal text-slate-600 tabular-nums">
            ({selectedCount} dari {totalVisibleCount} terpilih)
          </span>
        </span>
      </label>

      <div className="flex flex-1 flex-col gap-2 sm:max-w-xl sm:flex-row sm:items-center sm:justify-end">
        <label htmlFor={bulkNotesId} className="visually-hidden">
          Catatan massal persetujuan HRD (opsional)
        </label>
        <input
          id={bulkNotesId}
          type="text"
          maxLength={500}
          value={bulkNotes}
          disabled={isSubmitting}
          onChange={(event) => onBulkNotesChange?.(event.target.value)}
          placeholder="Catatan massal HRD (opsional)..."
          className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 transition-colors focus-visible:border-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 disabled:bg-stone-100 sm:w-64"
        />
        <button
          type="button"
          onClick={() => onRequestBulkApprove?.()}
          disabled={selectedCount === 0 || isSubmitting}
          className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white transition-colors duration-150 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-600"
        >
          <CheckCheck className="h-4 w-4" aria-hidden="true" />
          <span className="tabular-nums">
            Approve Selected ({selectedCount})
          </span>
        </button>
      </div>
    </div>
  );
}
