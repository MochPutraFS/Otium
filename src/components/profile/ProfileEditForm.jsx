"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  Info,
  Loader2,
  RotateCcw,
  Save,
  ShieldCheck,
} from "lucide-react";

function buildFormState(profile) {
  return {
    fullName: profile.fullName || "",
    phone: profile.phone || "",
    address: profile.address || "",
    username: profile.username || "",
    email: profile.email || "",
    divisionId:
      profile.divisionId !== null && profile.divisionId !== undefined
        ? String(profile.divisionId)
        : "",
    joinDateIso: profile.joinDateIso || "",
    initialLeaveQuota: String(profile.initialLeaveQuota ?? 12.0),
  };
}

/**
 * Form Tab 1: Informasi Pribadi & Pengaturan Administratif (Khusus Admin).
 * Terhubung langsung ke updateProfileAction (PostgreSQL Raw SQL).
 */
export default function ProfileEditForm({
  profile,
  isAdmin = false,
  divisions = [],
  onSaveProfile,
}) {
  const [formValues, setFormValues] = useState(() => buildFormState(profile));
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

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
        "Format nomor telepon tidak valid (8–20 karakter, gunakan angka, +, atau -).";
    }

    if (isAdmin) {
      if (
        !formValues.username.trim() ||
        !/^[a-zA-Z0-9._-]{3,50}$/.test(formValues.username.trim())
      ) {
        nextErrors.username =
          "Username 3–50 karakter (huruf, angka, titik, garis bawah, atau tanda hubung).";
      }

      if (
        !formValues.email.trim() ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formValues.email.trim())
      ) {
        nextErrors.email = "Format alamat email tidak valid.";
      }

      if (!/^\d{4}-\d{2}-\d{2}$/.test(formValues.joinDateIso)) {
        nextErrors.joinDateIso = "Tanggal bergabung wajib diisi.";
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

  async function handleSubmit(event) {
    event.preventDefault();
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        fullName: formValues.fullName.trim(),
        phone: formValues.phone.trim(),
        address: formValues.address.trim(),
      };

      if (isAdmin) {
        payload.username = formValues.username.trim();
        payload.email = formValues.email.trim();
        payload.divisionId = formValues.divisionId
          ? Number(formValues.divisionId)
          : null;
        payload.joinDateIso = formValues.joinDateIso;
        payload.initialLeaveQuota = Number(formValues.initialLeaveQuota);
      }

      const result = await onSaveProfile(payload);
      if (result && !result.ok && result.fieldErrors) {
        setErrors(result.fieldErrors);
      }
    } finally {
      setIsSaving(false);
    }
  }

  const editableInputClass = (hasError) =>
    `input w-full ${hasError ? "!border-[var(--terracotta)]" : ""}`;

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {/* Bagian 1: Data Pribadi */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--rule)] pb-3">
          <div>
            <h3 className="font-serif text-[19px] font-semibold text-[var(--ink)]">
              Informasi Pribadi
            </h3>
            <p className="mt-0.5 text-[12.5px] text-[var(--ink-soft)]">
              Data kontak dan domisili pribadi yang dapat Anda perbarui kapan
              saja.
            </p>
          </div>
          {isDirty && (
            <span className="tag tag-pending">Ada perubahan belum disimpan</span>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="profile-fullname"
              className="mb-1.5 block font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-[var(--ink-soft)]"
            >
              Nama Lengkap <span className="text-[var(--terracotta)]">*</span>
            </label>
            <input
              id="profile-fullname"
              type="text"
              autoComplete="name"
              required
              value={formValues.fullName}
              onChange={(e) => handleChange("fullName", e.target.value)}
              aria-invalid={Boolean(errors.fullName)}
              aria-describedby={
                errors.fullName ? "profile-fullname-error" : undefined
              }
              placeholder="Masukkan nama lengkap Anda"
              className={editableInputClass(Boolean(errors.fullName))}
            />
            {errors.fullName && (
              <p
                id="profile-fullname-error"
                role="alert"
                className="mt-1.5 flex items-center gap-1 text-[11.5px] font-medium text-[var(--terracotta)]"
              >
                <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {errors.fullName}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="profile-phone"
              className="mb-1.5 block font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-[var(--ink-soft)]"
            >
              Nomor Telepon Aktif
            </label>
            <input
              id="profile-phone"
              type="tel"
              autoComplete="tel"
              value={formValues.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              aria-invalid={Boolean(errors.phone)}
              aria-describedby={errors.phone ? "profile-phone-error" : undefined}
              placeholder="Contoh: 0812-3456-7890"
              className={editableInputClass(Boolean(errors.phone))}
            />
            {errors.phone && (
              <p
                id="profile-phone-error"
                role="alert"
                className="mt-1.5 flex items-center gap-1 text-[11.5px] font-medium text-[var(--terracotta)]"
              >
                <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {errors.phone}
              </p>
            )}
          </div>

          <div className="sm:col-span-2">
            <label
              htmlFor="profile-address"
              className="mb-1.5 block font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-[var(--ink-soft)]"
            >
              Alamat Domisili
            </label>
            <textarea
              id="profile-address"
              rows={3}
              autoComplete="street-address"
              value={formValues.address}
              onChange={(e) => handleChange("address", e.target.value)}
              aria-invalid={Boolean(errors.address)}
              aria-describedby={
                errors.address ? "profile-address-error" : undefined
              }
              placeholder="Tuliskan alamat tempat tinggal Anda saat ini..."
              className={`textarea w-full ${
                errors.address ? "!border-[var(--terracotta)]" : ""
              }`}
            />
            {errors.address && (
              <p
                id="profile-address-error"
                role="alert"
                className="mt-1.5 flex items-center gap-1 text-[11.5px] font-medium text-[var(--terracotta)]"
              >
                <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {errors.address}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Bagian 2: Pengaturan Administratif (Khusus Admin) atau Catatan Ringkas (Non-Admin) */}
      {isAdmin ? (
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--rule)] pb-3">
            <div>
              <h3 className="font-serif text-[19px] font-semibold text-[var(--ink)]">
                Pengaturan Administratif (Khusus Admin)
              </h3>
              <p className="mt-0.5 text-[12.5px] text-[var(--ink-soft)]">
                Perubahan kuota awal akan menyesuaikan sisa kuota secara
                proporsional dalam transaksi atomik.
              </p>
            </div>
            <span className="tag tag-leader">
              <ShieldCheck className="h-3 w-3" aria-hidden="true" />
              Mode Edit Admin
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="profile-username"
                className="mb-1.5 block font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-[var(--ink-soft)]"
              >
                Username <span className="text-[var(--terracotta)]">*</span>
              </label>
              <input
                id="profile-username"
                type="text"
                autoComplete="username"
                required
                value={formValues.username}
                onChange={(e) => handleChange("username", e.target.value)}
                aria-invalid={Boolean(errors.username)}
                aria-describedby={
                  errors.username ? "profile-username-error" : undefined
                }
                className={`${editableInputClass(Boolean(errors.username))} font-mono`}
              />
              {errors.username && (
                <p
                  id="profile-username-error"
                  role="alert"
                  className="mt-1.5 flex items-center gap-1 text-[11.5px] font-medium text-[var(--terracotta)]"
                >
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {errors.username}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="profile-email"
                className="mb-1.5 block font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-[var(--ink-soft)]"
              >
                Email Perusahaan{" "}
                <span className="text-[var(--terracotta)]">*</span>
              </label>
              <input
                id="profile-email"
                type="email"
                autoComplete="email"
                required
                value={formValues.email}
                onChange={(e) => handleChange("email", e.target.value)}
                aria-invalid={Boolean(errors.email)}
                aria-describedby={
                  errors.email ? "profile-email-error" : undefined
                }
                className={editableInputClass(Boolean(errors.email))}
              />
              {errors.email && (
                <p
                  id="profile-email-error"
                  role="alert"
                  className="mt-1.5 flex items-center gap-1 text-[11.5px] font-medium text-[var(--terracotta)]"
                >
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {errors.email}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="profile-division"
                className="mb-1.5 block font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-[var(--ink-soft)]"
              >
                Divisi
              </label>
              <select
                id="profile-division"
                value={formValues.divisionId}
                onChange={(e) => handleChange("divisionId", e.target.value)}
                aria-invalid={Boolean(errors.divisionId)}
                aria-describedby={
                  errors.divisionId ? "profile-division-error" : undefined
                }
                className={`select w-full ${
                  errors.divisionId ? "!border-[var(--terracotta)]" : ""
                }`}
              >
                <option value="">Tidak terikat divisi</option>
                {divisions.map((div) => (
                  <option key={div.id} value={String(div.id)}>
                    {div.name}
                  </option>
                ))}
              </select>
              {errors.divisionId && (
                <p
                  id="profile-division-error"
                  role="alert"
                  className="mt-1.5 flex items-center gap-1 text-[11.5px] font-medium text-[var(--terracotta)]"
                >
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {errors.divisionId}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="profile-joindate"
                className="mb-1.5 block font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-[var(--ink-soft)]"
              >
                Tanggal Bergabung{" "}
                <span className="text-[var(--terracotta)]">*</span>
              </label>
              <input
                id="profile-joindate"
                type="date"
                required
                value={formValues.joinDateIso}
                onChange={(e) => handleChange("joinDateIso", e.target.value)}
                aria-invalid={Boolean(errors.joinDateIso)}
                aria-describedby={
                  errors.joinDateIso ? "profile-joindate-error" : undefined
                }
                className={`${editableInputClass(Boolean(errors.joinDateIso))} font-mono tabular-nums`}
              />
              {errors.joinDateIso && (
                <p
                  id="profile-joindate-error"
                  role="alert"
                  className="mt-1.5 flex items-center gap-1 text-[11.5px] font-medium text-[var(--terracotta)]"
                >
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {errors.joinDateIso}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="profile-quota"
                className="mb-1.5 block font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-[var(--ink-soft)]"
              >
                Kuota Cuti Awal (Hari/Tahun)
              </label>
              <input
                id="profile-quota"
                type="number"
                step="0.5"
                min="0"
                max="60"
                value={formValues.initialLeaveQuota}
                onChange={(e) =>
                  handleChange("initialLeaveQuota", e.target.value)
                }
                aria-invalid={Boolean(errors.initialLeaveQuota)}
                aria-describedby={
                  errors.initialLeaveQuota ? "profile-quota-error" : undefined
                }
                className={`${editableInputClass(
                  Boolean(errors.initialLeaveQuota)
                )} font-mono tabular-nums`}
              />
              {errors.initialLeaveQuota && (
                <p
                  id="profile-quota-error"
                  role="alert"
                  className="mt-1.5 flex items-center gap-1 text-[11.5px] font-medium text-[var(--terracotta)]"
                >
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {errors.initialLeaveQuota}
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="notice notice-info">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p className="leading-relaxed">
            Atribut akun &amp; kepegawaian (Username, Email, Divisi, Tanggal
            Bergabung, dan Kuota Cuti) ditampilkan pada panel kiri dan dikelola
            terpusat oleh Administrator.
          </p>
        </div>
      )}

      {/* Footer Aksi Form */}
      <div className="flex flex-col-reverse items-stretch justify-end gap-2 border-t border-[var(--rule)] pt-4 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={handleReset}
          disabled={!isDirty || isSaving}
          className="btn"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          Reset
        </button>

        <button
          type="submit"
          disabled={!isDirty || isSaving}
          className="btn btn-primary"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              Menyimpan...
            </>
          ) : (
            <>
              <Save className="h-3.5 w-3.5" aria-hidden="true" />
              Simpan Perubahan
            </>
          )}
        </button>
      </div>
    </form>
  );
}
