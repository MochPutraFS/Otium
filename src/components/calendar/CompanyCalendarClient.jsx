"use client";

import { useId, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Lock,
  RefreshCw,
  Search,
  ShieldAlert,
} from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import EmptyState from "@/components/ui/EmptyState";
import { formatIndonesianDate } from "@/lib/date-utils";

const MONTH_NAMES_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const DOW_LABELS = [
  { full: "Sen", short: "Sn" },
  { full: "Sel", short: "Sl" },
  { full: "Rab", short: "Rb" },
  { full: "Kam", short: "Km" },
  { full: "Jum", short: "Jm" },
  { full: "Sab", short: "Sb" },
  { full: "Min", short: "Mg" },
];

function toIsoDate(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Halaman Transparansi Kalender & Direktori Cuti Lintas Role (/calendar — Fase 2 8.2).
 * Seluruh data sensitif (surat dokter, alasan pribadi, kontak darurat) disembunyikan dari server.
 */
export default function CompanyCalendarClient({
  initialData,
  currentUserId,
  currentUserDivisionId = null,
}) {
  const tableCaptionId = useId();

  const [calendarData, setCalendarData] = useState(initialData);
  const [divisionFilter, setDivisionFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDayIso, setSelectedDayIso] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");

  const {
    todayIso,
    year,
    month,
    divisions = [],
    holidays = [],
    blackoutPeriods = [],
    leaves = [],
  } = calendarData;

  async function loadCalendar(nextYear, nextMonth, nextDiv, nextStatus) {
    setIsLoading(true);
    setFetchError("");
    try {
      const qs = new URLSearchParams({
        year: String(nextYear),
        month: String(nextMonth),
        divisionId: String(nextDiv || "ALL"),
        status: String(nextStatus || "ALL"),
      });
      const res = await fetch(`/api/calendar?${qs.toString()}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setFetchError(json.error || "Gagal memuat kalender cuti perusahaan.");
        return;
      }
      setCalendarData(json);
      setSelectedDayIso("");
    } catch {
      setFetchError("Gangguan koneksi saat memuat kalender cuti perusahaan.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleShiftMonth(delta) {
    const dt = new Date(year, month - 1 + delta, 1);
    loadCalendar(
      dt.getFullYear(),
      dt.getMonth() + 1,
      divisionFilter,
      statusFilter
    );
  }

  function handleDivisionChange(nextDiv) {
    setDivisionFilter(nextDiv);
    loadCalendar(year, month, nextDiv, statusFilter);
  }

  function handleStatusChange(nextStatus) {
    setStatusFilter(nextStatus);
    loadCalendar(year, month, divisionFilter, nextStatus);
  }

  const holidayMap = useMemo(() => {
    const map = new Map();
    holidays.forEach((h) => map.set(h.holidayDate, h));
    return map;
  }, [holidays]);

  const filteredLeaves = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return leaves.filter((item) => {
      if (
        selectedDayIso &&
        !(item.startDate <= selectedDayIso && item.endDate >= selectedDayIso)
      ) {
        return false;
      }
      if (q) {
        const hay =
          `${item.employeeName} ${item.divisionName} ${item.leaveTypeName} ${item.handoverName}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [leaves, selectedDayIso, searchQuery]);

  const calendarCells = useMemo(() => {
    const firstDowJs = new Date(year, month - 1, 1).getDay();
    const leadingBlanks = (firstDowJs + 6) % 7;
    const daysInMonth = new Date(year, month, 0).getDate();

    const cells = [];
    for (let i = 0; i < leadingBlanks; i += 1) {
      cells.push({ type: "blank", key: `b-${i}` });
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      const iso = toIsoDate(year, month, day);
      const dowJs = new Date(year, month - 1, day).getDay();
      const isWeekend = dowJs === 0 || dowJs === 6;
      const holiday = holidayMap.get(iso) || null;
      const blackout =
        blackoutPeriods.find((bp) => bp.startDate <= iso && bp.endDate >= iso) ||
        null;
      const dayLeaves = leaves.filter(
        (lv) => lv.startDate <= iso && lv.endDate >= iso
      );

      cells.push({
        type: "day",
        key: iso,
        day,
        iso,
        isWeekend,
        isToday: iso === todayIso,
        holiday,
        blackout,
        dayLeaves,
      });
    }
    return cells;
  }, [year, month, holidayMap, blackoutPeriods, leaves, todayIso]);

  const selectedDayInfo = useMemo(() => {
    if (!selectedDayIso) return null;
    return (
      calendarCells.find(
        (c) => c.type === "day" && c.iso === selectedDayIso
      ) || null
    );
  }, [calendarCells, selectedDayIso]);

  const stats = useMemo(() => {
    const total = leaves.length;
    const approved = leaves.filter((l) => l.status === "Approved").length;
    const inProgress = total - approved;
    return {
      total,
      approved,
      inProgress,
      holidaysAndBlackouts: holidays.length + blackoutPeriods.length,
    };
  }, [leaves, holidays, blackoutPeriods]);

  return (
    <div className="space-y-6">
      {/* Header Editorial */}
      <header className="flex flex-col gap-4 border-b border-[var(--rule-strong)] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[var(--ink-muted)]">
            FASE 2 · TRANSPARANSI JADWAL LINTAS ROLE
          </p>
          <h1 className="mt-1 font-serif text-[28px] font-semibold leading-tight tracking-[-0.015em] text-[var(--ink)] sm:text-[32px]">
            Kalender &amp; Direktori Cuti Perusahaan
          </h1>
          <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-[var(--ink-soft)]">
            Pantau jadwal cuti rekan kerja lintas divisi, hari libur nasional,
            cuti bersama, dan periode blackout untuk koordinasi tim yang lebih
            lancar.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {currentUserDivisionId && (
            <button
              type="button"
              onClick={() =>
                handleDivisionChange(
                  String(divisionFilter) === String(currentUserDivisionId)
                    ? "ALL"
                    : String(currentUserDivisionId)
                )
              }
              className={`btn btn-sm ${
                String(divisionFilter) === String(currentUserDivisionId)
                  ? "btn-primary"
                  : ""
              }`}
            >
              {String(divisionFilter) === String(currentUserDivisionId)
                ? "Menampilkan Divisi Saya"
                : "Filter Divisi Saya"}
            </button>
          )}
          <button
            type="button"
            disabled={isLoading}
            onClick={() =>
              loadCalendar(year, month, divisionFilter, statusFilter)
            }
            className="btn btn-sm"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            Segarkan
          </button>
        </div>
      </header>

      {/* Notice Privasi */}
      <div className="notice notice-info">
        <Lock className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>
          <strong>Perlindungan Privasi Aktif:</strong> Dokumen sensitif (seperti
          surat keterangan dokter), alasan cuti pribadi, alamat, dan nomor
          darurat karyawan lain disembunyikan sepenuhnya dari direktori ini.
        </span>
      </div>

      {fetchError && (
        <div role="alert" className="notice notice-danger">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{fetchError}</span>
        </div>
      )}

      {/* Metric Strip */}
      <section aria-label="Ringkasan jadwal cuti bulan ini" className="metric-strip">
        <div className="metric-cell">
          <p className="metric-label">Jadwal Bulan Ini</p>
          <p className="metric-val tabular-nums">{stats.total}</p>
          <p className="metric-note">
            {MONTH_NAMES_ID[month - 1]} {year}
          </p>
        </div>
        <div className="metric-cell">
          <p className="metric-label">Disetujui Final</p>
          <p className="metric-val tabular-nums text-[var(--spruce)]">
            {stats.approved}
          </p>
          <p className="metric-note">Berstatus Approved oleh HRD</p>
        </div>
        <div className="metric-cell">
          <p className="metric-label">Menunggu Persetujuan</p>
          <p className="metric-val tabular-nums text-[var(--ochre)]">
            {stats.inProgress}
          </p>
          <p className="metric-note">Pending &amp; Approved by Leader</p>
        </div>
        <div className="metric-cell">
          <p className="metric-label">Libur &amp; Blackout</p>
          <p className="metric-val tabular-nums text-[var(--slate-blue)]">
            {stats.holidaysAndBlackouts}
          </p>
          <p className="metric-note">
            {holidays.length} hari libur &bull; {blackoutPeriods.length} blackout
          </p>
        </div>
      </section>

      {/* Panel Kalender Bulanan */}
      <section className="panel overflow-hidden">
        <div className="panel-head">
          <div className="flex items-center gap-2.5">
            <CalendarRange
              className="h-4 w-4 text-[var(--spruce)]"
              aria-hidden="true"
            />
            <div>
              <span className="panel-eyebrow !mb-0">Tampilan Bulanan</span>
              <h2 className="panel-title">
                {MONTH_NAMES_ID[month - 1]} {year}
              </h2>
            </div>
            {isLoading && (
              <Loader2
                className="h-4 w-4 animate-spin text-[var(--ink-muted)]"
                aria-label="Memuat kalender"
              />
            )}
          </div>

          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <select
              aria-label="Filter divisi"
              value={divisionFilter}
              onChange={(e) => handleDivisionChange(e.target.value)}
              className="select min-w-[130px] flex-1 !py-1.5 text-xs sm:w-auto sm:flex-none"
            >
              <option value="ALL">Semua Divisi</option>
              {divisions.map((d) => (
                <option key={d.id} value={String(d.id)}>
                  {d.name}
                </option>
              ))}
            </select>

            <select
              aria-label="Filter status cuti"
              value={statusFilter}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="select min-w-[135px] flex-1 !py-1.5 text-xs sm:w-auto sm:flex-none"
            >
              <option value="ALL">Status: Semua Aktif</option>
              <option value="Approved">Approved</option>
              <option value="Approved by Leader">Approved by Leader</option>
              <option value="Pending">Pending</option>
            </select>

            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                disabled={isLoading}
                onClick={() => handleShiftMonth(-1)}
                aria-label="Bulan sebelumnya"
                className="btn btn-sm !px-2"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                disabled={isLoading}
                onClick={() => handleShiftMonth(1)}
                aria-label="Bulan berikutnya"
                className="btn btn-sm !px-2"
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

        {/* Grid Kalender 7 Kolom — Responsif Penuh di Mobile tanpa Overflow */}
        <div className="panel-body !p-2.5 sm:!p-4">
          <div className="grid w-full grid-cols-7 border-l border-t border-[var(--rule-strong)]">
            {DOW_LABELS.map((dow) => (
              <div
                key={dow.full}
                className="border-b border-r border-[var(--rule-strong)] bg-[var(--alabaster-deep)] py-1.5 text-center font-mono text-[10px] font-semibold uppercase text-[var(--ink-soft)] sm:py-2 sm:text-[11px]"
              >
                <span className="sm:hidden">{dow.short}</span>
                <span className="hidden sm:inline">{dow.full}</span>
              </div>
            ))}

            {calendarCells.map((cell) => {
              if (cell.type === "blank") {
                return (
                  <div
                    key={cell.key}
                    className="min-h-[54px] border-b border-r border-[var(--rule)] bg-[var(--alabaster)] sm:min-h-[88px]"
                    aria-hidden="true"
                  />
                );
              }

              const isSelected = selectedDayIso === cell.iso;
              const cellBg = cell.blackout
                ? "bg-[var(--terracotta-tint)]"
                : cell.holiday
                  ? cell.holiday.holidayType === "Collective Leave"
                    ? "bg-[var(--ochre-tint)]"
                    : "bg-[var(--slate-tint)]"
                  : cell.isWeekend
                    ? "bg-[var(--alabaster)]"
                    : "bg-[var(--paper-pure)]";

              const ariaSummary = [
                formatIndonesianDate(cell.iso),
                cell.blackout ? `Blackout ${cell.blackout.name}` : null,
                cell.holiday ? cell.holiday.name : null,
                cell.dayLeaves.length > 0
                  ? `${cell.dayLeaves.length} karyawan cuti`
                  : null,
              ]
                .filter(Boolean)
                .join(", ");

              return (
                <button
                  key={cell.key}
                  type="button"
                  aria-label={ariaSummary}
                  aria-pressed={isSelected}
                  onClick={() =>
                    setSelectedDayIso((prev) =>
                      prev === cell.iso ? "" : cell.iso
                    )
                  }
                  className={`flex min-h-[54px] min-w-0 flex-col items-stretch justify-between gap-1 overflow-hidden border-b border-r border-[var(--rule)] p-1 text-left transition-colors hover:bg-[var(--spruce-tint)] sm:min-h-[88px] sm:justify-start sm:p-1.5 ${cellBg} ${
                    isSelected
                      ? "ring-2 ring-inset ring-[var(--spruce)]"
                      : cell.isToday
                        ? "ring-1 ring-inset ring-[var(--spruce)]"
                        : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-0.5 sm:gap-1">
                    <span
                      className={`mono text-[11px] font-semibold leading-none sm:text-xs ${
                        cell.isToday
                          ? "rounded-[2px] bg-[var(--spruce)] px-1 py-0.5 text-[var(--spruce-btn-ink)]"
                          : cell.isWeekend
                            ? "text-[var(--ink-muted)]"
                            : "text-[var(--ink)]"
                      }`}
                    >
                      {cell.day}
                    </span>
                    {cell.dayLeaves.length > 0 && (
                      <span className="mono hidden rounded-[2px] bg-[var(--spruce-tint-strong)] px-1 text-[10px] font-semibold text-[var(--spruce)] sm:inline-block">
                        {cell.dayLeaves.length} cuti
                      </span>
                    )}
                  </div>

                  {/* Indikator Ringkas Mobile (< sm) agar 7 Kolom Fit Sempurna */}
                  <div className="flex flex-wrap items-center gap-0.5 sm:hidden">
                    {cell.blackout && (
                      <span
                        className="mono text-[9px] font-bold leading-none text-[var(--terracotta)]"
                        aria-hidden="true"
                      >
                        ✕
                      </span>
                    )}
                    {cell.holiday && (
                      <span
                        className={`mono text-[9px] font-bold leading-none ${
                          cell.holiday.holidayType === "Collective Leave"
                            ? "text-[var(--ochre)]"
                            : "text-[var(--slate-blue)]"
                        }`}
                        aria-hidden="true"
                      >
                        {cell.holiday.holidayType === "Collective Leave"
                          ? "◇"
                          : "◆"}
                      </span>
                    )}
                    {cell.dayLeaves.length > 0 && (
                      <span
                        className="mono rounded-[2px] bg-[var(--spruce-tint-strong)] px-1 text-[9px] font-bold leading-tight text-[var(--spruce)]"
                        aria-hidden="true"
                      >
                        {cell.dayLeaves.length}
                      </span>
                    )}
                  </div>

                  {/* Chip Detail Lengkap Desktop (sm+) */}
                  {cell.blackout && (
                    <span
                      title={`Blackout: ${cell.blackout.name}`}
                      className="hidden truncate rounded-[2px] border border-[var(--terracotta-border)] bg-[var(--paper-pure)] px-1 py-0.5 font-mono text-[9.5px] font-semibold text-[var(--terracotta)] sm:block"
                    >
                      ✕ {cell.blackout.name}
                    </span>
                  )}

                  {cell.holiday && (
                    <span
                      title={cell.holiday.name}
                      className={`hidden truncate rounded-[2px] px-1 py-0.5 font-mono text-[9.5px] font-semibold sm:block ${
                        cell.holiday.holidayType === "Collective Leave"
                          ? "text-[var(--ochre)]"
                          : "text-[var(--slate-blue)]"
                      }`}
                    >
                      {cell.holiday.holidayType === "Collective Leave"
                        ? "◇"
                        : "◆"}{" "}
                      {cell.holiday.name}
                    </span>
                  )}

                  {cell.dayLeaves.slice(0, 2).map((lv) => (
                    <span
                      key={`${cell.iso}-${lv.id}`}
                      title={`${lv.employeeName} (${lv.divisionName}) — ${lv.leaveTypeName}`}
                      className="hidden truncate rounded-[2px] border border-[var(--spruce-border)] bg-[var(--spruce-tint)] px-1 py-0.5 text-[10px] font-medium text-[var(--spruce)] sm:block"
                    >
                      {lv.employeeName}
                    </span>
                  ))}
                  {cell.dayLeaves.length > 2 && (
                    <span className="mono hidden text-[9.5px] text-[var(--ink-muted)] sm:block">
                      +{cell.dayLeaves.length - 2} lainnya
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Ringkasan Detail Tanggal Terpilih (Berguna terutama saat mengetuk tanggal di Mobile) */}
          {selectedDayInfo && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-[2px] border border-[var(--spruce-border)] bg-[var(--spruce-tint)] px-3 py-2 text-xs">
              <div className="min-w-0 space-y-0.5">
                <p className="font-semibold text-[var(--ink)]">
                  Dipilih: {formatIndonesianDate(selectedDayInfo.iso)}
                </p>
                <p className="mono text-[11px] text-[var(--ink-soft)]">
                  {selectedDayInfo.dayLeaves.length} karyawan cuti
                  {selectedDayInfo.holiday
                    ? ` • ${selectedDayInfo.holiday.holidayType === "Collective Leave" ? "Cuti Bersama" : "Libur Nasional"}: ${selectedDayInfo.holiday.name}`
                    : ""}
                  {selectedDayInfo.blackout
                    ? ` • Blackout: ${selectedDayInfo.blackout.name}`
                    : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDayIso("")}
                className="btn btn-sm"
              >
                Tampilkan Semua Tanggal
              </button>
            </div>
          )}

          {/* Legenda & Banner Blackout Aktif Bulan Ini */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--ink-muted)]">
            <div className="mono flex flex-wrap items-center gap-x-3 gap-y-1 sm:gap-x-4">
              <span>
                <strong className="text-[var(--slate-blue)]">◆</strong> Libur
                Nasional
              </span>
              <span>
                <strong className="text-[var(--ochre)]">◇</strong> Cuti Bersama
              </span>
              <span>
                <strong className="text-[var(--terracotta)]">✕</strong> Blackout
                Period
              </span>
              <span>
                <strong className="text-[var(--spruce)]">■</strong> Jadwal Cuti
              </span>
            </div>
            <span className="mono text-[10.5px] text-[var(--ink-muted)] sm:hidden">
              Ketuk tanggal untuk melihat detail
            </span>
          </div>

          {blackoutPeriods.length > 0 && (
            <div className="mt-3 space-y-2">
              {blackoutPeriods.map((bp) => (
                <div key={bp.id} className="notice notice-danger">
                  <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="m-0 font-semibold">
                      Blackout Period: {bp.name} ({bp.divisionName}) &bull;{" "}
                      <span className="mono">
                        {formatIndonesianDate(bp.startDate)} –{" "}
                        {formatIndonesianDate(bp.endDate)}
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs">{bp.reason}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Direktori Jadwal Cuti */}
      <section className="panel overflow-hidden">
        <div className="panel-head">
          <div>
            <span className="panel-eyebrow !mb-0">Direktori Koordinasi Tim</span>
            <h2 className="panel-title">
              Daftar Jadwal Cuti{" "}
              {selectedDayIso
                ? `Tanggal ${formatIndonesianDate(selectedDayIso)}`
                : `${MONTH_NAMES_ID[month - 1]} ${year}`}
            </h2>
          </div>

          <div className="relative w-full sm:w-72">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--ink-muted)]"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama, divisi, jenis cuti..."
              aria-label="Cari jadwal cuti"
              className="input !py-1.5 !pl-8 text-xs"
            />
          </div>
        </div>

        {filteredLeaves.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="Belum ada jadwal cuti pada periode ini"
              description="Tidak ditemukan jadwal cuti aktif/disetujui untuk filter bulan dan divisi yang dipilih."
            />
          </div>
        ) : (
          <div
            tabIndex={0}
            role="region"
            aria-labelledby={tableCaptionId}
            className="otium-responsive-table-wrap"
          >
            <table className="ledger otium-responsive-table text-left">
              <caption id={tableCaptionId} className="visually-hidden">
                Direktori jadwal cuti perusahaan tanpa data sensitif
              </caption>
              <thead>
                <tr>
                  <th scope="col" className="row-idx">
                    #
                  </th>
                  <th scope="col">Karyawan</th>
                  <th scope="col">Divisi</th>
                  <th scope="col">Jenis Cuti</th>
                  <th scope="col">Periode &amp; Durasi</th>
                  <th scope="col">Rekan Pengganti</th>
                  <th scope="col" className="text-right">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredLeaves.map((item, idx) => (
                  <tr key={item.id}>
                    <td data-label="No" className="row-idx">
                      {String(idx + 1).padStart(2, "0")}
                    </td>
                    <th scope="row" className="font-normal">
                      <div className="flex items-center gap-2.5">
                        <span className="avatar-sq">{item.employeeInitials}</span>
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 font-semibold text-[var(--ink)]">
                            <span className="truncate">{item.employeeName}</span>
                            {Number(item.userId) === Number(currentUserId) && (
                              <span className="tag text-[9.5px]">Anda</span>
                            )}
                          </p>
                          <p className="mono text-[10.5px] text-[var(--ink-muted)]">
                            {item.employeeRole}
                          </p>
                        </div>
                      </div>
                    </th>
                    <td
                      data-label="Divisi"
                      className="whitespace-nowrap text-xs font-medium text-[var(--ink-soft)]"
                    >
                      {item.divisionName}
                    </td>
                    <td
                      data-label="Jenis Cuti"
                      className="whitespace-nowrap text-xs text-[var(--ink-soft)]"
                    >
                      {item.leaveTypeName}
                    </td>
                    <td data-label="Periode" className="whitespace-nowrap">
                      <span className="mono text-xs font-medium text-[var(--ink)]">
                        {item.periodLabel}
                      </span>
                      <span className="mono block text-[10.5px] text-[var(--ink-muted)]">
                        {item.totalDays.toFixed(1)} hari kerja
                      </span>
                    </td>
                    <td
                      data-label="Pengganti"
                      className="whitespace-nowrap text-xs text-[var(--ink-soft)]"
                    >
                      {item.handoverName}
                    </td>
                    <td data-label="Status" className="whitespace-nowrap text-right">
                      <StatusBadge status={item.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
