"use client";

import { CheckCheck } from "lucide-react";

// Sticky bar aksi Multi-Approve Checkbox (Bulk Approval) khusus Portal HRD
export default function HrdBulkApprovalBar({
  totalVisibleCount = 0,
  selectedCount = 0,
  allSelected = false,
  bulkNotes = "",
  onToggleSelectAll,
  onBulkNotesChange,
  onBulkApprove,
}) {
  if (totalVisibleCount === 0) return null;

  return (
    <div className="sticky top-16 z-20 flex flex-col gap-3 border-b border-slate-200 bg-slate-50/95 px-4 py-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
      <label className="flex cursor-pointer items-center gap-2.5 text-xs font-semibold text-slate-700">
        <input
          type="checkbox"
          checked={allSelected}
          onChange={(event) => onToggleSelectAll(event.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
        />
        <span>
          Pilih Semua Antrean{" "}
          <span className="font-normal text-slate-500">
            ({selectedCount} dari {totalVisibleCount} terpilih)
          </span>
        </span>
      </label>

      <div className="flex flex-1 flex-col gap-2 sm:max-w-lg sm:flex-row sm:items-center sm:justify-end">
        <input
          type="text"
          value={bulkNotes}
          onChange={(event) => onBulkNotesChange(event.target.value)}
          placeholder="Catatan massal HRD (opsional)..."
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 sm:w-64"
        />
        <button
          type="button"
          onClick={onBulkApprove}
          disabled={selectedCount === 0}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          <CheckCheck className="h-4 w-4" aria-hidden="true" />
          <span>Approve Selected ({selectedCount})</span>
        </button>
      </div>
    </div>
  );
}
