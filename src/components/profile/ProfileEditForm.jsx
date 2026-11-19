"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  Loader2,
  Lock,
  RotateCcw,
  Save,
  ShieldCheck,
} from "lucide-react";
import { DIVISION_OPTIONS } from "@/lib/mock-dashboard-data";

function buildFormState(profile) {
  return {
    fullName: profile.fullName || "",
    phone: profile.phone || "",
    address: profile.address || "",
    username: profile.username || "",
    email: profile.email || "",
    role: profile.role || "Karyawan",
    divisionName: profile.divisionName || "",
    joinDateIso: profile.joinDateIso || "2024-01-10",
    initialLeaveQuota: String(profile.initialLeaveQuota ?? 12.0),
  };
}

function formatIsoToDisplayDate(isoDate) {
  if (!isoDate) return "";
  const parsed = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return isoDate;

  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "Mei",
    "Jun",
    "Jul",
    "Agu",
    "Sep",
    "Okt",
    "Nov",
    "Des",
  ];
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${day} ${months[parsed.getMonth()]} ${parsed.getFullYear()}`;
}

// Form Tab 1: Informasi Pribadi & Data Kepegawaian (Adaptif Admin vs Non-Admin)
export default function ProfileEditForm({
  profile,
  isAdmin = false,
  onSaveProfile,
}) {
  const [formValues, setFormValues] = useState(() => buildFormState(profile));
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  // Sinkronkan ulang saat profil/role berubah
  useEffect(() => {
    setFormValues(buildFormState(profile));
    setErrors({});
  }, [profile]);

  const baseline = buildFormState(profile);
  const isDirty = Object.keys(baseline).some(
    (key) => formValues[key] !== baseline[key]
  );

  function handleChange(field, value) {
    setFormValues((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  function handleReset() {
    setFormValues(buildFormState(profile));
    setErrors({});
  }

  function validateForm() {
    const nextErrors = {};

    if (!formValues.fullName.trim() || formValues.fullName.trim().length < 3) {
      nextErrors.fullName = "Nama lengkap wajib diisi minimal 3 karakter.";
    }

    if (
      formValues.phone.trim() &&
      !/^[0-9+\-\s()]{8,20}$/.test(formValues.phone.trim())
    ) {
      nextErrors.phone =
        "Format nomor telepon tidak valid (gunakan angka, tanda +, atau -).";
    }

    if (isAdmin) {
      if (
        !formValues.username.trim() ||
        !/^[a-zA-Z0-9._-]{3,50}$/.test(formValues.username.trim())
      ) {
        nextErrors.username =
          "Username minimal 3 karakter (huruf, angka, titik, garis bawah).";
      }

      if (
        !formValues.email.trim() ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formValues.email.trim())
      ) {
        nextErrors.email = "Format alamat email tidak valid.";
      }

      const parsedQuota = Number(formValues.initialLeaveQuota);
      if (
        Number.isNaN(parsedQuota) ||
        parsedQuota < 0 ||
        parsedQuota > 60 ||
        Math.round(parsedQuota * 2) !== parsedQuota * 2
      ) {
        nextErrors.initialLeaveQuota =
          "Kuota awal harus antara 0 hingga 60 hari (kelipatan 0.5).";
      }
    }

    return nextErrors;
  }

  function handleSubmit(event) {
    event.preventDefault();
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSaving(true);
    // Simulasi jeda penyimpanan lokal (UI-only, tanpa backend)
    setTimeout(() => {
      const updatedFields = {
        fullName: formValues.fullName.trim(),
        phone: formValues.phone.trim(),
        address: formValues.address.trim(),
      };

      if (isAdmin) {
        updatedFields.username = formValues.username.trim();
        updatedFields.email = formValues.email.trim();
        updatedFields.divisionName = formValues.divisionName;
        updatedFields.joinDateIso = formValues.joinDateIso;
        updatedFields.joinDate = formatIsoToDisplayDate(formValues.joinDateIso);
        updatedFields.initialLeaveQuota = Number(formValues.initialLeaveQuota);
      }

      onSaveProfile(updatedFields);
      setIsSaving(false);
    }, 400);
  }

  const readOnlyInputClass =
    "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-500 cursor-not-allowed";
  const editableInputClass = (hasError) =>
    `w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-900 transition focus:outline-none focus:ring-2 ${
      hasError
        ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/20"
        : "border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
    }`;

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {/* Bagian 1: Data Pribadi */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Informasi Pribadi
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Data kontak dan domisili pribadi yang dapat Anda perbarui kapan
              saja.
            </p>
          </div>
          {isDirty && (
            <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
              Ada perubahan belum disimpan
            </span>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="profile-fullname"
              className="mb-1.5 block text-xs font-semibold text-slate-700"
            >
              Nama Lengkap <span className="text-rose-500">*</span>
            </label>
            <input
              id="profile-fullname"
              type="text"
              value={formValues.fullName}
              onChange={(e) => handleChange("fullName", e.target.value)}
              placeholder="Masukkan nama lengkap Anda"
              className={editableInputClass(Boolean(errors.fullName))}
            />
            {errors.fullName && (
              <p className="mt-1.5 flex items-center gap-1 text-xs text-rose-600">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {errors.fullName}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="profile-phone"
              className="mb-1.5 block text-xs font-semibold text-slate-700"
            >
              Nomor Telepon Aktif
            </label>
            <input
              id="profile-phone"
              type="tel"
              value={formValues.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              placeholder="Contoh: 0812-3456-7890"
              className={editableInputClass(Boolean(errors.phone))}
            />
            {errors.phone && (
              <p className="mt-1.5 flex items-center gap-1 text-xs text-rose-600">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {errors.phone}
              </p>
            )}
          </div>

          <div className="sm:col-span-2">
            <label
              htmlFor="profile-address"
              className="mb-1.5 block text-xs font-semibold text-slate-700"
            >
              Alamat Domisili
            </label>
            <textarea
              id="profile-address"
              rows={3}
              value={formValues.address}
              onChange={(e) => handleChange("address", e.target.value)}
              placeholder="Tuliskan alamat tempat tinggal Anda saat ini..."
              className={editableInputClass(false)}
            />
          </div>
        </div>
      </div>

      {/* Bagian 2: Data Kepegawaian & Akun */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Data Kepegawaian &amp; Akun
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              {isAdmin
                ? "Sebagai Administrator, Anda memiliki akses untuk memperbarui seluruh atribut kepegawaian."
                : "Atribut administratif di bawah ini dikelola terpusat oleh Administrator."}
            </p>
          </div>
          {isAdmin ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-2.5 py-0.5 text-xs font-medium text-purple-700">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Mode Edit Admin
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
              <Lock className="h-3 w-3" aria-hidden="true" />
              Read-Only
            </span>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Username */}
          <div>
            <label
              htmlFor="profile-username"
              className="mb-1.5 flex items-center justify-between text-xs font-semibold text-slate-700"
            >
              <span>Username</span>
              {!isAdmin && (
                <Lock className="h-3 w-3 text-slate-400" aria-hidden="true" />
              )}
            </label>
            <input
              id="profile-username"
              type="text"
              value={formValues.username}
              disabled={!isAdmin}
              onChange={(e) => handleChange("username", e.target.value)}
              className={
                isAdmin
                  ? editableInputClass(Boolean(errors.username))
                  : readOnlyInputClass
              }
            />
            {errors.username && (
              <p className="mt-1.5 flex items-center gap-1 text-xs text-rose-600">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {errors.username}
              </p>
            )}
          </div>

          {/* Email */}
          <div>
            <label
              htmlFor="profile-email"
              className="mb-1.5 flex items-center justify-between text-xs font-semibold text-slate-700"
            >
              <span>Email Perusahaan</span>
              {!isAdmin && (
                <Lock className="h-3 w-3 text-slate-400" aria-hidden="true" />
              )}
            </label>
            <input
              id="profile-email"
              type="email"
              value={formValues.email}
              disabled={!isAdmin}
              onChange={(e) => handleChange("email", e.target.value)}
              className={
                isAdmin
                  ? editableInputClass(Boolean(errors.email))
                  : readOnlyInputClass
              }
            />
            {errors.email && (
              <p className="mt-1.5 flex items-center gap-1 text-xs text-rose-600">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {errors.email}
              </p>
            )}
          </div>

          {/* Role */}
          <div>
            <label
              htmlFor="profile-role"
              className="mb-1.5 flex items-center justify-between text-xs font-semibold text-slate-700"
            >
              <span>Peran (Role)</span>
              <Lock className="h-3 w-3 text-slate-400" aria-hidden="true" />
            </label>
            <input
              id="profile-role"
              type="text"
              value={formValues.role}
              disabled
              className={readOnlyInputClass}
            />
          </div>

          {/* Divisi */}
          <div>
            <label
              htmlFor="profile-division"
              className="mb-1.5 flex items-center justify-between text-xs font-semibold text-slate-700"
            >
              <span>Divisi</span>
              {!isAdmin && (
                <Lock className="h-3 w-3 text-slate-400" aria-hidden="true" />
              )}
            </label>
            {isAdmin ? (
              <select
                id="profile-division"
                value={formValues.divisionName}
                onChange={(e) => handleChange("divisionName", e.target.value)}
                className={editableInputClass(false)}
              >
                {DIVISION_OPTIONS.map((div) => (
                  <option key={div} value={div}>
                    {div}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id="profile-division"
                type="text"
                value={formValues.divisionName || "Belum ditentukan"}
                disabled
                className={readOnlyInputClass}
              />
            )}
          </div>

          {/* Tanggal Bergabung */}
          <div>
            <label
              htmlFor="profile-joindate"
              className="mb-1.5 flex items-center justify-between text-xs font-semibold text-slate-700"
            >
              <span>Tanggal Bergabung</span>
              {!isAdmin && (
                <Lock className="h-3 w-3 text-slate-400" aria-hidden="true" />
              )}
            </label>
            {isAdmin ? (
              <input
                id="profile-joindate"
                type="date"
                value={formValues.joinDateIso}
                onChange={(e) => handleChange("joinDateIso", e.target.value)}
                className={editableInputClass(false)}
              />
            ) : (
              <input
                id="profile-joindate"
                type="text"
                value={profile.joinDate}
                disabled
                className={readOnlyInputClass}
              />
            )}
          </div>

          {/* Kuota Cuti Awal */}
          <div>
            <label
              htmlFor="profile-quota"
              className="mb-1.5 flex items-center justify-between text-xs font-semibold text-slate-700"
            >
              <span>Kuota Cuti Awal (Hari/Tahun)</span>
              {!isAdmin && (
                <Lock className="h-3 w-3 text-slate-400" aria-hidden="true" />
              )}
            </label>
            <input
              id="profile-quota"
              type={isAdmin ? "number" : "text"}
              step="0.5"
              min="0"
              max="60"
              value={
                isAdmin
                  ? formValues.initialLeaveQuota
                  : `${Number(profile.initialLeaveQuota ?? 12).toFixed(1)} Hari`
              }
              disabled={!isAdmin}
              onChange={(e) =>
                handleChange("initialLeaveQuota", e.target.value)
              }
              className={
                isAdmin
                  ? editableInputClass(Boolean(errors.initialLeaveQuota))
                  : readOnlyInputClass
              }
            />
            {errors.initialLeaveQuota && (
              <p className="mt-1.5 flex items-center gap-1 text-xs text-rose-600">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {errors.initialLeaveQuota}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Footer Aksi Form */}
      <div className="flex flex-col-reverse items-stretch justify-end gap-2.5 border-t border-slate-100 pt-4 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={handleReset}
          disabled={!isDirty || isSaving}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Reset
        </button>

        <button
          type="submit"
          disabled={!isDirty || isSaving}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Menyimpan...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" aria-hidden="true" />
              Simpan Perubahan
            </>
          )}
        </button>
      </div>
    </form>
  );
}
