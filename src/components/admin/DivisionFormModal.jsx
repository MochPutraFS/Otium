"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, Building2, Save, X } from "lucide-react";

// Modal Tambah / Edit Divisi (CMS Modul 2)
// Menegakkan aturan 1 Ketua Divisi maksimal memimpin 1 Divisi aktif.
export default function DivisionFormModal({
  isOpen,
  mode = "create",
  initialDivision = null,
  divisions = [],
  users = [],
  onClose,
  onSubmit,
}) {
  const isEdit = mode === "edit" && Boolean(initialDivision);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [leaderId, setLeaderId] = useState("");
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!isOpen) return;
    if (isEdit && initialDivision) {
      setName(initialDivision.name || "");
      setDescription(initialDivision.description || "");
      setLeaderId(
        initialDivision.leaderId ? String(initialDivision.leaderId) : ""
      );
    } else {
      setName("");
      setDescription("");
      setLeaderId("");
    }
    setErrors({});
  }, [isOpen, isEdit, initialDivision]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(event) {
      if (event.key === "Escape") onClose?.();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Hanya memuat pengguna aktif ber-role 'Ketua Divisi' yang belum memimpin divisi lain
  const availableLeaders = useMemo(() => {
    const busyLeaderIds = new Set(
      divisions
        .filter(
          (d) =>
            d.leaderId !== null &&
            (!isEdit || d.id !== initialDivision?.id)
        )
        .map((d) => d.leaderId)
    );

    return users.filter(
      (u) =>
        u.role === "Ketua Divisi" &&
        u.isActive &&
        !busyLeaderIds.has(u.id)
    );
  }, [divisions, users, isEdit, initialDivision]);

  if (!isOpen) return null;

  function validateForm() {
    const nextErrors = {};
    const trimmedName = name.trim();

    if (trimmedName.length < 2) {
      nextErrors.name = "Nama divisi wajib diisi (minimal 2 karakter).";
    } else {
      const duplicate = divisions.some(
        (d) =>
          d.name.toLowerCase() === trimmedName.toLowerCase() &&
          (!isEdit || d.id !== initialDivision.id)
      );
      if (duplicate) {
        nextErrors.name = "Nama divisi sudah digunakan. Pilih nama lain.";
      }
    }

    if (!leaderId) {
      nextErrors.leaderId =
        "Ketua Divisi wajib dipilih dari kandidat yang tersedia.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!validateForm()) return;

    onSubmit?.({
      id: isEdit ? initialDivision.id : undefined,
      name: name.trim(),
      description: description.trim(),
      leaderId: leaderId ? Number(leaderId) : null,
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="division-form-modal-title"
    >
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/70 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-200">
              <Building2 className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h3
                id="division-form-modal-title"
                className="text-base font-bold text-slate-900"
              >
                {isEdit ? "Edit Data Divisi" : "Buat Divisi Baru"}
              </h3>
              <p className="text-xs text-slate-500">
                1 Ketua Divisi hanya dapat memimpin maksimal 1 divisi aktif.
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

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
          <div>
            <label
              htmlFor="division-name"
              className="block text-xs font-semibold text-slate-700"
            >
              Nama Divisi <span className="text-rose-600">*</span>
            </label>
            <input
              id="division-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Finance & Accounting"
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            {errors.name && (
              <p className="mt-1 text-xs text-rose-600">{errors.name}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="division-desc"
              className="block text-xs font-semibold text-slate-700"
            >
              Deskripsi Singkat{" "}
              <span className="font-normal text-slate-400">(Opsional)</span>
            </label>
            <textarea
              id="division-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Uraikan tanggung jawab utama divisi ini..."
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <label
              htmlFor="division-leader"
              className="block text-xs font-semibold text-slate-700"
            >
              Ketua Divisi <span className="text-rose-600">*</span>
            </label>
            <select
              id="division-leader"
              value={leaderId}
              onChange={(e) => setLeaderId(e.target.value)}
              className="mt-1.5 w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">-- Pilih Kandidat Ketua Divisi --</option>
              {availableLeaders.map((leader) => (
                <option key={leader.id} value={String(leader.id)}>
                  {leader.fullName} ({leader.email})
                  {isEdit && initialDivision?.leaderId === leader.id
                    ? " — Ketua Saat Ini"
                    : " — Tersedia"}
                </option>
              ))}
            </select>
            {errors.leaderId && (
              <p className="mt-1 text-xs text-rose-600">{errors.leaderId}</p>
            )}

            {availableLeaders.length === 0 && (
              <div className="mt-2.5 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                <AlertCircle
                  className="mt-0.5 h-4 w-4 shrink-0 text-amber-600"
                  aria-hidden="true"
                />
                <div>
                  <p className="font-semibold">
                    Belum ada kandidat Ketua Divisi yang bebas tugas.
                  </p>
                  <p className="mt-0.5">
                    Tambahkan akun baru ber-role <em>Ketua Divisi</em> di{" "}
                    <Link
                      href="/admin/users?role=admin"
                      className="font-semibold text-blue-700 underline hover:text-blue-800"
                    >
                      Modul 1 (Manajemen Pengguna)
                    </Link>{" "}
                    terlebih dahulu.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-colors duration-200 hover:bg-slate-100"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={availableLeaders.length === 0}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition-colors duration-200 hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              <Save className="h-3.5 w-3.5" aria-hidden="true" />
              {isEdit ? "Simpan Perubahan" : "Buat Divisi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
