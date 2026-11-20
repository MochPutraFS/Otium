"use client";

import { ArrowUpDown, RotateCcw, Search, SlidersHorizontal, X } from "lucide-react";

// Bar kontrol pencarian, multi-filter, dan sortir untuk keempat modul CMS Admin
export default function DataTableToolbar({
  searchQuery = "",
  onSearchChange,
  searchPlaceholder = "Cari data...",
  filters = [],
  sortOptions = [],
  currentSort = "",
  onSortChange,
  onReset,
  hasActiveFilters = false,
  totalFiltered,
  totalAll,
  rightActions = null,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* Input pencarian */}
        <div className="relative flex-1 lg:max-w-sm">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-10 pr-9 text-sm text-slate-900 placeholder:text-slate-400 transition-colors duration-200 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange?.("")}
              aria-label="Hapus kata kunci pencarian"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer rounded-lg p-1 text-slate-400 transition-colors duration-200 hover:bg-slate-200/70 hover:text-slate-700"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Kelompok filter & sortir */}
        <div className="flex flex-wrap items-center gap-2">
          {filters.map((filter) => (
            <div key={filter.key} className="relative flex items-center">
              <label htmlFor={`filter-${filter.key}`} className="sr-only">
                {filter.label}
              </label>
              <select
                id={`filter-${filter.key}`}
                value={filter.value}
                onChange={(e) => filter.onChange?.(e.target.value)}
                className="cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-xs transition-colors duration-200 hover:border-slate-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {filter.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          ))}

          {sortOptions.length > 0 && (
            <div className="relative flex items-center">
              <ArrowUpDown
                className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-slate-400"
                aria-hidden="true"
              />
              <label htmlFor="table-sort-select" className="sr-only">
                Urutkan data
              </label>
              <select
                id="table-sort-select"
                value={currentSort}
                onChange={(e) => onSortChange?.(e.target.value)}
                className="cursor-pointer rounded-xl border border-slate-200 bg-white py-2 pl-8 pr-3 text-xs font-medium text-slate-700 shadow-xs transition-colors duration-200 hover:border-slate-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {sortOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {hasActiveFilters && onReset && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-900"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Reset Filter
            </button>
          )}

          {rightActions}
        </div>
      </div>

      {typeof totalFiltered === "number" && typeof totalAll === "number" && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2.5 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <SlidersHorizontal
              className="h-3.5 w-3.5 text-slate-400"
              aria-hidden="true"
            />
            Menampilkan{" "}
            <strong className="font-semibold text-slate-800">
              {totalFiltered}
            </strong>{" "}
            dari{" "}
            <strong className="font-semibold text-slate-800">{totalAll}</strong>{" "}
            data
          </span>
          {hasActiveFilters && (
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-medium text-blue-700">
              Filter aktif diterapkan
            </span>
          )}
        </div>
      )}
    </div>
  );
}
