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
    return {
      score: 0,
      label: "Belum diisi",
      barColor: "bg-stone-200",
      textColor: "text-slate-500",
    };
  }

  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password) || password.length >= 12) score += 1;

  if (score <= 1) {
    return {
      score: 1,
      label: "Lemah",
      barColor: "bg-rose-600",
      textColor: "text-rose-700",
    };
  }
  if (score === 2) {
    return {
      score: 2,
      label: "Cukup",
      barColor: "bg-amber-500",
      textColor: "text-amber-700",
    };
  }
  if (score === 3) {
    return {
      score: 3,
      label: "Kuat",
      barColor: "bg-[#1D4ED8]",
      textColor: "text-[#1D4ED8]",
    };
  }
  return {
    score: 4,
    label: "Sangat Kuat",
    barColor: "bg-emerald-600",
    textColor: "text-emerald-700",
  };
}

/**
 * Form Tab 2: Keamanan Password (terhubung langsung ke changePasswordAction + bcryptjs).
 */
export default function PasswordSecurityForm({ onChangePassword }) {
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
  const hasLetterAndNumber =
    /[A-Za-z]/.test(newPassword) && /[0-9]/.test(newPassword);
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

  async function handleSubmit(event) {
    event.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSaving(true);
    try {
      const result = await onChangePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      if (result?.ok) {
        handleReset();
      } else if (result?.fieldErrors) {
        setErrors(result.fieldErrors);
      }
    } finally {
      setIsSaving(false);
    }
  }

  const inputClass = (hasError) =>
    `otium-input w-full rounded-lg border bg-white py-2.5 pl-3.5 pr-11 text-sm text-[#0F172A] transition-colors duration-150 placeholder:text-slate-400 focus-visible:outline-2 focus-visible:outline-offset-2 ${
      hasError
        ? "border-rose-400 focus-visible:outline-rose-600"
        : "border-stone-300 focus:border-[#0F172A] focus-visible:outline-[#0F172A]"
    }`;

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      <div className="border-b border-stone-200 pb-3">
        <h3 className="text-sm font-semibold text-[#0F172A]">
          Perbarui Password Akun
        </h3>
        <p className="mt-0.5 text-xs text-slate-600">
          Gunakan kombinasi huruf dan angka minimal 8 karakter untuk menjaga
          keamanan akun portal cuti Anda.
        </p>
      </div>

      {/* Info keamanan */}
      <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50/70 px-3.5 py-3 text-xs text-amber-900">
        <ShieldAlert
          className="mt-0.5 h-4 w-4 shrink-0 text-amber-700"
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
            Password Saat Ini <span className="text-rose-600">*</span>
          </label>
          <div className="relative">
            <input
              id="security-current-password"
              type={visibility.current ? "text" : "password"}
              autoComplete="current-password"
              required
              value={currentPassword}
              onChange={(e) => {
                setCurrentPassword(e.target.value);
                if (errors.currentPassword) {
                  setErrors((prev) => ({ ...prev, currentPassword: "" }));
                }
              }}
              aria-invalid={Boolean(errors.currentPassword)}
              aria-describedby={
                errors.currentPassword
                  ? "security-current-password-error"
                  : undefined
              }
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
              className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded-md p-1.5 text-slate-500 transition-colors hover:bg-[#F4F2EC] hover:text-[#0F172A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F172A]"
            >
              {visibility.current ? (
                <EyeOff className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Eye className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>
          {errors.currentPassword && (
            <p
              id="security-current-password-error"
              role="alert"
              className="mt-1.5 flex items-center gap-1 text-xs text-rose-700"
            >
              <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
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
            Password Baru <span className="text-rose-600">*</span>
          </label>
          <div className="relative">
            <input
              id="security-new-password"
              type={visibility.next ? "text" : "password"}
              autoComplete="new-password"
              required
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                if (errors.newPassword) {
                  setErrors((prev) => ({ ...prev, newPassword: "" }));
                }
              }}
              aria-invalid={Boolean(errors.newPassword)}
              aria-describedby={
                errors.newPassword
                  ? "security-new-password-error security-password-rules"
                  : "security-password-rules"
              }
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
              className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded-md p-1.5 text-slate-500 transition-colors hover:bg-[#F4F2EC] hover:text-[#0F172A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F172A]"
            >
              {visibility.next ? (
                <EyeOff className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Eye className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>
          {errors.newPassword && (
            <p
              id="security-new-password-error"
              role="alert"
              className="mt-1.5 flex items-center gap-1 text-xs text-rose-700"
            >
              <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {errors.newPassword}
            </p>
          )}

          {/* Indikator Kekuatan Password 4-Segmen */}
          <div
            id="security-password-rules"
            className="mt-3 rounded-lg border border-stone-200 bg-[#F4F2EC]/60 p-3"
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-600">
                Kekuatan Password
              </span>
              <span className={`font-semibold ${strength.textColor}`}>
                {strength.label}
              </span>
            </div>
            <div className="mt-2 grid grid-cols-4 gap-1.5" aria-hidden="true">
              {[1, 2, 3, 4].map((segment) => (
                <div
                  key={segment}
                  className={`h-1.5 rounded-full transition-colors duration-150 ${
                    strength.score >= segment
                      ? strength.barColor
                      : "bg-stone-200"
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
                    rule.ok ? "text-emerald-800" : "text-slate-600"
                  }`}
                >
                  {rule.ok ? (
                    <CheckCircle2
                      className="h-3.5 w-3.5 shrink-0 text-emerald-700"
                      aria-hidden="true"
                    />
                  ) : (
                    <Circle
                      className="h-3.5 w-3.5 shrink-0 text-stone-400"
                      aria-hidden="true"
                    />
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
            Konfirmasi Password Baru <span className="text-rose-600">*</span>
          </label>
          <div className="relative">
            <input
              id="security-confirm-password"
              type={visibility.confirm ? "text" : "password"}
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (errors.confirmPassword) {
                  setErrors((prev) => ({ ...prev, confirmPassword: "" }));
                }
              }}
              aria-invalid={Boolean(errors.confirmPassword)}
              aria-describedby={
                errors.confirmPassword
                  ? "security-confirm-password-error"
                  : undefined
              }
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
              className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded-md p-1.5 text-slate-500 transition-colors hover:bg-[#F4F2EC] hover:text-[#0F172A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F172A]"
            >
              {visibility.confirm ? (
                <EyeOff className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Eye className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>
          {errors.confirmPassword && (
            <p
              id="security-confirm-password-error"
              role="alert"
              className="mt-1.5 flex items-center gap-1 text-xs text-rose-700"
            >
              <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {errors.confirmPassword}
            </p>
          )}
        </div>
      </div>

      {/* Footer Aksi */}
      <div className="flex flex-col-reverse items-stretch justify-end gap-2.5 border-t border-stone-200 pt-4 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={handleReset}
          disabled={!isDirty || isSaving}
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors duration-150 hover:bg-[#F4F2EC] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F172A] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Reset
        </button>

        <button
          type="submit"
          disabled={!isDirty || isSaving}
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#0F172A] px-5 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F172A] disabled:cursor-not-allowed disabled:opacity-50"
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
