"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
} from "lucide-react";
import { loginAction } from "@/actions/auth-actions";

const REASON_BANNERS = {
  session_expired: {
    tone: "amber",
    message: "Sesi masuk Anda telah berakhir. Silakan login kembali.",
  },
  logged_out: {
    tone: "emerald",
    message: "Anda telah berhasil keluar dari portal Otium.",
  },
  inactive: {
    tone: "rose",
    message: "Akun Anda berstatus Nonaktif. Silakan hubungi Administrator.",
  },
};

function validateIdentifier(value) {
  const trimmed = value.trim();
  if (!trimmed) return "Email atau Username wajib diisi.";
  if (trimmed.length > 100) return "Email atau Username maksimal 100 karakter.";
  return "";
}

function validatePassword(value) {
  if (!value) return "Password wajib diisi.";
  if (value.length > 128) return "Password maksimal 128 karakter.";
  return "";
}

/**
 * Form Login terpusat (Pure Production) untuk portal Otium (4 role: Admin, Karyawan, Ketua Divisi, HRD).
 * Terhubung eksklusif ke Server Action `loginAction`, menerapkan praktik terbaik modern-web-guidance:
 * - autofill-sign-in-form & autofill-highlight-inputs (autocomplete, spellCheck, autoCorrect, autoCapitalize, enterKeyHint, :autofill)
 * - validate-input-after-interaction & accessible-error-announcement (blur validation, focus-first-invalid, 500ms polite live region)
 * - brand-consistent-forms (native checkbox dengan accent-color + fallback @supports not)
 */
export default function LoginFormCard({ callbackUrl = "", reason = "" }) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isCapsLockOn, setIsCapsLockOn] = useState(false);
  const [touched, setTouched] = useState({
    identifier: false,
    password: false,
  });
  const [fieldErrors, setFieldErrors] = useState({
    identifier: "",
    password: "",
  });
  const [errorMsg, setErrorMsg] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const identifierRef = useRef(null);
  const passwordRef = useRef(null);
  const announceTimerRef = useRef(null);

  const statusBanner = REASON_BANNERS[reason] || null;

  useEffect(() => {
    return () => {
      if (announceTimerRef.current) {
        clearTimeout(announceTimerRef.current);
      }
    };
  }, []);

  function clearAnnouncement() {
    if (announceTimerRef.current) {
      clearTimeout(announceTimerRef.current);
      announceTimerRef.current = null;
    }
    setAnnouncement("");
  }

  function announceFieldError(label, message) {
    clearAnnouncement();
    if (!message) return;

    // Jeda 500ms agar tidak menimpa pengumuman fokus field berikutnya pada screen reader
    announceTimerRef.current = setTimeout(() => {
      setAnnouncement(`${label}: ${message}`);
    }, 500);
  }

  function handleIdentifierChange(e) {
    const nextValue = e.target.value;
    setIdentifier(nextValue);
    if (touched.identifier || fieldErrors.identifier) {
      const nextErr = validateIdentifier(nextValue);
      setFieldErrors((prev) => ({ ...prev, identifier: nextErr }));
      if (!nextErr) {
        clearAnnouncement();
      }
    }
    if (errorMsg) setErrorMsg("");
  }

  function handleIdentifierBlur() {
    setTouched((prev) => ({ ...prev, identifier: true }));
    const err = validateIdentifier(identifier);
    setFieldErrors((prev) => ({ ...prev, identifier: err }));
    if (err) {
      announceFieldError("Email atau Username", err);
    } else {
      clearAnnouncement();
    }
  }

  function handlePasswordChange(e) {
    const nextValue = e.target.value;
    setPassword(nextValue);
    if (touched.password || fieldErrors.password) {
      const nextErr = validatePassword(nextValue);
      setFieldErrors((prev) => ({ ...prev, password: nextErr }));
      if (!nextErr) {
        clearAnnouncement();
      }
    }
    if (errorMsg) setErrorMsg("");
  }

  function handlePasswordKeyEvent(e) {
    if (typeof e.getModifierState === "function") {
      setIsCapsLockOn(Boolean(e.getModifierState("CapsLock")));
    }
  }

  function handlePasswordBlur() {
    setIsCapsLockOn(false);
    setTouched((prev) => ({ ...prev, password: true }));
    const err = validatePassword(password);
    setFieldErrors((prev) => ({ ...prev, password: err }));
    if (err) {
      announceFieldError("Password", err);
    } else {
      clearAnnouncement();
    }
  }

  function focusFirstInvalid(errors) {
    if (errors?.identifier) {
      identifierRef.current?.focus();
    } else if (errors?.password) {
      passwordRef.current?.focus();
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg("");
    clearAnnouncement();

    const nextFieldErrors = {
      identifier: validateIdentifier(identifier),
      password: validatePassword(password),
    };

    if (nextFieldErrors.identifier || nextFieldErrors.password) {
      setTouched({ identifier: true, password: true });
      setFieldErrors(nextFieldErrors);
      focusFirstInvalid(nextFieldErrors);
      return;
    }

    setFieldErrors({ identifier: "", password: "" });
    setIsLoading(true);

    try {
      const payload = {
        identifier: identifier.trim(),
        password,
        rememberMe,
        callbackUrl,
      };

      const result = await loginAction(payload);

      if (result?.fieldErrors) {
        setTouched({ identifier: true, password: true });
        setFieldErrors((prev) => ({ ...prev, ...result.fieldErrors }));
        focusFirstInvalid(result.fieldErrors);
      }
      if (result?.error) {
        setErrorMsg(result.error);
      }
    } catch (error) {
      // Biarkan redirect bawaan Next.js Server Action berjalan normal
      if (error?.digest?.startsWith("NEXT_REDIRECT")) {
        throw error;
      }
      setErrorMsg("Terjadi kesalahan tak terduga. Silakan coba kembali.");
    } finally {
      setIsLoading(false);
    }
  }

  const passwordDescribedBy = [
    fieldErrors.password ? "password-error" : null,
    isCapsLockOn ? "password-capslock-notice" : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="w-full max-w-[400px] rounded-2xl border border-stone-200/90 bg-white p-6 shadow-sm sm:p-8 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
      {/* Live region sopan untuk pengumuman error blur bagi screen reader */}
      <div role="status" aria-live="polite" className="visually-hidden">
        {announcement}
      </div>

      {/* Header Identitas Mobile/Tablet */}
      <div className="mb-7 flex items-center gap-3 lg:hidden">
        <img
          src="/images/otium-logo.svg"
          alt="Logo Otium"
          className="h-9 w-9 shrink-0 object-contain"
        />
        <div>
          <span className="block text-lg font-bold leading-none tracking-tight text-slate-950">
            Otium
          </span>
          <span className="mt-1 block text-[11px] font-medium uppercase tracking-[0.12em] text-slate-600">
            Sistem Manajemen Cuti
          </span>
        </div>
      </div>

      {/* Heading Form */}
      <div>
        <p className="hidden text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600 lg:block">
          Portal Internal &middot; Otium
        </p>
        <h1 className="text-2xl font-semibold tracking-[-0.02em] text-slate-950 lg:mt-2 lg:text-[1.75rem]">
          Masuk ke ruang kerja
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
          Masukkan email atau username perusahaan beserta kata sandi Anda.
        </p>
      </div>

      {/* Banner Status dari Query Param (session_expired / logged_out / inactive) */}
      {statusBanner && !errorMsg && (
        <div
          role="status"
          className={`mt-5 flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-sm ${
            statusBanner.tone === "amber"
              ? "border-amber-200 bg-amber-50 text-amber-900"
              : statusBanner.tone === "emerald"
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          {statusBanner.tone === "emerald" ? (
            <CheckCircle2
              className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700"
              aria-hidden="true"
            />
          ) : (
            <AlertCircle
              className={`mt-0.5 h-4 w-4 shrink-0 ${
                statusBanner.tone === "amber"
                  ? "text-amber-700"
                  : "text-rose-700"
              }`}
              aria-hidden="true"
            />
          )}
          <span>{statusBanner.message}</span>
        </div>
      )}

      {/* Alert Error Kredensial / Akun Nonaktif */}
      {errorMsg && (
        <div
          role="alert"
          className="mt-5 flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-800"
        >
          <AlertCircle
            className="mt-0.5 h-4 w-4 shrink-0 text-rose-700"
            aria-hidden="true"
          />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Form Kredensial */}
      <form onSubmit={handleSubmit} className="mt-7 space-y-5" noValidate>
        {/* Field Email atau Username */}
        <div>
          <label
            htmlFor="identifier"
            className="block text-sm font-medium text-slate-800"
          >
            Email atau Username
          </label>
          <div className="relative mt-1.5">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
              <Mail className="h-4 w-4" aria-hidden="true" />
            </span>
            <input
              ref={identifierRef}
              id="identifier"
              name="identifier"
              type="text"
              autoComplete="username"
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="none"
              enterKeyHint="next"
              maxLength={100}
              required
              disabled={isLoading}
              aria-invalid={fieldErrors.identifier ? "true" : "false"}
              aria-describedby={
                fieldErrors.identifier ? "identifier-error" : undefined
              }
              value={identifier}
              onChange={handleIdentifierChange}
              onBlur={handleIdentifierBlur}
              placeholder="nama@perusahaan.com atau username"
              className={`otium-input block w-full rounded-lg border bg-white py-2.5 pl-10 pr-3.5 text-sm text-slate-950 placeholder:text-slate-500 transition-colors duration-150 focus:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:bg-slate-100 ${
                fieldErrors.identifier
                  ? "border-rose-500 bg-rose-50/40 focus-visible:border-rose-600 focus-visible:ring-rose-500/20"
                  : "border-slate-300 hover:border-slate-400 focus-visible:border-slate-900 focus-visible:ring-slate-900/15"
              }`}
            />
          </div>
          {fieldErrors.identifier && (
            <p
              id="identifier-error"
              className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-rose-700"
            >
              <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{fieldErrors.identifier}</span>
            </p>
          )}
        </div>

        {/* Field Password */}
        <div>
          <div className="flex items-center justify-between gap-2">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-slate-800"
            >
              Password
            </label>
            {isCapsLockOn && (
              <span
                id="password-capslock-notice"
                className="inline-flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-800"
              >
                <AlertCircle className="h-3 w-3 shrink-0" aria-hidden="true" />
                Caps Lock aktif
              </span>
            )}
          </div>
          <div className="relative mt-1.5">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
              <Lock className="h-4 w-4" aria-hidden="true" />
            </span>
            <input
              ref={passwordRef}
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              enterKeyHint="done"
              maxLength={128}
              required
              disabled={isLoading}
              aria-invalid={fieldErrors.password ? "true" : "false"}
              aria-describedby={passwordDescribedBy || undefined}
              value={password}
              onChange={handlePasswordChange}
              onKeyDown={handlePasswordKeyEvent}
              onKeyUp={handlePasswordKeyEvent}
              onBlur={handlePasswordBlur}
              placeholder="Masukkan password Anda"
              className={`otium-input block w-full rounded-lg border bg-white py-2.5 pl-10 pr-11 text-sm text-slate-950 placeholder:text-slate-500 transition-colors duration-150 focus:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:bg-slate-100 ${
                fieldErrors.password
                  ? "border-rose-500 bg-rose-50/40 focus-visible:border-rose-600 focus-visible:ring-rose-500/20"
                  : "border-slate-300 hover:border-slate-400 focus-visible:border-slate-900 focus-visible:ring-slate-900/15"
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              disabled={isLoading}
              aria-controls="password"
              aria-pressed={showPassword}
              aria-label={
                showPassword ? "Sembunyikan password" : "Tampilkan password"
              }
              className="absolute inset-y-0 right-1 my-1 flex w-9 cursor-pointer items-center justify-center rounded-md text-slate-600 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 disabled:cursor-not-allowed"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Eye className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>
          {fieldErrors.password && (
            <p
              id="password-error"
              className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-rose-700"
            >
              <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{fieldErrors.password}</span>
            </p>
          )}
        </div>

        {/* Checkbox Remember Me (accent-color + fallback @supports not) */}
        <div className="flex items-center justify-between pt-0.5">
          <label
            htmlFor="rememberMe"
            className="otium-checkbox-label inline-flex cursor-pointer select-none items-center gap-2.5 text-sm text-slate-700"
          >
            <input
              id="rememberMe"
              name="rememberMe"
              type="checkbox"
              disabled={isLoading}
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="otium-checkbox h-4 w-4 cursor-pointer rounded border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 disabled:cursor-not-allowed"
            />
            <span>
              Tetap masuk selama{" "}
              <strong className="font-medium text-slate-900">7 hari</strong>
            </span>
          </label>
        </div>

        {/* Tombol Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              <span>Memverifikasi Akun...</span>
            </>
          ) : (
            <>
              <span>Masuk ke Portal</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </>
          )}
        </button>
      </form>

      {/* Catatan Colophon Ringkas (Tanpa Registrasi Publik) */}
      <p className="mt-7 border-t border-stone-200 pt-5 text-xs leading-relaxed text-slate-600">
        Akses akun dikelola oleh Administrator &middot; Peran pengguna
        terdeteksi otomatis setelah masuk.
      </p>
    </div>
  );
}
