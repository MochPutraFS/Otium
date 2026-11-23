"use client";

import { useEffect, useId, useRef } from "react";
import { CheckCheck } from "lucide-react";

/**
 * Kontrol Multi-Approve Checkbox (Bulk Approval) khusus Portal HRD bergaya Swiss Archival:
 * 1. Toolbar Pilih Semua (indeterminate checkbox) + input catatan massal di atas daftar
 * 2. Floating Bulk Action Bar (.bulk-floating-bar) di bagian bawah saat selectedCount > 0
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
    <>
      {/* Sticky Select-All Bar di dalam Panel */}
      <div
        role="region"
        aria-label="Kontrol pilih semua Multi-Approve HRD"
        className="flex flex-col gap-3 border-b border-[var(--rule)] bg-[var(--paper)] px-5 py-2.5 sm:flex-row sm:items-center sm:justify-between"
      >
        <label
          htmlFor={selectAllId}
          className="otium-checkbox-label inline-flex min-h-[38px] cursor-pointer select-none items-center gap-2.5 text-xs font-semibold text-[var(--ink)]"
        >
          <input
            ref={selectAllRef}
            id={selectAllId}
            type="checkbox"
            checked={allSelected}
            disabled={isSubmitting}
            onChange={(event) => onToggleSelectAll?.(event.target.checked)}
            className="otium-checkbox h-4 w-4 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          />
          <span>
            Pilih Semua Antrean{" "}
            <span className="mono font-normal text-[var(--ink-muted)]">
              ({selectedCount}/{totalVisibleCount} terpilih)
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
            className="input !py-1.5 !text-xs sm:!w-64"
          />
          <button
            type="button"
            onClick={() => onRequestBulkApprove?.()}
            disabled={selectedCount === 0 || isSubmitting}
            className="btn btn-primary btn-sm shrink-0"
          >
            <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="mono">Setujui Terpilih ({selectedCount})</span>
          </button>
        </div>
      </div>

      {/* Floating Bulk Action Bar saat ada item terpilih */}
      {selectedCount > 0 && (
        <div
          role="region"
          aria-label="Aksi massal persetujuan HRD"
          className="bulk-floating-bar"
        >
          <div className="flex items-center gap-2.5">
            <span className="mono border border-[var(--paper-pure)]/30 bg-[var(--spruce-btn)] px-2 py-0.5 text-xs font-semibold text-[var(--spruce-btn-ink)]">
              {selectedCount}
            </span>
            <span className="text-xs font-medium">
              lembar edaran dipilih untuk Multi-Approve
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => onToggleSelectAll?.(false)}
              className="btn btn-sm !border-[var(--paper-pure)]/35 !bg-transparent !text-[var(--paper-pure)] hover:!border-[var(--paper-pure)]"
            >
              Batal Pilih
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => onRequestBulkApprove?.()}
              className="btn btn-sm !border-[var(--paper-pure)] !bg-[var(--paper-pure)] !font-semibold !text-[var(--spruce)] hover:!bg-[var(--alabaster)]"
            >
              <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Setujui Terpilih ({selectedCount})</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
