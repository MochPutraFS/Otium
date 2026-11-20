"use client";

import { useEffect, useMemo, useState } from "react";
import { Save, SlidersHorizontal, Sparkles, X } from "lucide-react";
import { buildLeaveTypeRuleSummary } from "@/lib/mock-admin-data";

// Modal Tambah / Edit Jenis Cuti Dinamis (CMS Modul 4)
export default function LeaveTypeFormModal({
  isOpen,
  mode = "create",
  initialLeaveType = null,
  existingLeaveTypes = [],
  onClose,
  onSubmit,
}) {
  const isEdit = mode === "edit" && Boolean(initialLeaveType);

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [maxQuota, setMaxQuota] = useState("3.0");
  const [minSubmissionDays, setMinSubmissionDays] = useState("0");
  const [requiresAttachment, setRequiresAttachment] = useState(false);
  const [deductsAnnualQuota, setDeductsAnnualQuota] = useState(false);
  const [requiresMinOneYearTenure, setRequiresMinOneYearTenure] =
    useState(false);
  const [isActive, setIsActive] = useState(true);
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!isOpen) return;
    if (isEdit && initialLeaveType) {
      setCode(initialLeaveType.code || "");
      setName(initialLeaveType.name || "");
      setMaxQuota(Number(initialLeaveType.maxQuota ?? 1).toFixed(1));
      setMinSubmissionDays(String(initialLeaveType.minSubmissionDays ?? 0));
      setRequiresAttachment(Boolean(initialLeaveType.requiresAttachment));
      setDeductsAnnualQuota(Boolean(initialLeaveType.deductsAnnualQuota));
      setRequiresMinOneYearTenure(
        Boolean(initialLeaveType.requiresMinOneYearTenure)
      );
      setIsActive(Boolean(initialLeaveType.isActive));
      setDescription(initialLeaveType.description || "");
    } else {
      setCode("");
      setName("");
      setMaxQuota("3.0");
      setMinSubmissionDays("0");
      setRequiresAttachment(false);
      setDeductsAnnualQuota(false);
      setRequiresMinOneYearTenure(false);
      setIsActive(true);
      setDescription("");
    }
    setErrors({});
  }, [isOpen, isEdit, initialLeaveType]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(event) {
      if (event.key === "Escape") onClose?.();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const rulePreview = useMemo(
    () =>
      buildLeaveTypeRuleSummary({
        minSubmissionDays: Number(minSubmissionDays || 0),
        requiresAttachment,
        deductsAnnualQuota,
        requiresMinOneYearTenure,
      }),
    [
      minSubmissionDays,
      requiresAttachment,
      deductsAnnualQuota,
      requiresMinOneYearTenure,
    ]
  );

  if (!isOpen) return null;

  function validateForm() {
    const nextErrors = {};
    const normalizedCode = code.trim().toUpperCase();
    const trimmedName = name.trim();

    if (!normalizedCode || !/^[A-Z0-9_]{2,24}$/.test(normalizedCode)) {
      nextErrors.code =
        "Kode wajib 2–24 karakter huruf kapital, angka, atau underscore (mis. MARRIAGE).";
    } else {
      const dupCode = existingLeaveTypes.some(
        (lt) =>
          lt.code.toUpperCase() === normalizedCode &&
          (!isEdit || lt.id !== initialLeaveType.id)
      );
      if (dupCode) {
        nextErrors.code = "Kode jenis cuti sudah digunakan.";
      }
    }

    if (trimmedName.length < 3) {
      nextErrors.name = "Nama jenis cuti minimal 3 karakter.";
    } else {
      const dupName = existingLeaveTypes.some(
        (lt) =>
          lt.name.toLowerCase() === trimmedName.toLowerCase() &&
          (!isEdit || lt.id !== initialLeaveType.id)
      );
      if (dupName) {
        nextErrors.name = "Nama jenis cuti sudah terdaftar.";
      }
    }

    const parsedQuota = Number(maxQuota);
    if (Number.isNaN(parsedQuota) || parsedQuota <= 0 || parsedQuota > 365) {
      nextErrors.maxQuota = "Kuota maksimal harus > 0 (kelipatan 0.5).";
    } else if (Math.round(parsedQuota * 2) !== parsedQuota * 2) {
      nextErrors.maxQuota = "Kuota harus kelipatan 0.5 hari.";
    }

    const parsedLead = Number(minSubmissionDays);
    if (
      minSubmissionDays === "" ||
      Number.isNaN(parsedLead) ||
      !Number.isInteger(parsedLead) ||
      parsedLead < -30 ||
      parsedLead > 90
    ) {
      nextErrors.minSubmissionDays =
        "Batas waktu pengajuan harus bilangan bulat (-30 s.d. 90).";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!validateForm()) return;

    onSubmit?.({
      id: isEdit ? initialLeaveType.id : undefined,
      code: code.trim().toUpperCase(),
      name: name.trim(),
      maxQuota: Number(maxQuota),
      minSubmissionDays: Number(minSubmissionDays),
      requiresAttachment,
      deductsAnnualQuota,
      requiresMinOneYearTenure,
      isActive,
      description: description.trim(),
    });
  }

  const toggleItems = [
    {
      id: "toggle-attachment",
      checked: requiresAttachment,
      onChange: setRequiresAttachment,
      title: "Wajib Upload Lampiran Dokumen / Surat Bukti",
      subtitle: "Kolom requires_attachment — wajib unggah PDF/JPG/PNG saat pengajuan.",
    },
    {
      id: "toggle-deduct",
      checked: deductsAnnualQuota,
      onChange: setDeductsAnnualQuota,
      title: "Memotong Saldo Kuota Cuti Tahunan Utama (12 Hari)",
      subtitle: "Kolom deducts_annual_quota — mengurangi remaining_leave_quota saat submit.",
    },
    {
      id: "toggle-tenure",
      checked: requiresMinOneYearTenure,
      onChange: setRequiresMinOneYearTenure,
      title: "Wajib Masa Kerja Minimal 1 Tahun",
      subtitle:
        "Kolom requires_min_one_year_tenure — memblokir karyawan masa kerja < 1 tahun.",
    },
    {
      id: "toggle-active",
      checked: isActive,
      onChange: setIsActive,
      title: "Status Jenis Cuti Aktif",
      subtitle: "Jika nonaktif, jenis cuti disembunyikan dari dropdown Form Pengajuan.",
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="leave-type-form-modal-title"
    >
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/70 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-200">
              <SlidersHorizontal className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h3
                id="leave-type-form-modal-title"
                className="text-base font-bold text-slate-900"
              >
                {isEdit ? "Ubah Jenis Cuti Dinamis" : "Tambah Jenis Cuti Baru"}
              </h3>
              <p className="text-xs text-slate-500">
                Konfigurasi aturan jenis cuti tersimpan dinamis di tabel{" "}
                <code>leave_types</code> tanpa hardcode.
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

        {/* Form Body */}
        <form
          id="admin-leave-type-form"
          onSubmit={handleSubmit}
          className="flex-1 space-y-4 overflow-y-auto px-5 py-5"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="lt-code"
                className="block text-xs font-semibold text-slate-700"
              >
                Kode Unik Jenis Cuti <span className="text-rose-600">*</span>
              </label>
              <input
                id="lt-code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Contoh: MARRIAGE"
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 font-mono text-sm uppercase text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              {errors.code && (
                <p className="mt-1 text-xs text-rose-600">{errors.code}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="lt-name"
                className="block text-xs font-semibold text-slate-700"
              >
                Nama Jenis Cuti <span className="text-rose-600">*</span>
              </label>
              <input
                id="lt-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Cuti Menikah"
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              {errors.name && (
                <p className="mt-1 text-xs text-rose-600">{errors.name}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="lt-quota"
                className="block text-xs font-semibold text-slate-700"
              >
                Jumlah Kuota Maksimal (Hari){" "}
                <span className="text-rose-600">*</span>
              </label>
              <input
                id="lt-quota"
                type="number"
                step="0.5"
                min="0.5"
                max="365"
                value={maxQuota}
                onChange={(e) => setMaxQuota(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              {errors.maxQuota && (
                <p className="mt-1 text-xs text-rose-600">{errors.maxQuota}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="lt-leadtime"
                className="block text-xs font-semibold text-slate-700"
              >
                Batas Waktu Pengajuan (Hari Kalender){" "}
                <span className="text-rose-600">*</span>
              </label>
              <input
                id="lt-leadtime"
                type="number"
                step="1"
                min="-30"
                max="90"
                value={minSubmissionDays}
                onChange={(e) => setMinSubmissionDays(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Positif = Min. H-n (mis. <code>3</code>), <code>0</code> = H-0,
                Negatif = Maks. H+n (mis. <code>-3</code>).
              </p>
              {errors.minSubmissionDays && (
                <p className="mt-1 text-xs text-rose-600">
                  {errors.minSubmissionDays}
                </p>
              )}
            </div>
          </div>

          {/* Business Rules Toggles */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Pengaturan Aturan Bisnis (Business Rules)
            </p>
            <div className="mt-2 space-y-2">
              {toggleItems.map((item) => (
                <label
                  key={item.id}
                  htmlFor={item.id}
                  className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 transition-colors duration-150 hover:bg-slate-100/70"
                >
                  <input
                    id={item.id}
                    type="checkbox"
                    checked={item.checked}
                    onChange={(e) => item.onChange(e.target.checked)}
                    className="mt-0.5 h-4 w-4 cursor-pointer rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <p className="text-xs font-semibold text-slate-900">
                      {item.title}
                    </p>
                    <p className="text-[11px] text-slate-500">{item.subtitle}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Live Rule Summary Preview */}
          <div className="flex items-start gap-2.5 rounded-xl border border-sky-200 bg-sky-50/80 p-3 text-xs text-sky-900">
            <Sparkles
              className="mt-0.5 h-4 w-4 shrink-0 text-sky-600"
              aria-hidden="true"
            />
            <div>
              <p className="font-semibold">
                Pratinjau Ringkasan Aturan di Form Pemohon:
              </p>
              <p className="mt-0.5 font-medium text-sky-800">{rulePreview}</p>
            </div>
          </div>

          {/* Deskripsi */}
          <div>
            <label
              htmlFor="lt-description"
              className="block text-xs font-semibold text-slate-700"
            >
              Deskripsi / Panduan Pemohon{" "}
              <span className="font-normal text-slate-400">(Opsional)</span>
            </label>
            <textarea
              id="lt-description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tuliskan persyaratan dokumen atau panduan pengajuan jenis cuti ini..."
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 border-t border-slate-200 bg-slate-50/70 px-5 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-colors duration-200 hover:bg-slate-100"
          >
            Batal
          </button>
          <button
            type="submit"
            form="admin-leave-type-form"
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition-colors duration-200 hover:bg-blue-700"
          >
            <Save className="h-3.5 w-3.5" aria-hidden="true" />
            {isEdit ? "Simpan Perubahan" : "Simpan Jenis Cuti"}
          </button>
        </div>
      </div>
    </div>
  );
}
