"use client";

import { useEffect, useId, useRef } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Calendar,
  Crown,
  Users,
  X,
} from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import EmptyState from "@/components/ui/EmptyState";
import { formatIndonesianDate } from "@/lib/date-utils";

/**
 * Modal Detail Divisi (CMS Modul 2) — Native <dialog className="otium-modal">.
 * Menampilkan metadata Ketua Divisi, jumlah anggota aktif/total, tanggal dibentuk,
 * serta tabel anggota responsif (.otium-responsive-table) dengan tautan bersih ke Modul 3.
 */
export default function DivisionDetailModal({
  isOpen,
  division,
  leader,
  members = [],
  onClose,
}) {
  const dialogRef = useRef(null);
  const titleId = useId();
  const membersCaptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && division) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.close();
      dialog.returnValue = "";
    }
  }, [isOpen, division]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !isOpen || !division) return undefined;

    function handleClose() {
      dialog.returnValue = "";
      onClose?.();
    }

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
        if (pressedOutside && isOutside(e)) {
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
      dialog.removeEventListener("close", handleClose);
      cleanupPointer?.();
    };
  }, [isOpen, division, onClose]);

  const activeCount = members.filter((m) => m.isActive).length;

  return (
    <dialog
      ref={dialogRef}
      closedby="any"
      aria-labelledby={titleId}
      className="otium-modal w-full max-w-2xl"
    >
      {division && (
        <div className="flex max-h-[calc(100dvh-2rem)] w-full flex-col overflow-hidden rounded-[6px] border border-[var(--ink)] bg-[var(--paper-pure)] shadow-[var(--shadow-lg)]">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 border-b border-[var(--rule)] bg-[var(--alabaster)] px-5 py-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[4px] border border-[var(--rule-strong)] bg-[var(--paper-pure)] text-[var(--spruce)]">
                <Building2 className="h-4 w-4" aria-hidden="true" />
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--ink-muted)]">
                  RINCIAN UNIT KERJA · ID #{division.id}
                </p>
                <h2
                  id={titleId}
                  className="font-serif text-[20px] font-semibold leading-snug text-[var(--ink)]"
                >
                  Divisi {division.name}
                </h2>
                <p className="mt-0.5 text-[12px] leading-relaxed text-[var(--ink-soft)]">
                  {division.description || "Tidak ada deskripsi singkat."}
                </p>
              </div>
            </div>

            <button
              type="button"
              autoFocus
              onClick={() => onClose?.()}
              aria-label="Tutup modal detail divisi"
              className="btn-icon h-7 w-7 shrink-0"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
            {/* Metadata Strip */}
            <div className="metric-strip lg:!grid-cols-3">
              <div className="metric-cell !p-3.5">
                <p className="metric-label flex items-center gap-1.5">
                  <Crown
                    className="h-3 w-3 text-[var(--ochre)]"
                    aria-hidden="true"
                  />
                  Ketua Divisi
                </p>
                <p className="mt-1.5 text-[13.5px] font-semibold text-[var(--ink)]">
                  {leader ? leader.fullName : "Belum Ditetapkan"}
                </p>
                <p className="mt-0.5 truncate font-mono text-[11px] text-[var(--ink-muted)]">
                  {leader ? leader.email : "Tunjuk ketua via Edit Divisi"}
                </p>
              </div>

              <div className="metric-cell !p-3.5">
                <p className="metric-label flex items-center gap-1.5">
                  <Users
                    className="h-3 w-3 text-[var(--spruce)]"
                    aria-hidden="true"
                  />
                  Total Anggota
                </p>
                <p className="mt-1.5 font-mono text-[15px] font-semibold tabular-nums text-[var(--ink)]">
                  {members.length} Orang
                </p>
                <p className="mt-0.5 font-mono text-[11px] tabular-nums text-[var(--ink-muted)]">
                  {activeCount} aktif · {members.length - activeCount} nonaktif
                </p>
              </div>

              <div className="metric-cell !p-3.5">
                <p className="metric-label flex items-center gap-1.5">
                  <Calendar className="h-3 w-3" aria-hidden="true" />
                  Tanggal Dibentuk
                </p>
                <p className="mt-1.5 text-[13.5px] font-semibold text-[var(--ink)]">
                  {formatIndonesianDate(division.createdAt)}
                </p>
                <p className="mt-0.5 font-mono text-[11px] text-[var(--ink-muted)]">
                  {division.createdAt}
                </p>
              </div>
            </div>

            {/* Daftar Anggota */}
            <div>
              <h3 className="font-mono text-[10.5px] font-medium uppercase tracking-[0.12em] text-[var(--ink-muted)]">
                Daftar Anggota dalam Divisi ({members.length})
              </h3>

              {members.length === 0 ? (
                <div className="panel mt-2.5 p-6">
                  <EmptyState
                    title="Belum ada anggota"
                    description="Gunakan Modul 3 (Anggota Divisi) untuk menempatkan karyawan ke divisi ini."
                  />
                </div>
              ) : (
                <div className="panel mt-2.5 overflow-hidden">
                  <div
                    tabIndex={0}
                    role="region"
                    aria-labelledby={membersCaptionId}
                    className="otium-responsive-table-wrap focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--spruce)]"
                  >
                    <table className="ledger otium-responsive-table text-left">
                      <caption id={membersCaptionId} className="sr-only">
                        Daftar anggota pada divisi {division.name}
                      </caption>
                      <thead>
                        <tr>
                          <th scope="col">Nama &amp; Email</th>
                          <th scope="col">Role</th>
                          <th scope="col">Sisa Kuota</th>
                          <th scope="col" className="text-right">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {members.map((member) => (
                          <tr key={member.id}>
                            <th scope="row" className="whitespace-nowrap font-normal">
                              <p className="text-[12.5px] font-semibold text-[var(--ink)]">
                                {member.fullName}
                              </p>
                              <p className="break-all font-mono text-[11px] text-[var(--ink-muted)]">
                                {member.email}
                              </p>
                            </th>
                            <td data-label="Role" className="whitespace-nowrap">
                              <StatusBadge status={member.role} />
                            </td>
                            <td
                              data-label="Sisa Kuota"
                              className="whitespace-nowrap font-mono text-[12px] font-semibold tabular-nums text-[var(--ink)]"
                            >
                              {Number(member.remainingLeaveQuota).toFixed(1)} Hari
                            </td>
                            <td
                              data-label="Status"
                              className="whitespace-nowrap text-right"
                            >
                              <StatusBadge
                                status={member.isActive ? "Aktif" : "Nonaktif"}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-[var(--rule)] bg-[var(--alabaster)] px-5 py-3.5">
            <Link
              href={`/admin/division-members?divisionId=${division.id}`}
              onClick={() => onClose?.()}
              className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[var(--spruce)] underline underline-offset-4 hover:text-[var(--ink)]"
            >
              Kelola Anggota Divisi ini di Modul 3
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>

            <button
              type="button"
              onClick={() => onClose?.()}
              className="btn btn-sm"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}
