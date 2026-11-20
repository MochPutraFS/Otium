"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  Save,
  UserPlus,
  X,
} from "lucide-react";
import {
  ADMIN_WORKSPACE_TODAY_ISO,
  calculateTenureMeta,
} from "@/lib/mock-admin-data";

const ROLE_OPTIONS = ["Admin", "Karyawan", "Ketua Divisi", "HRD"];

// Modal Tambah / Edit Pengguna (CMS Modul 1)
export default function UserFormModal({
  isOpen,
  mode = "create",
  initialUser = null,
  existingUsers = [],
  divisions = [],
  onClose,
  onSubmit,
}) {
  const isEdit = mode === "edit" && Boolean(initialUser);

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState("Karyawan");
  const [divisionId, setDivisionId] = useState("");
  const [initialLeaveQuota, setInitialLeaveQuota] = useState("12.0");
  const [remainingLeaveQuota, setRemainingLeaveQuota] = useState("12.0");
  const [joinDate, setJoinDate] = useState(ADMIN_WORKSPACE_TODAY_ISO);
  const [isActive, setIsActive] = useState(true);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!isOpen) return;
    if (isEdit && initialUser) {
      setFullName(initialUser.fullName || "");
      setUsername(initialUser.username || "");
      setEmail(initialUser.email || "");
      setPassword("");
      setShowPassword(false);
      setRole(initialUser.role || "Karyawan");
      setDivisionId(initialUser.divisionId ? String(initialUser.divisionId) : "");
      setInitialLeaveQuota(Number(initialUser.initialLeaveQuota ?? 12).toFixed(1));
      setRemainingLeaveQuota(
        Number(initialUser.remainingLeaveQuota ?? 12).toFixed(1)
      );
      setJoinDate(initialUser.joinDate || ADMIN_WORKSPACE_TODAY_ISO);
      setIsActive(Boolean(initialUser.isActive));
    } else {
      setFullName("");
      setUsername("");
      setEmail("");
      setPassword("");
      setShowPassword(false);
      setRole("Karyawan");
      setDivisionId("");
      setInitialLeaveQuota("12.0");
      setRemainingLeaveQuota("12.0");
      setJoinDate(ADMIN_WORKSPACE_TODAY_ISO);
      setIsActive(true);
    }
    setErrors({});
  }, [isOpen, isEdit, initialUser]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(event) {
      if (event.key === "Escape") onClose?.();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const tenurePreview = useMemo(
    () => calculateTenureMeta(joinDate, ADMIN_WORKSPACE_TODAY_ISO),
    [joinDate]
  );

  // Deteksi jika user yang sedang diedit adalah Ketua Divisi aktif dan akan diubah role/dinonaktifkan
  const ledDivision = useMemo(() => {
    if (!isEdit || !initialUser) return null;
    return divisions.find((d) => d.leaderId === initialUser.id) || null;
  }, [isEdit, initialUser, divisions]);

  const willReleaseLeadership =
    Boolean(ledDivision) && (role !== "Ketua Divisi" || !isActive);

  if (!isOpen) return null;

  function validateForm() {
    const nextErrors = {};
    const trimmedName = fullName.trim();
    const trimmedUsername = username.trim().toLowerCase();
    const trimmedEmail = email.trim().toLowerCase();

    if (trimmedName.length < 3) {
      nextErrors.fullName = "Nama lengkap minimal 3 karakter.";
    }
    if (!trimmedUsername || !/^[a-z0-9._-]{3,30}$/.test(trimmedUsername)) {
      nextErrors.username =
        "Username 3–30 karakter (huruf kecil, angka, titik, underscore, atau strip).";
    } else {
      const dupUsername = existingUsers.some(
        (u) =>
          u.username.toLowerCase() === trimmedUsername &&
          (!isEdit || u.id !== initialUser.id)
      );
      if (dupUsername) {
        nextErrors.username = "Username sudah digunakan oleh akun lain.";
      }
    }

    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      nextErrors.email = "Format email tidak valid.";
    } else {
      const dupEmail = existingUsers.some(
        (u) =>
          u.email.toLowerCase() === trimmedEmail &&
          (!isEdit || u.id !== initialUser.id)
      );
      if (dupEmail) {
        nextErrors.email = "Email sudah terdaftar pada akun lain.";
      }
    }

    if (!isEdit && password.length < 6) {
      nextErrors.password = "Password wajib diisi (minimal 6 karakter).";
    } else if (isEdit && password.length > 0 && password.length < 6) {
      nextErrors.password = "Password baru minimal 6 karakter.";
    }

    const parsedInit = Number(initialLeaveQuota);
    if (Number.isNaN(parsedInit) || parsedInit < 0 || parsedInit > 365) {
      nextErrors.initialLeaveQuota = "Kuota awal harus >= 0 (kelipatan 0.5).";
    } else if (Math.round(parsedInit * 2) !== parsedInit * 2) {
      nextErrors.initialLeaveQuota = "Kuota harus kelipatan 0.5 hari.";
    }

    if (isEdit) {
      const parsedRem = Number(remainingLeaveQuota);
      if (Number.isNaN(parsedRem) || parsedRem < 0 || parsedRem > 365) {
        nextErrors.remainingLeaveQuota =
          "Sisa kuota harus >= 0 (kelipatan 0.5).";
      } else if (Math.round(parsedRem * 2) !== parsedRem * 2) {
        nextErrors.remainingLeaveQuota = "Sisa kuota harus kelipatan 0.5 hari.";
      }
    }

    if (!joinDate) {
      nextErrors.joinDate = "Tanggal bergabung wajib diisi.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!validateForm()) return;

    const initQuotaNum = Number(initialLeaveQuota);
    const remQuotaNum = isEdit ? Number(remainingLeaveQuota) : initQuotaNum;

    onSubmit?.({
      id: isEdit ? initialUser.id : undefined,
      fullName: fullName.trim(),
      username: username.trim().toLowerCase(),
      email: email.trim().toLowerCase(),
      role,
      divisionId: divisionId ? Number(divisionId) : null,
      initialLeaveQuota: initQuotaNum,
      remainingLeaveQuota: remQuotaNum,
      joinDate,
      isActive,
      passwordChanged: Boolean(password),
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-form-modal-title"
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
              <UserPlus className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h3
                id="user-form-modal-title"
                className="text-base font-bold text-slate-900"
              >
                {isEdit ? "Edit Data Pengguna" : "Tambah Pengguna Baru"}
              </h3>
              <p className="text-xs text-slate-500">
                {isEdit
                  ? `Perbarui identitas, role, kuota cuti, atau tanggal bergabung ${initialUser.fullName}.`
                  : "Provisioning akun terpusat oleh Admin (tidak ada registrasi publik)."}
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
          id="admin-user-form"
          onSubmit={handleSubmit}
          className="flex-1 space-y-4 overflow-y-auto px-5 py-5"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="user-fullname"
                className="block text-xs font-semibold text-slate-700"
              >
                Nama Lengkap <span className="text-rose-600">*</span>
              </label>
              <input
                id="user-fullname"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Contoh: Rina Permata"
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              {errors.fullName && (
                <p className="mt-1 text-xs text-rose-600">{errors.fullName}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="user-username"
                className="block text-xs font-semibold text-slate-700"
              >
                Username <span className="text-rose-600">*</span>
              </label>
              <input
                id="user-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Contoh: rina.p"
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              {errors.username && (
                <p className="mt-1 text-xs text-rose-600">{errors.username}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="user-email"
                className="block text-xs font-semibold text-slate-700"
              >
                Email Perusahaan <span className="text-rose-600">*</span>
              </label>
              <input
                id="user-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="rina.permata@otium.id"
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              {errors.email && (
                <p className="mt-1 text-xs text-rose-600">{errors.email}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="user-password"
                className="block text-xs font-semibold text-slate-700"
              >
                Password{" "}
                {isEdit ? (
                  <span className="font-normal text-slate-400">
                    (Kosongkan jika tetap)
                  </span>
                ) : (
                  <span className="text-rose-600">*</span>
                )}
              </label>
              <div className="relative mt-1.5">
                <input
                  id="user-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={
                    isEdit ? "Isi hanya untuk reset password" : "Minimal 6 karakter"
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-3.5 pr-10 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={
                    showPassword ? "Sembunyikan password" : "Tampilkan password"
                  }
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer rounded-lg p-1 text-slate-400 hover:text-slate-700"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-rose-600">{errors.password}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="user-role"
                className="block text-xs font-semibold text-slate-700"
              >
                Role Pengguna <span className="text-rose-600">*</span>
              </label>
              <select
                id="user-role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="mt-1.5 w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="user-division"
                className="block text-xs font-semibold text-slate-700"
              >
                Divisi{" "}
                <span className="font-normal text-slate-400">(Opsional)</span>
              </label>
              <select
                id="user-division"
                value={divisionId}
                onChange={(e) => setDivisionId(e.target.value)}
                className="mt-1.5 w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">Belum ditetapkan (NULL)</option>
                {divisions.map((div) => (
                  <option key={div.id} value={String(div.id)}>
                    {div.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="user-initial-quota"
                className="block text-xs font-semibold text-slate-700"
              >
                Kuota Cuti Tahunan Awal (Hari){" "}
                <span className="text-rose-600">*</span>
              </label>
              <input
                id="user-initial-quota"
                type="number"
                step="0.5"
                min="0"
                max="365"
                value={initialLeaveQuota}
                onChange={(e) => setInitialLeaveQuota(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              {errors.initialLeaveQuota && (
                <p className="mt-1 text-xs text-rose-600">
                  {errors.initialLeaveQuota}
                </p>
              )}
            </div>

            {isEdit ? (
              <div>
                <label
                  htmlFor="user-remaining-quota"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Sisa Kuota Saat Ini (Hari){" "}
                  <span className="text-rose-600">*</span>
                </label>
                <input
                  id="user-remaining-quota"
                  type="number"
                  step="0.5"
                  min="0"
                  max="365"
                  value={remainingLeaveQuota}
                  onChange={(e) => setRemainingLeaveQuota(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                {errors.remainingLeaveQuota && (
                  <p className="mt-1 text-xs text-rose-600">
                    {errors.remainingLeaveQuota}
                  </p>
                )}
              </div>
            ) : (
              <div>
                <label
                  htmlFor="user-joindate"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Tanggal Bergabung (Join Date){" "}
                  <span className="text-rose-600">*</span>
                </label>
                <input
                  id="user-joindate"
                  type="date"
                  value={joinDate}
                  onChange={(e) => setJoinDate(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                {errors.joinDate && (
                  <p className="mt-1 text-xs text-rose-600">{errors.joinDate}</p>
                )}
              </div>
            )}
          </div>

          {/* Join Date (saat Edit) + Toggle Status Aktif */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {isEdit && (
              <div>
                <label
                  htmlFor="user-joindate-edit"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Tanggal Bergabung (Join Date){" "}
                  <span className="text-rose-600">*</span>
                </label>
                <input
                  id="user-joindate-edit"
                  type="date"
                  value={joinDate}
                  onChange={(e) => setJoinDate(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                {errors.joinDate && (
                  <p className="mt-1 text-xs text-rose-600">{errors.joinDate}</p>
                )}
              </div>
            )}

            <div className={isEdit ? "" : "sm:col-span-2"}>
              <span className="block text-xs font-semibold text-slate-700">
                Status Akun
              </span>
              <label className="mt-1.5 flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 transition-colors duration-200 hover:bg-slate-100/70">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 cursor-pointer rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs font-medium text-slate-800">
                  Akun Aktif (Dapat Login &amp; Mengajukan/Memverifikasi Cuti)
                </span>
              </label>
            </div>
          </div>

          {/* Live Preview Kelayakan Masa Kerja 1 Tahun */}
          <div
            className={`flex items-start gap-2.5 rounded-xl border p-3 text-xs ${
              tenurePreview.isEligible
                ? "border-emerald-200 bg-emerald-50/70 text-emerald-900"
                : "border-amber-200 bg-amber-50/80 text-amber-900"
            }`}
          >
            {tenurePreview.isEligible ? (
              <CheckCircle2
                className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
                aria-hidden="true"
              />
            ) : (
              <AlertCircle
                className="mt-0.5 h-4 w-4 shrink-0 text-amber-600"
                aria-hidden="true"
              />
            )}
            <div>
              <p className="font-semibold">
                Simulasi Masa Kerja: {tenurePreview.label} —{" "}
                {tenurePreview.isEligible
                  ? "Eligible Cuti Tahunan (>= 1 Tahun)"
                  : "Belum Eligible Cuti Tahunan (< 1 Tahun)"}
              </p>
              <p className="mt-0.5 opacity-85">
                Ubah <em>Tanggal Bergabung</em> untuk menguji aturan masa kerja
                minimal 1 tahun pada pengajuan Cuti Tahunan.
              </p>
            </div>
          </div>

          {/* Peringatan otomatis bila Ketua Divisi aktif diubah role / dinonaktifkan */}
          {willReleaseLeadership && (
            <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900">
              <AlertTriangle
                className="mt-0.5 h-4 w-4 shrink-0 text-rose-600"
                aria-hidden="true"
              />
              <div>
                <p className="font-semibold">
                  Posisi Ketua Divisi Akan Dilepas Otomatis
                </p>
                <p className="mt-0.5">
                  Akun ini sedang memimpin divisi{" "}
                  <strong>{ledDivision.name}</strong>. Mengubah role menjadi
                  selain <em>Ketua Divisi</em> atau menonaktifkan akun akan
                  mengosongkan <code>divisions.leader_id</code> divisi tersebut.
                </p>
              </div>
            </div>
          )}
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
            form="admin-user-form"
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition-colors duration-200 hover:bg-blue-700"
          >
            <Save className="h-3.5 w-3.5" aria-hidden="true" />
            {isEdit ? "Simpan Perubahan" : "Simpan Pengguna"}
          </button>
        </div>
      </div>
    </div>
  );
}
