"use client";

import { useEffect } from "react";
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
import { formatShortIndonesianDate } from "@/lib/mock-admin-data";

// Modal Detail Divisi (CMS Modul 2) — menampilkan info ketua & daftar lengkap anggota
export default function DivisionDetailModal({
  isOpen,
  division,
  leader,
  members = [],
  onClose,
}) {
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(event) {
      if (event.key === "Escape") onClose?.();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !division) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="division-detail-modal-title"
    >
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 bg-slate-50/70 px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-200">
              <Building2 className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h3
                id="division-detail-modal-title"
                className="text-base font-bold text-slate-900"
              >
                Detail Divisi {division.name}
              </h3>
              <p className="mt-0.5 text-xs text-slate-600">
                {division.description || "Tidak ada deskripsi singkat."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal"
            className="cursor-pointer rounded-lg p-1.5 text-slate-400 transition-colors duration-200 hover:bg-slate-200/70 hover:text-slate-700"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          {/* Metadata Kartu */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <Crown className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
                Ketua Divisi
              </p>
              <p className="mt-1 text-sm font-bold text-slate-900">
                {leader ? leader.fullName : "Belum Ditetapkan"}
              </p>
              {leader && (
                <p className="text-[11px] text-slate-500">{leader.email}</p>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <Users className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                Total Anggota
              </p>
              <p className="mt-1 text-sm font-bold text-slate-900">
                {members.length} Orang
              </p>
              <p className="text-[11px] text-slate-500">
                {members.filter((m) => m.isActive).length} aktif
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <Calendar className="h-3.5 w-3.5 text-purple-600" aria-hidden="true" />
                Tanggal Dibentuk
              </p>
              <p className="mt-1 text-sm font-bold text-slate-900">
                {formatShortIndonesianDate(division.createdAt)}
              </p>
              <p className="text-[11px] text-slate-500">ID Divisi #{division.id}</p>
            </div>
          </div>

          {/* Daftar Anggota */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Daftar Anggota dalam Divisi ({members.length})
            </h4>

            {members.length === 0 ? (
              <div className="mt-3">
                <EmptyState
                  title="Belum ada anggota"
                  description="Gunakan Modul 3 (Anggota Divisi) untuk menempatkan karyawan ke divisi ini."
                />
              </div>
            ) : (
              <div className="mt-2.5 overflow-hidden rounded-xl border border-slate-200">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                    <thead className="bg-slate-50 font-semibold uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-4 py-2.5">Nama &amp; Email</th>
                        <th className="px-4 py-2.5">Role</th>
                        <th className="px-4 py-2.5">Sisa Kuota</th>
                        <th className="px-4 py-2.5 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {members.map((member) => (
                        <tr key={member.id} className="hover:bg-slate-50/70">
                          <td className="whitespace-nowrap px-4 py-2.5">
                            <p className="font-semibold text-slate-900">
                              {member.fullName}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              {member.email}
                            </p>
                          </td>
                          <td className="whitespace-nowrap px-4 py-2.5">
                            <StatusBadge status={member.role} />
                          </td>
                          <td className="whitespace-nowrap px-4 py-2.5 font-semibold text-slate-800">
                            {Number(member.remainingLeaveQuota).toFixed(1)} Hari
                          </td>
                          <td className="whitespace-nowrap px-4 py-2.5 text-right">
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
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-slate-200 bg-slate-50/70 px-5 py-3.5">
          <Link
            href={`/admin/division-members?role=admin&divisionId=${division.id}`}
            onClick={onClose}
            className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-blue-600 transition-colors duration-200 hover:text-blue-700"
          >
            Kelola Anggota Divisi ini di Modul 3
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>

          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-colors duration-200 hover:bg-slate-100"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
