"use client";

import { ArrowUpDown, RotateCcw, Search, SlidersHorizontal, X } from "lucide-react";

/**
 * Bar kontrol pencarian, multi-filter, dan sortir bergaya Swiss Archival
 * untuk keempat modul CMS Master Data Admin.
 */
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
    <div className="panel overflow-hidden">
      <div className="toolbar justify-between">
        {/* Input pencarian */}
        <div className="relative w-full lg:max-w-sm lg:flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--ink-muted)]"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="input !py-1.5 !pl-8 !pr-8 !text-xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange?.("")}
              aria-label="Hapus kata kunci pencarian"
              className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded-[2px] p-1 text-[var(--ink-muted)] transition-colors hover:bg-[var(--alabaster-deep)] hover:text-[var(--ink)]"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Kelompok filter & sortir */}
        <div className="flex flex-wrap items-center gap-2">
          {filters.map((filter) => (
            <div key={filter.key} className="relative flex items-center">
              <label htmlFor={`filter-${filter.key}`} className="visually-hidden">
                {filter.label}
              </label>
              <select
                id={`filter-${filter.key}`}
                value={filter.value}
                onChange={(e) => filter.onChange?.(e.target.value)}
                className="select !w-auto cursor-pointer !py-1.5 !text-xs"
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
                className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-[var(--ink-muted)]"
                aria-hidden="true"
              />
              <label htmlFor="table-sort-select" className="visually-hidden">
                Urutkan data
              </label>
              <select
                id="table-sort-select"
                value={currentSort}
                onChange={(e) => onSortChange?.(e.target.value)}
                className="select !w-auto cursor-pointer !py-1.5 !pl-8 !pr-3 !text-xs"
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
              className="btn btn-sm !min-h-[30px]"
            >
              <RotateCcw className="h-3 w-3" aria-hidden="true" />
              <span>Reset Filter</span>
            </button>
          )}

          {rightActions}
        </div>
      </div>

      {typeof totalFiltered === "number" && typeof totalAll === "number" && (
        <div className="flex flex-wrap items-center justify-between gap-2 bg-[var(--paper-pure)] px-5 py-2.5 text-xs text-[var(--ink-muted)]">
          <span className="mono inline-flex items-center gap-1.5 text-[11px]">
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
            Menampilkan{" "}
            <strong className="font-semibold text-[var(--ink)]">
              {totalFiltered}
            </strong>{" "}
            dari{" "}
            <strong className="font-semibold text-[var(--ink)]">
              {totalAll}
            </strong>{" "}
            data
          </span>
          {hasActiveFilters && (
            <span className="tag tag-approved !py-0 !text-[10px]">
              Filter aktif diterapkan
            </span>
          )}
        </div>
      )}
    </div>
  );
}
