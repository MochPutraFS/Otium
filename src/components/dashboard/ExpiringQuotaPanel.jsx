"use client";

import { useId, useMemo, useState } from "react";
import {
  AlertCircle,
  BellRing,
  CheckCircle2,
  Loader2,
  Send,
} from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import EmptyState from "@/components/ui/EmptyState";
import { sendExpiringQuotaReminderAction } from "@/actions/reminder-actions";

/**
 * Panel Peringatan Kuota Hangus (Expiring Quota Alert — Fase 2 8.5)
 * untuk Dashboard Admin & HRD. Mendukung pengiriman notifikasi per individu & massal.
 */
export default function ExpiringQuotaPanel({
  employees = [],
  onSent,
}) {
  const captionId = useId();
  const [selectedIds, setSelectedIds] = useState([]);
  const [sendingId, setSendingId] = useState(null);
  const [isSendingBulk, setIsSendingBulk] = useState(false);
  const [banner, setBanner] = useState(null); // { tone: "success"|"error", message: string }

  const validSelectedIds = useMemo(() => {
    const idSet = new Set(employees.map((e) => e.id));
    return selectedIds.filter((id) => idSet.has(id));
  }, [employees, selectedIds]);

  const allSelected =
    employees.length > 0 && validSelectedIds.length === employees.length;

  function toggleOne(id, checked) {
    setSelectedIds((prev) =>
      checked ? (prev.includes(id) ? prev : [...prev, id]) : prev.filter((x) => x !== id)
    );
  }

  function toggleAll(checked) {
    setSelectedIds(checked ? employees.map((e) => e.id) : []);
  }

  async function handleSendSingle(emp) {
    if (sendingId || isSendingBulk) return;
    setSendingId(emp.id);
    setBanner(null);
    try {
      const res = await sendExpiringQuotaReminderAction([emp.id]);
      if (!res.ok) {
        setBanner({
          tone: "error",
          message: res.error || "Gagal mengirim notifikasi pengingat.",
        });
        return;
      }
      setBanner({
        tone: "success",
        message: `Notifikasi pengingat kuota berhasil dikirim ke ${emp.fullName}.`,
      });
      await onSent?.();
    } catch {
      setBanner({
        tone: "error",
        message: "Gangguan koneksi saat mengirim notifikasi pengingat.",
      });
    } finally {
      setSendingId(null);
    }
  }

  async function handleSendBulk() {
    if (isSendingBulk || sendingId) return;
    const targets =
      validSelectedIds.length > 0
        ? validSelectedIds
        : employees.map((e) => e.id);
    if (targets.length === 0) return;

    setIsSendingBulk(true);
    setBanner(null);
    try {
      const res = await sendExpiringQuotaReminderAction(targets);
      if (!res.ok) {
        setBanner({
          tone: "error",
          message: res.error || "Gagal mengirim notifikasi massal.",
        });
        return;
      }
      setSelectedIds([]);
      setBanner({
        tone: "success",
        message: res.message || "Pengingat massal berhasil dikirim.",
      });
      await onSent?.();
    } catch {
      setBanner({
        tone: "error",
        message: "Gangguan koneksi saat mengirim pengingat massal.",
      });
    } finally {
      setIsSendingBulk(false);
    }
  }

  return (
    <section
      className="panel overflow-hidden"
      aria-label="Peringatan kuota cuti tahunan hangus"
    >
      <div className="panel-head">
        <div>
          <span className="panel-eyebrow">
            Fase 2 &bull; Expiring Quota Alert (&ge; 6.0 Hari)
          </span>
          <h2 className="panel-title">
            Peringatan Kuota Cuti Tahunan Hangus
          </h2>
          <p className="panel-sub">
            Karyawan eligible yang masih memiliki sisa kuota cuti tahunan besar
            (&ge; 6.0 hari). Kirim notifikasi pengingat sebelum kuota hangus di
            akhir tahun.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="tag tag-pending">{employees.length} Karyawan</span>
          {employees.length > 0 && (
            <button
              type="button"
              disabled={isSendingBulk || Boolean(sendingId)}
              onClick={handleSendBulk}
              className="btn btn-primary btn-sm"
            >
              {isSendingBulk ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <BellRing className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span>
                {validSelectedIds.length > 0
                  ? `Kirim Pengingat (${validSelectedIds.length} Terpilih)`
                  : `Kirim Pengingat Massal (${employees.length})`}
              </span>
            </button>
          )}
        </div>
      </div>

      {banner && (
        <div className="border-b border-[var(--rule)] px-5 py-3">
          <div
            role={banner.tone === "error" ? "alert" : "status"}
            className={`notice ${
              banner.tone === "error" ? "notice-danger" : "notice-success"
            }`}
          >
            {banner.tone === "error" ? (
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            )}
            <span>{banner.message}</span>
          </div>
        </div>
      )}

      {employees.length === 0 ? (
        <div className="panel-body">
          <EmptyState
            title="Tidak ada karyawan dengan sisa kuota >= 6.0 hari"
            description="Seluruh karyawan eligible sudah merencanakan penggunaan cuti tahunan dengan baik."
          />
        </div>
      ) : (
        <div
          tabIndex={0}
          role="region"
          aria-labelledby={captionId}
          className="otium-responsive-table-wrap"
        >
          <table className="ledger otium-responsive-table text-left">
            <caption id={captionId} className="visually-hidden">
              Daftar karyawan dengan sisa kuota cuti tahunan minimal 6 hari kerja
            </caption>
            <thead>
              <tr>
                <th scope="col" className="w-10 text-center">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) => toggleAll(e.target.checked)}
                    aria-label="Pilih semua karyawan untuk pengingat massal"
                    className="otium-checkbox h-4 w-4 cursor-pointer"
                  />
                </th>
                <th scope="col">Nama Karyawan</th>
                <th scope="col">Divisi</th>
                <th scope="col">Sisa Kuota</th>
                <th scope="col">Pengingat Terakhir</th>
                <th scope="col" className="text-right">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => {
                const isSelected = validSelectedIds.includes(emp.id);
                const pct = Math.min(
                  100,
                  Math.round(
                    (emp.remainingQuota / Math.max(1, emp.initialQuota)) * 100
                  )
                );
                return (
                  <tr key={emp.id}>
                    <td
                      data-label="Pilih"
                      className="text-center md:w-10"
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => toggleOne(emp.id, e.target.checked)}
                        aria-label={`Pilih ${emp.fullName}`}
                        className="otium-checkbox h-4 w-4 cursor-pointer"
                      />
                    </td>
                    <th scope="row" className="font-normal">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-semibold text-[var(--ink)]">
                          {emp.fullName}
                        </span>
                        <StatusBadge status={emp.role} />
                      </div>
                      <p className="mono break-all text-[11px] text-[var(--ink-muted)]">
                        {emp.email}
                      </p>
                    </th>
                    <td
                      data-label="Divisi"
                      className="whitespace-nowrap text-xs font-medium text-[var(--ink-soft)]"
                    >
                      {emp.divisionName}
                    </td>
                    <td
                      data-label="Sisa Kuota"
                      className="otium-mobile-stack md:min-w-[165px]"
                    >
                      <div className="w-full">
                        <div className="mono flex items-center justify-between gap-2 text-xs">
                          <span className="font-bold text-[var(--ochre)]">
                            {emp.remainingQuota.toFixed(1)} hr
                          </span>
                          <span className="text-[10.5px] text-[var(--ink-muted)]">
                            / {emp.initialQuota.toFixed(1)} hr ({pct}%)
                          </span>
                        </div>
                        <div className="mt-1">
                          <progress
                            className="otium-progress otium-progress--amber"
                            value={pct}
                            max={100}
                            aria-label={`Sisa kuota ${emp.fullName}: ${emp.remainingQuota.toFixed(1)} dari ${emp.initialQuota.toFixed(1)} hari`}
                          />
                        </div>
                      </div>
                    </td>
                    <td
                      data-label="Pengingat Terakhir"
                      className="mono whitespace-nowrap text-[11px] text-[var(--ink-muted)]"
                    >
                      {emp.lastRemindedAt || "Belum pernah"}
                    </td>
                    <td data-label="Aksi" className="whitespace-nowrap text-right">
                      <button
                        type="button"
                        disabled={Boolean(sendingId) || isSendingBulk}
                        onClick={() => handleSendSingle(emp)}
                        className="btn btn-sm"
                      >
                        {sendingId === emp.id ? (
                          <Loader2
                            className="h-3.5 w-3.5 animate-spin"
                            aria-hidden="true"
                          />
                        ) : (
                          <Send className="h-3 w-3" aria-hidden="true" />
                        )}
                        <span>Kirim Pengingat</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
