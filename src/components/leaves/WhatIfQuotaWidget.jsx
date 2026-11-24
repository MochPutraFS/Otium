"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarOff,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Users,
} from "lucide-react";
import QuotaPrecisionRuler from "@/components/ui/QuotaPrecisionRuler";
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

function parseIsoYearMonth(iso) {
  if (typeof iso === "string" && /^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const year = Number(iso.slice(0, 4));
    const month = Number(iso.slice(5, 7)) - 1;
    if (Number.isFinite(year) && month >= 0 && month <= 11) {
      return { year, month };
    }
  }
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

function toIsoDate(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Panel Kanan Sticky Form Pengajuan Cuti bergaya Swiss Archival:
 * 1. What-If Projection Ruler (QuotaPrecisionRuler 12-segmen + arsiran ochre real-time)
 * 2. Kalender Interaktif Multi-Bulan (Senin–Minggu, sinkron dua arah dengan input tanggal, TANPA Blackout)
 * 3. Ringkasan Hari Libur dikecualikan & Alert Validasi Kontekstual
 */
export default function WhatIfQuotaWidget({
  selectedLeaveType,
  totalDays = 0,
  currentQuota = 12.0,
  initialQuota = 12.0,
  usedNonAnnualDays = 0,
  remainingNonAnnualQuota = null,
  holidayHits = [],
  validationErrors = [],
  capacityWarning = null,
  isCheckingAvailability = false,
  startDate = "",
  endDate = "",
  isHalfDay = false,
  serverToday = "",
  holidays = [],
  colleagueLeaves = [],
  blackoutPeriods = [],
  onSelectDateRange,
}) {
  const deductsAnnual = Boolean(selectedLeaveType?.deductsAnnualQuota);
  const estimatedRemaining = deductsAnnual
    ? Number((currentQuota - totalDays).toFixed(1))
    : currentQuota;
  const isQuotaShort = deductsAnnual && estimatedRemaining < 0;

  const [viewMonth, setViewMonth] = useState(() =>
    parseIsoYearMonth(startDate || serverToday)
  );
  const [pickPhase, setPickPhase] = useState("start"); // "start" | "end"

  // Sinkronkan bulan kalender saat input startDate diubah secara manual
  useEffect(() => {
    if (startDate && /^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      const parsed = parseIsoYearMonth(startDate);
      setViewMonth((prev) =>
        prev.year === parsed.year && prev.month === parsed.month ? prev : parsed
      );
    }
  }, [startDate]);

  // Reset fase klik kalender jika mode setengah hari berubah
  useEffect(() => {
    setPickPhase("start");
  }, [isHalfDay]);

  const holidayMap = useMemo(() => {
    const map = new Map();
    (holidays || []).forEach((h) => {
      if (h?.holidayDate) {
        map.set(h.holidayDate, {
          name: h.name || "Hari Libur",
          holidayType: h.holidayType || "National Holiday",
        });
      }
    });
    return map;
  }, [holidays]);

  const overlappingColleagues = useMemo(() => {
    if (!startDate || !endDate || endDate < startDate) return [];
    const seen = new Map();
    (colleagueLeaves || []).forEach((item) => {
      if (item.startDate <= endDate && item.endDate >= startDate) {
        if (!seen.has(item.employeeName)) {
          seen.set(item.employeeName, item);
        }
      }
    });
    return Array.from(seen.values());
  }, [colleagueLeaves, startDate, endDate]);

  const calendarCells = useMemo(() => {
    const { year, month } = viewMonth;
    const firstDowJs = new Date(year, month, 1).getDay(); // 0=Min .. 6=Sab
    const leadingBlanks = (firstDowJs + 6) % 7; // 0=Sen .. 6=Min
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells = [];
    for (let i = 0; i < leadingBlanks; i += 1) {
      cells.push({ type: "blank", key: `b-${i}` });
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      const iso = toIsoDate(year, month, day);
      const dowJs = new Date(year, month, day).getDay();
      const isWeekend = dowJs === 0 || dowJs === 6;
      const holidayInfo = holidayMap.get(iso) || null;
      const blackoutInfo =
        (blackoutPeriods || []).find(
          (bp) => bp.startDate <= iso && bp.endDate >= iso
        ) || null;
      const dayColleagues = (colleagueLeaves || []).filter(
        (cl) => cl.startDate <= iso && cl.endDate >= iso
      );
      const isToday = Boolean(serverToday && iso === serverToday);
      const isSelected = Boolean(
        startDate &&
          endDate &&
          iso >= startDate &&
          iso <= endDate
      );

      cells.push({
        type: "day",
        key: iso,
        day,
        iso,
        isWeekend,
        holidayName: holidayInfo?.name || null,
        holidayType: holidayInfo?.holidayType || null,
        blackoutName: blackoutInfo?.name || null,
        colleagueNames: Array.from(
          new Set(dayColleagues.map((cl) => cl.employeeName))
        ),
        isToday,
        isSelected,
      });
    }
    return cells;
  }, [
    viewMonth,
    holidayMap,
    blackoutPeriods,
    colleagueLeaves,
    serverToday,
    startDate,
    endDate,
  ]);

  function shiftMonth(delta) {
    setViewMonth((prev) => {
      const next = new Date(prev.year, prev.month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  }

  function handleDayClick(iso) {
    if (typeof onSelectDateRange !== "function") return;

    if (isHalfDay) {
      onSelectDateRange(iso, iso);
      setPickPhase("start");
      return;
    }

    if (pickPhase === "start" || !startDate || iso < startDate) {
      onSelectDateRange(iso, iso);
      setPickPhase("end");
    } else {
      onSelectDateRange(startDate, iso);
      setPickPhase("start");
    }
  }

  return (
    <aside
      aria-label="Simulasi kuota dan kalender interaktif pengajuan cuti"
      className="min-w-0 space-y-4 lg:sticky lg:top-[76px]"
    >
      {/* PANEL 1: WHAT-IF PROJECTION RULER */}
      <div className="panel min-w-0 overflow-hidden">
        <div className="panel-head !py-3.5">
          <div className="flex min-w-0 items-center gap-2">
            <div className="min-w-0">
              <span className="panel-eyebrow !mb-0">Simulasi Real-Time</span>
              <h2 className="panel-title !text-[15px]">Proyeksi Kuota</h2>
            </div>
            {isCheckingAvailability && (
              <Loader2
                className="h-3.5 w-3.5 shrink-0 animate-spin text-[var(--ink-muted)]"
                aria-label="Memverifikasi ketersediaan ke server"
              />
            )}
          </div>
          {selectedLeaveType && (
            <span className="tag max-w-full truncate">
              {selectedLeaveType.name}
            </span>
          )}
        </div>

        {/* Stage Ruler + Durasi */}
        <div className="quota-proj-stage">
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <span className="font-mono text-[10.5px] uppercase tracking-[0.06em] text-[var(--ink-muted)]">
                Durasi Hari Kerja
              </span>
              <p className="text-[11px] text-[var(--ink-soft)]">
                Senin&ndash;Jumat, tanpa libur nasional
              </p>
            </div>
            <div className="text-right">
              <span className="font-serif text-[32px] font-semibold leading-none text-[var(--ink)] tabular-nums">
                {Number(totalDays).toFixed(1)}
              </span>
              <span className="mono ml-1 text-xs text-[var(--ink-muted)]">
                hr
              </span>
            </div>
          </div>

          {deductsAnnual && (
            <QuotaPrecisionRuler
              total={initialQuota}
              remaining={currentQuota}
              delta={Math.max(0, Number(totalDays) || 0)}
            />
          )}
        </div>

        <div className="panel-body space-y-3.5 !py-4">
          {deductsAnnual ? (
            <div className="quota-proj-stats">
              <div className="quota-proj-row">
                <span className="text-[var(--ink-soft)]">Saldo Saat Ini</span>
                <span className="mono font-semibold text-[var(--ink)]">
                  {Number(currentQuota).toFixed(1)} hr
                </span>
              </div>
              <div className="quota-proj-row">
                <span className="text-[var(--ink-soft)]">Proyeksi Potong</span>
                <span className="mono font-semibold text-[var(--ochre)]">
                  -{Number(totalDays).toFixed(1)} hr
                </span>
              </div>
              <div className="quota-proj-row">
                <span className="font-semibold text-[var(--ink)]">
                  Estimasi Sisa
                </span>
                <span
                  className={`mono text-sm font-bold ${
                    isQuotaShort
                      ? "text-[var(--terracotta)]"
                      : "text-[var(--spruce)]"
                  }`}
                >
                  {estimatedRemaining.toFixed(1)} hr
                </span>
              </div>
              <p className="pt-1 text-[11px] leading-relaxed text-[var(--ink-muted)]">
                Kuota ditahan saat berstatus <em>Pending</em> dan dikembalikan
                otomatis (<em>Auto-Refund</em>) bila dibatalkan atau ditolak.
              </p>
            </div>
          ) : (
            <div className="notice notice-success">
              <CheckCircle2 aria-hidden="true" />
              <div className="min-w-0">
                <p className="m-0 font-semibold">
                  Tidak memotong kuota Cuti Tahunan.
                </p>
                {selectedLeaveType?.maxQuota ? (
                  <p className="mt-0.5 text-[11px]">
                    Batas maksimal:{" "}
                    <strong className="mono">
                      {Number(selectedLeaveType.maxQuota).toFixed(1)} hari/tahun
                    </strong>
                    .
                    {usedNonAnnualDays > 0 && (
                      <>
                        {" "}
                        Terpakai:{" "}
                        <strong className="mono">
                          {Number(usedNonAnnualDays).toFixed(1)} hr
                        </strong>{" "}
                        (sisa{" "}
                        <strong className="mono">
                          {Number(
                            remainingNonAnnualQuota ??
                              Math.max(
                                0,
                                Number(selectedLeaveType.maxQuota) -
                                  Number(usedNonAnnualDays)
                              )
                          ).toFixed(1)}{" "}
                          hr
                        </strong>
                        ).
                      </>
                    )}
                  </p>
                ) : null}
              </div>
            </div>
          )}

          {/* Info Hari Libur yang Dikecualikan */}
          {holidayHits.length > 0 && (
            <div className="notice notice-info">
              <CalendarOff aria-hidden="true" />
              <div className="min-w-0">
                <p className="m-0 font-semibold">
                  {holidayHits.length} hari libur dikecualikan:
                </p>
                <ul className="mt-1 space-y-0.5 pl-4 text-[11px]">
                  {holidayHits.map((h) => (
                    <li key={h.holidayDate} className="list-disc">
                      <span className="mono font-semibold">
                        {formatIndonesianDate(h.holidayDate)}
                      </span>{" "}
                      &mdash; {h.name}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Info Rekan Sedivisi yang Cuti di Rentang Tanggal Terpilih (8.4) */}
          {overlappingColleagues.length > 0 && (
            <div className="notice notice-info">
              <Users aria-hidden="true" />
              <div className="min-w-0">
                <p className="m-0 font-semibold">
                  {overlappingColleagues.length} rekan sedivisi cuti di rentang ini:
                </p>
                <ul className="mt-1 space-y-0.5 pl-4 text-[11px]">
                  {overlappingColleagues.map((cl) => (
                    <li key={cl.id} className="list-disc">
                      <strong>{cl.employeeName}</strong>{" "}
                      <span className="mono text-[10.5px]">
                        ({formatIndonesianDate(cl.startDate)}
                        {cl.endDate !== cl.startDate
                          ? ` – ${formatIndonesianDate(cl.endDate)}`
                          : ""}
                        )
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Peringatan Kapasitas Tim Divisi (Non-Blocking Soft Warning - 8.6) */}
          {capacityWarning?.isExceeded && (
            <div role="status" className="notice notice-warn">
              <AlertTriangle aria-hidden="true" />
              <div className="min-w-0">
                <p className="m-0 font-semibold">
                  Peringatan Limit Kapasitas Tim ({capacityWarning.projectedPct}% &gt;{" "}
                  {capacityWarning.maxAllowedPct}%)
                </p>
                <p className="mt-0.5 text-[11px]">
                  {capacityWarning.message} Pengajuan tetap dapat dikirim untuk
                  ditinjau lebih lanjut oleh HRD.
                </p>
              </div>
            </div>
          )}

          {/* Contextual-Only Alerts (Garda 3-8 & Blackout) */}
          {validationErrors.length > 0 && (
            <div
              role="alert"
              className="space-y-2 border-t border-[var(--rule)] pt-3"
            >
              {validationErrors.map((err, index) => (
                <div key={`${err}-${index}`} className="notice notice-danger">
                  <AlertTriangle aria-hidden="true" />
                  <span>{err}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* PANEL 2: KALENDER INTERAKTIF MULTI-BULAN (TANPA BLACKOUT) */}
      {typeof onSelectDateRange === "function" && (
        <div className="panel overflow-hidden">
          <div className="panel-head !py-3">
            <div>
              <span className="panel-eyebrow !mb-0">Kalender Interaktif</span>
              <h2 className="panel-title !text-[14px]">
                {MONTH_NAMES_ID[viewMonth.month]} {viewMonth.year}
              </h2>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                aria-label="Bulan sebelumnya"
                className="btn btn-sm !min-h-[28px] !px-2"
              >
                <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => shiftMonth(1)}
                aria-label="Bulan berikutnya"
                className="btn btn-sm !min-h-[28px] !px-2"
              >
                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="panel-body space-y-3 !p-3.5">
            <p className="text-[11px] text-[var(--ink-muted)]">
              {isHalfDay
                ? "Klik 1 tanggal kerja untuk cuti 0.5 hari."
                : pickPhase === "end"
                  ? "Klik tanggal selesai rentang cuti Anda."
                  : "Klik tanggal mulai, lalu klik tanggal selesai."}
            </p>

            <div className="cal-grid" role="grid" aria-label="Kalender pilih tanggal cuti">
              {DOW_LABELS.map((dow) => (
                <div key={dow} className="cal-dow" role="columnheader">
                  {dow}
                </div>
              ))}

              {calendarCells.map((cell) => {
                if (cell.type === "blank") {
                  return (
                    <div
                      key={cell.key}
                      className="cal-day is-blank"
                      aria-hidden="true"
                    />
                  );
                }

                const classes = [
                  "cal-day",
                  cell.isWeekend ? "weekend" : "",
                  cell.holidayName
                    ? cell.holidayType === "Collective Leave"
                      ? "collective"
                      : "holiday"
                    : "",
                  cell.blackoutName ? "blackout" : "",
                  cell.isSelected ? "selected" : "",
                  cell.isToday ? "is-today" : "",
                ]
                  .filter(Boolean)
                  .join(" ");

                const tooltipParts = [formatIndonesianDate(cell.iso)];
                if (cell.isToday) tooltipParts.push("Hari Ini");
                if (cell.blackoutName) {
                  tooltipParts.push(`Blackout: ${cell.blackoutName}`);
                }
                if (cell.holidayName) {
                  tooltipParts.push(
                    `${
                      cell.holidayType === "Collective Leave"
                        ? "Cuti Bersama"
                        : "Libur Nasional"
                    }: ${cell.holidayName}`
                  );
                }
                if (cell.colleagueNames.length > 0) {
                  tooltipParts.push(
                    `Rekan Cuti: ${cell.colleagueNames.join(", ")}`
                  );
                }
                if (cell.isWeekend) tooltipParts.push("Akhir Pekan");

                return (
                  <button
                    key={cell.key}
                    type="button"
                    onClick={() => handleDayClick(cell.iso)}
                    title={tooltipParts.join(" • ")}
                    aria-label={tooltipParts.join(", ")}
                    aria-pressed={cell.isSelected}
                    className={classes}
                  >
                    <span>{cell.day}</span>
                    <span className="flex items-center gap-0.5">
                      {cell.blackoutName && (
                        <span
                          className="cal-marker text-[var(--terracotta)]"
                          aria-hidden="true"
                        >
                          ✕
                        </span>
                      )}
                      {!cell.blackoutName && cell.holidayName && (
                        <span className="cal-marker" aria-hidden="true">
                          {cell.holidayType === "Collective Leave" ? "◇" : "◆"}
                        </span>
                      )}
                      {cell.colleagueNames.length > 0 && (
                        <span
                          className="cal-colleague-dot"
                          aria-hidden="true"
                        />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Legenda Kalender Lengkap (Fase 2: Libur, Cuti Bersama, Rekan Sedivisi, Blackout) */}
            <div className="mono flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-[var(--rule)] pt-2.5 text-[10px] text-[var(--ink-muted)]">
              <span>
                <strong className="text-[var(--spruce)]">■</strong> Dipilih
              </span>
              <span>
                <strong className="text-[var(--slate-blue)]">◆</strong> Libur
              </span>
              <span>
                <strong className="text-[var(--ochre)]">◇</strong> Cuti Bersama
              </span>
              <span>
                <strong className="text-[var(--spruce)]">●</strong> Rekan Cuti
              </span>
              <span>
                <strong className="text-[var(--terracotta)]">✕</strong> Blackout
              </span>
              <span>
                <strong>░</strong> Akhir Pekan
              </span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
