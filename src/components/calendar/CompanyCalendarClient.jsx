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

const DOW_LABELS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

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

          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Filter divisi"
              value={divisionFilter}
              onChange={(e) => handleDivisionChange(e.target.value)}
              className="select !w-auto !py-1.5 text-xs"
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
              className="select !w-auto !py-1.5 text-xs"
            >
              <option value="ALL">Status: Semua Aktif</option>
              <option value="Approved">Approved</option>
              <option value="Approved by Leader">Approved by Leader</option>
              <option value="Pending">Pending</option>
            </select>

            <div className="flex items-center gap-1">
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

        {/* Grid Kalender 7 Kolom */}
        <div className="panel-body !p-4">
          <div className="overflow-x-auto">
            <div className="grid min-w-[640px] grid-cols-7 border-l border-t border-[var(--rule-strong)]">
              {DOW_LABELS.map((dow) => (
                <div
                  key={dow}
                  className="border-b border-r border-[var(--rule-strong)] bg-[var(--alabaster-deep)] py-2 text-center font-mono text-[11px] font-semibold uppercase text-[var(--ink-soft)]"
                >
                  {dow}
                </div>
              ))}

              {calendarCells.map((cell) => {
                if (cell.type === "blank") {
                  return (
                    <div
                      key={cell.key}
                      className="min-h-[88px] border-b border-r border-[var(--rule)] bg-[var(--alabaster)]"
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

                return (
                  <button
                    key={cell.key}
                    type="button"
                    onClick={() =>
                      setSelectedDayIso((prev) =>
                        prev === cell.iso ? "" : cell.iso
                      )
                    }
                    className={`flex min-h-[88px] flex-col items-stretch justify-start gap-1 border-b border-r border-[var(--rule)] p-1.5 text-left transition-colors hover:bg-[var(--spruce-tint)] ${cellBg} ${
                      isSelected
                        ? "ring-2 ring-inset ring-[var(--spruce)]"
                        : cell.isToday
                          ? "ring-1 ring-inset ring-[var(--spruce)]"
                          : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={`mono text-xs font-semibold ${
                          cell.isToday
                            ? "rounded-[2px] bg-[var(--spruce)] px-1 text-[var(--spruce-btn-ink)]"
                            : cell.isWeekend
                              ? "text-[var(--ink-muted)]"
                              : "text-[var(--ink)]"
                        }`}
                      >
                        {cell.day}
                      </span>
                      {cell.dayLeaves.length > 0 && (
                        <span className="mono rounded-[2px] bg-[var(--spruce-tint-strong)] px-1 text-[10px] font-semibold text-[var(--spruce)]">
                          {cell.dayLeaves.length} cuti
                        </span>
                      )}
                    </div>

                    {cell.blackout && (
                      <span
                        title={`Blackout: ${cell.blackout.name}`}
                        className="truncate rounded-[2px] border border-[var(--terracotta-border)] bg-[var(--paper-pure)] px-1 py-0.5 font-mono text-[9.5px] font-semibold text-[var(--terracotta)]"
                      >
                        ✕ {cell.blackout.name}
                      </span>
                    )}

                    {cell.holiday && (
                      <span
                        title={cell.holiday.name}
                        className={`truncate rounded-[2px] px-1 py-0.5 font-mono text-[9.5px] font-semibold ${
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
                        className="truncate rounded-[2px] border border-[var(--spruce-border)] bg-[var(--spruce-tint)] px-1 py-0.5 text-[10px] font-medium text-[var(--spruce)]"
                      >
                        {lv.employeeName}
                      </span>
                    ))}
                    {cell.dayLeaves.length > 2 && (
                      <span className="mono text-[9.5px] text-[var(--ink-muted)]">
                        +{cell.dayLeaves.length - 2} lainnya
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Legenda & Banner Blackout Aktif Bulan Ini */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--ink-muted)]">
            <div className="mono flex flex-wrap items-center gap-x-4 gap-y-1">
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
                Karyawan
              </span>
            </div>
            {selectedDayIso && (
              <button
                type="button"
                onClick={() => setSelectedDayIso("")}
                className="btn btn-sm"
              >
                Tampilkan Semua Tanggal ({formatIndonesianDate(selectedDayIso)})
              </button>
            )}
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
