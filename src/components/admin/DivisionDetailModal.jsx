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
        <div className="flex max-h-[calc(100dvh-2rem)] w-full flex-col overflow-hidden rounded-xl border border-stone-300 bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 border-b border-stone-200 bg-[#F4F2EC] px-5 py-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-stone-300 bg-white text-slate-900">
                <Building2 className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                  Rincian Unit Kerja · ID #{division.id}
                </p>
                <h2
                  id={titleId}
                  className="text-base font-bold tracking-tight text-slate-900"
                >
                  Divisi {division.name}
                </h2>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                  {division.description || "Tidak ada deskripsi singkat."}
                </p>
              </div>
            </div>

            <button
              type="button"
              autoFocus
              onClick={() => onClose?.()}
              aria-label="Tutup modal detail divisi"
              className="cursor-pointer rounded-lg p-1.5 text-slate-600 transition-colors duration-150 hover:bg-stone-200/80 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-slate-900"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
            {/* Metadata Kartu */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-stone-200 bg-[#F4F2EC]/55 p-3.5">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-600">
                  <Crown className="h-3.5 w-3.5 text-slate-800" aria-hidden="true" />
                  Ketua Divisi
                </p>
                <p className="mt-1.5 text-sm font-bold text-slate-900">
                  {leader ? leader.fullName : "Belum Ditetapkan"}
                </p>
                <p className="mt-0.5 truncate text-xs text-slate-600">
                  {leader ? leader.email : "Tunjuk ketua via Edit Divisi"}
                </p>
              </div>

              <div className="rounded-xl border border-stone-200 bg-[#F4F2EC]/55 p-3.5">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-600">
                  <Users className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
                  Total Anggota
                </p>
                <p className="mt-1.5 text-sm font-bold text-slate-900 tabular-nums">
                  {members.length} Orang
                </p>
                <p className="mt-0.5 text-xs text-slate-600 tabular-nums">
                  {activeCount} aktif · {members.length - activeCount} nonaktif
                </p>
              </div>

              <div className="rounded-xl border border-stone-200 bg-[#F4F2EC]/55 p-3.5">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-600">
                  <Calendar className="h-3.5 w-3.5 text-slate-800" aria-hidden="true" />
                  Tanggal Dibentuk
                </p>
                <p className="mt-1.5 text-sm font-bold text-slate-900">
                  {formatIndonesianDate(division.createdAt)}
                </p>
                <p className="mt-0.5 font-mono text-[11px] text-slate-600">
                  {division.createdAt}
                </p>
              </div>
            </div>

            {/* Daftar Anggota */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-slate-700">
                Daftar Anggota dalam Divisi ({members.length})
              </h3>

              {members.length === 0 ? (
                <div className="mt-3 rounded-xl border border-stone-200 p-6">
                  <EmptyState
                    title="Belum ada anggota"
                    description="Gunakan Modul 3 (Anggota Divisi) untuk menempatkan karyawan ke divisi ini."
                  />
                </div>
              ) : (
                <div className="mt-2.5 overflow-hidden rounded-xl border border-stone-200 bg-white">
                  <div
                    tabIndex={0}
                    role="region"
                    aria-labelledby={membersCaptionId}
                    className="otium-responsive-table-wrap focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-slate-900"
                  >
                    <table className="otium-responsive-table text-left text-xs">
                      <caption id={membersCaptionId} className="sr-only">
                        Daftar anggota pada divisi {division.name}
                      </caption>
                      <thead className="bg-[#F4F2EC] text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-700">
                        <tr>
                          <th scope="col" className="border-b border-stone-200 px-4 py-2.5">
                            Nama &amp; Email
                          </th>
                          <th scope="col" className="border-b border-stone-200 px-4 py-2.5">
                            Role
                          </th>
                          <th scope="col" className="border-b border-stone-200 px-4 py-2.5">
                            Sisa Kuota
                          </th>
                          <th
                            scope="col"
                            className="border-b border-stone-200 px-4 py-2.5 text-right"
                          >
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100 bg-white">
                        {members.map((member) => (
                          <tr
                            key={member.id}
                            className="transition-colors duration-150 hover:bg-[#F4F2EC]/45"
                          >
                            <th
                              scope="row"
                              className="whitespace-nowrap px-4 py-2.5 font-normal"
                            >
                              <p className="font-semibold text-slate-900">
                                {member.fullName}
                              </p>
                              <p className="text-[11px] text-slate-600">
                                {member.email}
                              </p>
                            </th>
                            <td
                              data-label="Role"
                              className="whitespace-nowrap px-4 py-2.5"
                            >
                              <StatusBadge status={member.role} />
                            </td>
                            <td
                              data-label="Sisa Kuota"
                              className="whitespace-nowrap px-4 py-2.5 font-semibold text-slate-900 tabular-nums"
                            >
                              {Number(member.remainingLeaveQuota).toFixed(1)} Hari
                            </td>
                            <td
                              data-label="Status"
                              className="whitespace-nowrap px-4 py-2.5 text-right"
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
          <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-stone-200 bg-[#F4F2EC]/70 px-5 py-3.5">
            <Link
              href={`/admin/division-members?divisionId=${division.id}`}
              onClick={() => onClose?.()}
              className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-slate-900 underline decoration-slate-900/35 underline-offset-4 transition-colors duration-150 hover:decoration-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
            >
              Kelola Anggota Divisi ini di Modul 3
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>

            <button
              type="button"
              onClick={() => onClose?.()}
              className="cursor-pointer rounded-lg border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 transition-colors duration-150 hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}
