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
    tone: "warn",
    message: "Sesi masuk Anda telah berakhir. Silakan login kembali.",
  },
  logged_out: {
    tone: "success",
    message: "Anda telah berhasil keluar dari portal Otium.",
  },
  inactive: {
    tone: "danger",
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
 * Form Login terpusat (Pure Production) bergaya Swiss Archival untuk portal Otium.
 * Terhubung eksklusif ke Server Action `loginAction` tanpa mengubah kontrak backend.
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
    <div className="w-full max-w-[400px] border border-[var(--rule-strong)] bg-[var(--paper-pure)] p-6 sm:p-8 lg:border-0 lg:bg-transparent lg:p-0">
      {/* Live region sopan untuk pengumuman error blur bagi screen reader */}
      <div role="status" aria-live="polite" className="visually-hidden">
        {announcement}
      </div>

      {/* Header Identitas Mobile/Tablet (Logo Otium Asli) */}
      <div className="mb-6 flex items-center gap-3 border-b border-[var(--rule)] pb-5 lg:hidden">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[2px] border border-[var(--rule-strong)] bg-[var(--paper)] p-1.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/otium-logo.svg"
            alt="Logo Otium"
            className="h-full w-full object-contain"
          />
        </div>
        <div>
          <span className="block font-serif text-xl font-bold leading-none tracking-[0.08em] text-[var(--ink)]">
            OTIUM
          </span>
          <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--ink-muted)]">
            Arsip Cuti {new Date().getFullYear()}
          </span>
        </div>
      </div>

      {/* Heading Form */}
      <div>
        <span className="panel-eyebrow">Portal Karyawan</span>
        <h2 className="mt-1 font-serif text-[32px] font-semibold leading-[1.1] text-[var(--ink)] sm:text-[34px]">
          Masuk ke Ruang Kerja
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-[var(--ink-soft)]">
          Role pengguna terdeteksi otomatis setelah kredensial terverifikasi.
        </p>
      </div>

      {/* Banner Status dari Query Param (session_expired / logged_out / inactive) */}
      {statusBanner && !errorMsg && (
        <div
          role="status"
          className={`notice mt-5 ${
            statusBanner.tone === "warn"
              ? "notice-warn"
              : statusBanner.tone === "success"
                ? "notice-success"
                : "notice-danger"
          }`}
        >
          {statusBanner.tone === "success" ? (
            <CheckCircle2 aria-hidden="true" />
          ) : (
            <AlertCircle aria-hidden="true" />
          )}
          <span>{statusBanner.message}</span>
        </div>
      )}

      {/* Alert Error Kredensial / Akun Nonaktif */}
      {errorMsg && (
        <div role="alert" className="notice notice-danger mt-5">
          <AlertCircle aria-hidden="true" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Form Kredensial */}
      <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
        {/* Field Email atau Username */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="identifier"
            className="text-xs font-semibold text-[var(--ink-soft)]"
          >
            Email atau Username{" "}
            <span className="text-[var(--terracotta)]" aria-hidden="true">
              *
            </span>
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[var(--ink-muted)]">
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
              className={`otium-input input mono !pl-9 !pr-3 ${
                fieldErrors.identifier
                  ? "!border-[var(--terracotta)] !bg-[var(--terracotta-tint)]"
                  : ""
              }`}
            />
          </div>
          {fieldErrors.identifier && (
            <p
              id="identifier-error"
              className="flex items-center gap-1.5 text-xs font-medium text-[var(--terracotta)]"
            >
              <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{fieldErrors.identifier}</span>
            </p>
          )}
        </div>

        {/* Field Password */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <label
              htmlFor="password"
              className="text-xs font-semibold text-[var(--ink-soft)]"
            >
              Password{" "}
              <span className="text-[var(--terracotta)]" aria-hidden="true">
                *
              </span>
            </label>
            {isCapsLockOn && (
              <span
                id="password-capslock-notice"
                className="tag tag-pending !py-0 !text-[10.5px]"
              >
                <AlertCircle className="h-3 w-3 shrink-0" aria-hidden="true" />
                Caps Lock aktif
              </span>
            )}
          </div>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[var(--ink-muted)]">
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
              className={`otium-input input mono !pl-9 !pr-10 ${
                fieldErrors.password
                  ? "!border-[var(--terracotta)] !bg-[var(--terracotta-tint)]"
                  : ""
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
              className="absolute inset-y-0 right-1 my-1 flex w-8 cursor-pointer items-center justify-center rounded-[2px] text-[var(--ink-muted)] transition-colors duration-150 hover:bg-[var(--alabaster)] hover:text-[var(--ink)] disabled:cursor-not-allowed"
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
              className="flex items-center gap-1.5 text-xs font-medium text-[var(--terracotta)]"
            >
              <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{fieldErrors.password}</span>
            </p>
          )}
        </div>

        {/* Checkbox Remember Me (7 hari sesuai AGENTS.md) */}
        <div className="pt-0.5">
          <label
            htmlFor="rememberMe"
            className="otium-checkbox-label inline-flex cursor-pointer select-none items-center gap-2.5 text-[13px] text-[var(--ink-soft)]"
          >
            <input
              id="rememberMe"
              name="rememberMe"
              type="checkbox"
              disabled={isLoading}
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="otium-checkbox h-4 w-4 cursor-pointer rounded-[2px] border-[var(--rule-strong)] disabled:cursor-not-allowed"
            />
            <span>
              Remember Me (tetap masuk{" "}
              <strong className="font-semibold text-[var(--ink)]">
                7 hari
              </strong>
              )
            </span>
          </label>
        </div>

        {/* Tombol Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="btn btn-primary !min-h-[42px] w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              <span>Memverifikasi Akun...</span>
            </>
          ) : (
            <>
              <span>Masuk ke Dashboard</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </>
          )}
        </button>
      </form>

      {/* Catatan Colophon Ringkas (Tanpa Registrasi Publik) */}
      <p className="mt-7 border-t border-[var(--rule)] pt-4 text-xs leading-relaxed text-[var(--ink-muted)]">
        Akses akun dikelola terpusat oleh Administrator &bull; Tanpa registrasi
        publik.
      </p>
    </div>
  );
}
