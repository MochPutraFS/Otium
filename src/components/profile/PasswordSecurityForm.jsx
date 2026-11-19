"use client";

import { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Circle,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  RotateCcw,
  ShieldAlert,
} from "lucide-react";

function evaluatePasswordStrength(password) {
  if (!password) {
    return { score: 0, label: "Belum diisi", barColor: "bg-slate-200", textColor: "text-slate-400" };
  }

  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password) || password.length >= 12) score += 1;

  if (score <= 1) {
    return { score: 1, label: "Lemah", barColor: "bg-rose-500", textColor: "text-rose-600" };
  }
  if (score === 2) {
    return { score: 2, label: "Cukup", barColor: "bg-amber-500", textColor: "text-amber-600" };
  }
  if (score === 3) {
    return { score: 3, label: "Kuat", barColor: "bg-sky-500", textColor: "text-sky-600" };
  }
  return { score: 4, label: "Sangat Kuat", barColor: "bg-emerald-500", textColor: "text-emerald-600" };
}

// Form Tab 2: Keamanan Password (3 field + toggle show/hide + strength meter)
export default function PasswordSecurityForm({ onPasswordSaved }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [visibility, setVisibility] = useState({
    current: false,
    next: false,
    confirm: false,
  });
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const strength = evaluatePasswordStrength(newPassword);
  const hasMinLength = newPassword.length >= 8;
  const hasLetterAndNumber = /[A-Za-z]/.test(newPassword) && /[0-9]/.test(newPassword);
  const isDifferentFromCurrent =
    newPassword.length > 0 && newPassword !== currentPassword;
  const isMatchConfirm =
    confirmPassword.length > 0 && newPassword === confirmPassword;

  const isDirty = Boolean(currentPassword || newPassword || confirmPassword);

  function toggleFieldVisibility(key) {
    setVisibility((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function handleReset() {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setErrors({});
  }

  function validate() {
    const nextErrors = {};

    if (!currentPassword.trim()) {
      nextErrors.currentPassword = "Password saat ini wajib diisi.";
    }

    if (!newPassword) {
      nextErrors.newPassword = "Password baru wajib diisi.";
    } else if (newPassword.length < 8) {
      nextErrors.newPassword = "Password baru minimal 8 karakter.";
    } else if (!hasLetterAndNumber) {
      nextErrors.newPassword =
        "Password baru harus mengandung kombinasi huruf dan angka.";
    } else if (newPassword === currentPassword) {
      nextErrors.newPassword =
        "Password baru tidak boleh sama dengan password saat ini.";
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = "Konfirmasi password baru wajib diisi.";
    } else if (confirmPassword !== newPassword) {
      nextErrors.confirmPassword = "Konfirmasi password tidak cocok.";
    }

    return nextErrors;
  }

  function handleSubmit(event) {
    event.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      handleReset();
      onPasswordSaved();
    }, 400);
  }

  const inputClass = (hasError) =>
    `w-full rounded-xl border bg-white py-2.5 pl-3.5 pr-11 text-sm text-slate-900 transition focus:outline-none focus:ring-2 ${
      hasError
        ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/20"
        : "border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
    }`;

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      <div className="border-b border-slate-100 pb-3">
        <h3 className="text-sm font-semibold text-slate-900">
          Perbarui Password Akun
        </h3>
        <p className="mt-0.5 text-xs text-slate-500">
          Gunakan kombinasi huruf dan angka minimal 8 karakter untuk menjaga
          keamanan akun portal cuti Anda.
        </p>
      </div>

      {/* Info keamanan */}
      <div className="flex items-start gap-2.5 rounded-xl border border-amber-200/80 bg-amber-50/70 px-3.5 py-3 text-xs text-amber-800">
        <ShieldAlert
          className="mt-0.5 h-4 w-4 shrink-0 text-amber-600"
          aria-hidden="true"
        />
        <p className="leading-relaxed">
          Gunakan password unik yang tidak dipakai di layanan lain dan jangan
          bagikan kredensial akun Anda kepada siapa pun.
        </p>
      </div>

      <div className="space-y-4">
        {/* Password Saat Ini */}
        <div>
          <label
            htmlFor="security-current-password"
            className="mb-1.5 block text-xs font-semibold text-slate-700"
          >
            Password Saat Ini <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <input
              id="security-current-password"
              type={visibility.current ? "text" : "password"}
              value={currentPassword}
              onChange={(e) => {
                setCurrentPassword(e.target.value);
                if (errors.currentPassword) {
                  setErrors((prev) => ({ ...prev, currentPassword: "" }));
                }
              }}
              placeholder="Masukkan password Anda saat ini"
              className={inputClass(Boolean(errors.currentPassword))}
            />
            <button
              type="button"
              onClick={() => toggleFieldVisibility("current")}
              aria-label={
                visibility.current
                  ? "Sembunyikan password saat ini"
                  : "Tampilkan password saat ini"
              }
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            >
              {visibility.current ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {errors.currentPassword && (
            <p className="mt-1.5 flex items-center gap-1 text-xs text-rose-600">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {errors.currentPassword}
            </p>
          )}
        </div>

        {/* Password Baru */}
        <div>
          <label
            htmlFor="security-new-password"
            className="mb-1.5 block text-xs font-semibold text-slate-700"
          >
            Password Baru <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <input
              id="security-new-password"
              type={visibility.next ? "text" : "password"}
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                if (errors.newPassword) {
                  setErrors((prev) => ({ ...prev, newPassword: "" }));
                }
              }}
              placeholder="Minimal 8 karakter (kombinasi huruf & angka)"
              className={inputClass(Boolean(errors.newPassword))}
            />
            <button
              type="button"
              onClick={() => toggleFieldVisibility("next")}
              aria-label={
                visibility.next
                  ? "Sembunyikan password baru"
                  : "Tampilkan password baru"
              }
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            >
              {visibility.next ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {errors.newPassword && (
            <p className="mt-1.5 flex items-center gap-1 text-xs text-rose-600">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {errors.newPassword}
            </p>
          )}

          {/* Indikator Kekuatan Password 4-Segmen */}
          <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-500">
                Kekuatan Password
              </span>
              <span className={`font-semibold ${strength.textColor}`}>
                {strength.label}
              </span>
            </div>
            <div className="mt-2 grid grid-cols-4 gap-1.5">
              {[1, 2, 3, 4].map((segment) => (
                <div
                  key={segment}
                  className={`h-1.5 rounded-full transition-colors ${
                    strength.score >= segment
                      ? strength.barColor
                      : "bg-slate-200"
                  }`}
                />
              ))}
            </div>

            {/* Checklist Syarat */}
            <ul className="mt-3 grid grid-cols-1 gap-1.5 text-xs sm:grid-cols-2">
              {[
                { ok: hasMinLength, text: "Minimal 8 karakter" },
                { ok: hasLetterAndNumber, text: "Kombinasi huruf & angka" },
                {
                  ok: isDifferentFromCurrent,
                  text: "Berbeda dari password lama",
                },
                { ok: isMatchConfirm, text: "Konfirmasi password cocok" },
              ].map((rule) => (
                <li
                  key={rule.text}
                  className={`flex items-center gap-1.5 ${
                    rule.ok ? "text-emerald-700" : "text-slate-500"
                  }`}
                >
                  {rule.ok ? (
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                  ) : (
                    <Circle className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                  )}
                  <span>{rule.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Konfirmasi Password Baru */}
        <div>
          <label
            htmlFor="security-confirm-password"
            className="mb-1.5 block text-xs font-semibold text-slate-700"
          >
            Konfirmasi Password Baru <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <input
              id="security-confirm-password"
              type={visibility.confirm ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (errors.confirmPassword) {
                  setErrors((prev) => ({ ...prev, confirmPassword: "" }));
                }
              }}
              placeholder="Ketik ulang password baru Anda"
              className={inputClass(Boolean(errors.confirmPassword))}
            />
            <button
              type="button"
              onClick={() => toggleFieldVisibility("confirm")}
              aria-label={
                visibility.confirm
                  ? "Sembunyikan konfirmasi password"
                  : "Tampilkan konfirmasi password"
              }
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            >
              {visibility.confirm ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="mt-1.5 flex items-center gap-1 text-xs text-rose-600">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {errors.confirmPassword}
            </p>
          )}
        </div>
      </div>

      {/* Footer Aksi */}
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
              Memperbarui...
            </>
          ) : (
            <>
              <KeyRound className="h-4 w-4" aria-hidden="true" />
              Perbarui Password
            </>
          )}
        </button>
      </div>
    </form>
  );
}
