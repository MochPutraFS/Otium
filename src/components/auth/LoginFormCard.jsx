"use client";

import { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Info,
  Loader2,
  Lock,
  LogIn,
  Mail,
} from "lucide-react";

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

/**
 * Kartu Form Login terpusat untuk portal Otium (4 role: Admin, Karyawan, Ketua Divisi, HRD).
 * Mode UI murni: menjalankan validasi client-side per-field dan siap dihubungkan
 * ke Server Action / Route Handler melalui prop `onSubmit` di tahap integrasi backend.
 */
export default function LoginFormCard({
  onSubmit,
  callbackUrl = "",
  reason = "",
}) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({
    identifier: "",
    password: "",
  });
  const [errorMsg, setErrorMsg] = useState("");
  const [previewMsg, setPreviewMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const statusBanner = REASON_BANNERS[reason] || null;

  function handleIdentifierChange(e) {
    setIdentifier(e.target.value);
    if (fieldErrors.identifier) {
      setFieldErrors((prev) => ({ ...prev, identifier: "" }));
    }
    if (errorMsg) setErrorMsg("");
    if (previewMsg) setPreviewMsg("");
  }

  function handlePasswordChange(e) {
    setPassword(e.target.value);
    if (fieldErrors.password) {
      setFieldErrors((prev) => ({ ...prev, password: "" }));
    }
    if (errorMsg) setErrorMsg("");
    if (previewMsg) setPreviewMsg("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg("");
    setPreviewMsg("");

    const trimmedIdentifier = identifier.trim();
    const nextFieldErrors = {
      identifier: trimmedIdentifier ? "" : "Email atau Username wajib diisi.",
      password: password ? "" : "Password wajib diisi.",
    };

    if (nextFieldErrors.identifier || nextFieldErrors.password) {
      setFieldErrors(nextFieldErrors);
      return;
    }

    setFieldErrors({ identifier: "", password: "" });
    setIsLoading(true);

    try {
      if (typeof onSubmit === "function") {
        const result = await onSubmit({
          identifier: trimmedIdentifier,
          password,
          rememberMe,
          callbackUrl,
        });

        if (result?.error) {
          setErrorMsg(result.error);
        }
        return;
      }

      // Simulasi feedback UI murni (tanpa request backend)
      await new Promise((resolve) => setTimeout(resolve, 450));
      setPreviewMsg(
        `Validasi form berhasil untuk "${trimmedIdentifier}" (${
          rememberMe ? "Remember Me: 7 hari" : "Sesi standar: 1 hari"
        }). Autentikasi backend belum diaktifkan.`
      );
    } catch {
      setErrorMsg("Terjadi kesalahan tak terduga. Silakan coba kembali.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm shadow-slate-200/60 sm:p-8">
      {/* Header Brand (Logo tampil di Mobile/Tablet, ringkas di Desktop) */}
      <div className="text-center lg:text-left">
        <div className="mx-auto mb-4 flex items-center justify-center gap-3 lg:hidden">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center">
            <img
              src="/images/otium-logo.png"
              alt="Logo Otium"
              className="h-11 w-11 object-contain"
            />
          </div>
          <div className="text-left">
            <span className="block text-xl font-bold tracking-tight text-slate-900">
              Otium
            </span>
            <span className="block text-xs font-medium text-slate-500">
              Sistem Manajemen Cuti Karyawan
            </span>
          </div>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Masuk ke Otium
        </h1>
        <p className="mt-1.5 text-sm text-slate-600">
          Gunakan email atau username dari Administrator untuk mengakses portal
          sesuai peran Anda.
        </p>
      </div>

      {/* Banner Status dari Query Param (mis. sesi habis / berhasil logout) */}
      {statusBanner && !errorMsg && !previewMsg && (
        <div
          role="status"
          className={`mt-5 flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm ${
            statusBanner.tone === "amber"
              ? "border-amber-200 bg-amber-50 text-amber-800"
              : statusBanner.tone === "emerald"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {statusBanner.tone === "emerald" ? (
            <CheckCircle2
              className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
              aria-hidden="true"
            />
          ) : (
            <AlertCircle
              className={`mt-0.5 h-4 w-4 shrink-0 ${
                statusBanner.tone === "amber"
                  ? "text-amber-600"
                  : "text-rose-600"
              }`}
              aria-hidden="true"
            />
          )}
          <span>{statusBanner.message}</span>
        </div>
      )}

      {/* Alert Error Kondisional */}
      {errorMsg && (
        <div
          role="alert"
          className="mt-5 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700"
        >
          <AlertCircle
            className="mt-0.5 h-4 w-4 shrink-0 text-rose-600"
            aria-hidden="true"
          />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Alert Info Mode Pratinjau UI (saat backend belum dihubungkan) */}
      {previewMsg && (
        <div
          role="status"
          className="mt-5 flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-sm text-emerald-800"
        >
          <CheckCircle2
            className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
            aria-hidden="true"
          />
          <span>{previewMsg}</span>
        </div>
      )}

      {/* Form Kredensial */}
      <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
        {/* Field Email atau Username */}
        <div>
          <label
            htmlFor="identifier"
            className="block text-sm font-medium text-slate-700"
          >
            Email atau Username <span className="text-rose-600">*</span>
          </label>
          <div className="relative mt-1.5">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
              <Mail className="h-4 w-4" aria-hidden="true" />
            </span>
            <input
              id="identifier"
              name="identifier"
              type="text"
              autoComplete="username"
              autoFocus
              required
              disabled={isLoading}
              aria-invalid={Boolean(fieldErrors.identifier)}
              aria-describedby={
                fieldErrors.identifier ? "identifier-error" : undefined
              }
              value={identifier}
              onChange={handleIdentifierChange}
              placeholder="nama@perusahaan.com atau username"
              className={`block w-full rounded-xl border bg-white py-2.5 pl-10 pr-3.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-100 ${
                fieldErrors.identifier
                  ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20"
                  : "border-slate-300 focus:border-blue-600 focus:ring-blue-600/20"
              }`}
            />
          </div>
          {fieldErrors.identifier && (
            <p
              id="identifier-error"
              className="mt-1.5 text-xs font-medium text-rose-600"
            >
              {fieldErrors.identifier}
            </p>
          )}
        </div>

        {/* Field Password */}
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-slate-700"
          >
            Password <span className="text-rose-600">*</span>
          </label>
          <div className="relative mt-1.5">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
              <Lock className="h-4 w-4" aria-hidden="true" />
            </span>
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              disabled={isLoading}
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={
                fieldErrors.password ? "password-error" : undefined
              }
              value={password}
              onChange={handlePasswordChange}
              placeholder="Masukkan password Anda"
              className={`block w-full rounded-xl border bg-white py-2.5 pl-10 pr-11 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-100 ${
                fieldErrors.password
                  ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20"
                  : "border-slate-300 focus:border-blue-600 focus:ring-blue-600/20"
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              disabled={isLoading}
              aria-label={
                showPassword ? "Sembunyikan password" : "Tampilkan password"
              }
              className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 transition-colors hover:text-slate-600 focus:text-blue-600 focus:outline-none disabled:cursor-not-allowed"
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
              className="mt-1.5 text-xs font-medium text-rose-600"
            >
              {fieldErrors.password}
            </p>
          )}
        </div>

        {/* Checkbox Remember Me */}
        <div className="pt-0.5">
          <label
            htmlFor="rememberMe"
            className="inline-flex cursor-pointer select-none items-center gap-2.5 text-sm text-slate-600"
          >
            <input
              id="rememberMe"
              name="rememberMe"
              type="checkbox"
              disabled={isLoading}
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600 disabled:cursor-not-allowed"
            />
            <span>
              Remember Me{" "}
              <span className="text-xs text-slate-400">
                (Simpan sesi masuk 7 hari)
              </span>
            </span>
          </label>
        </div>

        {/* Tombol Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 transition-all hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              <span>Memverifikasi Akun...</span>
            </>
          ) : (
            <>
              <LogIn className="h-4 w-4" aria-hidden="true" />
              <span>MASUK KE SISTEM</span>
            </>
          )}
        </button>
      </form>

      {/* Info Deteksi Role Otomatis & Tanpa Registrasi Publik */}
      <div className="mt-6 rounded-xl border border-sky-200 bg-sky-50/80 p-3.5 text-xs leading-relaxed text-sky-900">
        <div className="flex items-start gap-2.5">
          <Info
            className="mt-0.5 h-4 w-4 shrink-0 text-sky-600"
            aria-hidden="true"
          />
          <div>
            <p className="font-semibold text-sky-950">
              Deteksi Role Otomatis &amp; Provisioning Akun
            </p>
            <p className="mt-1 text-sky-800">
              Sistem otomatis mendeteksi peran (<strong>Admin</strong>,{" "}
              <strong>Karyawan</strong>, <strong>Ketua Divisi</strong>, atau{" "}
              <strong>HRD</strong>) setelah masuk. Pendaftaran akun publik tidak
              tersedia &mdash; hubungi Administrator jika belum memiliki akun.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
