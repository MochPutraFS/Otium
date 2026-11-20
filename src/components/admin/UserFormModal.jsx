"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Save,
  UserPlus,
  X,
} from "lucide-react";
import { parseIsoDate } from "@/lib/date-utils";

const ROLE_OPTIONS = ["Admin", "Karyawan", "Ketua Divisi", "HRD"];

/**
 * Menghitung pratinjau masa kerja (>= 1 tahun vs < 1 tahun) terhadap tanggal server hari ini.
 * @param {string} joinDateIso
 * @param {string} todayIso
 */
function calculateTenurePreview(joinDateIso, todayIso) {
  const join = parseIsoDate(joinDateIso);
  const today = parseIsoDate(todayIso);
  if (!join || !today) {
    return { isEligible: false, label: "Tanggal belum valid" };
  }

  let years = today.getFullYear() - join.getFullYear();
  let months = today.getMonth() - join.getMonth();
  if (today.getDate() < join.getDate()) {
    months -= 1;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  if (years < 0) {
    return { isEligible: false, label: "Tanggal masa depan" };
  }

  const isEligible = years >= 1;
  let label = "< 1 bulan";
  if (years === 0 && months > 0) label = `${months} bulan`;
  else if (years > 0 && months === 0) label = `${years} tahun`;
  else if (years > 0 && months > 0) label = `${years} thn ${months} bln`;

  return { isEligible, label };
}

function validateSingleField(field, values, { isEdit, initialUser, existingUsers }) {
  switch (field) {
    case "fullName": {
      const trimmed = values.fullName.trim();
      if (trimmed.length < 3) return "Nama lengkap wajib diisi minimal 3 karakter.";
      if (trimmed.length > 150) return "Nama lengkap maksimal 150 karakter.";
      return "";
    }
    case "username": {
      const trimmed = values.username.trim().toLowerCase();
      if (!trimmed || !/^[a-z0-9._-]{3,50}$/.test(trimmed)) {
        return "Username 3–50 karakter (huruf kecil, angka, titik, garis bawah, atau strip).";
      }
      const dup = existingUsers.some(
        (u) =>
          u.username.toLowerCase() === trimmed &&
          (!isEdit || u.id !== initialUser?.id)
      );
      if (dup) return "Username sudah digunakan oleh akun lain.";
      return "";
    }
    case "email": {
      const trimmed = values.email.trim().toLowerCase();
      if (
        !trimmed ||
        trimmed.length > 100 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)
      ) {
        return "Masukkan alamat email valid, misalnya nama@otium.id.";
      }
      const dup = existingUsers.some(
        (u) =>
          u.email.toLowerCase() === trimmed &&
          (!isEdit || u.id !== initialUser?.id)
      );
      if (dup) return "Email sudah terdaftar pada akun lain.";
      return "";
    }
    case "password": {
      const pwd = values.password;
      if (!isEdit) {
        if (!pwd) return "Password wajib diisi untuk akun baru.";
        if (pwd.length < 8) return "Password minimal 8 karakter.";
        if (!(/[A-Za-z]/.test(pwd) && /[0-9]/.test(pwd))) {
          return "Password harus mengandung kombinasi huruf dan angka.";
        }
      } else if (pwd.length > 0) {
        if (pwd.length < 8) return "Password baru minimal 8 karakter.";
        if (!(/[A-Za-z]/.test(pwd) && /[0-9]/.test(pwd))) {
          return "Password baru harus mengandung kombinasi huruf dan angka.";
        }
      }
      return "";
    }
    case "initialLeaveQuota": {
      const parsed = Number(values.initialLeaveQuota);
      if (
        values.initialLeaveQuota === "" ||
        Number.isNaN(parsed) ||
        parsed < 0 ||
        parsed > 365
      ) {
        return "Kuota awal harus antara 0 hingga 365 hari.";
      }
      if (Math.round(parsed * 2) !== parsed * 2) {
        return "Kuota awal harus kelipatan 0.5 hari.";
      }
      return "";
    }
    case "remainingLeaveQuota": {
      if (!isEdit) return "";
      const parsed = Number(values.remainingLeaveQuota);
      if (
        values.remainingLeaveQuota === "" ||
        Number.isNaN(parsed) ||
        parsed < 0 ||
        parsed > 365
      ) {
        return "Sisa kuota harus antara 0 hingga 365 hari.";
      }
      if (Math.round(parsed * 2) !== parsed * 2) {
        return "Sisa kuota harus kelipatan 0.5 hari.";
      }
      return "";
    }
    case "joinDate": {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(values.joinDate)) {
        return "Tanggal bergabung wajib diisi dengan format valid.";
      }
      return "";
    }
    default:
      return "";
  }
}

/**
 * Modal Tambah / Edit Pengguna (CMS Modul 1) menggunakan elemen natif <dialog>.
 * Menerapkan validasi pasca-interaksi (:user-invalid + aria-invalid/aria-describedby)
 * dan proteksi anti-self-lockout untuk Admin.
 */
export default function UserFormModal({
  isOpen,
  mode = "create",
  initialUser = null,
  currentAdminId = null,
  todayIso = "",
  existingUsers = [],
  divisions = [],
  isSubmitting = false,
  serverError = "",
  serverFieldErrors = null,
  onClose,
  onSubmit,
}) {
  const isEdit = mode === "edit" && Boolean(initialUser);
  const isEditingSelf = isEdit && Number(initialUser?.id) === Number(currentAdminId);

  const dialogRef = useRef(null);
  const formRef = useRef(null);
  const titleId = useId();

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState("Karyawan");
  const [divisionId, setDivisionId] = useState("");
  const [initialLeaveQuota, setInitialLeaveQuota] = useState("12.0");
  const [remainingLeaveQuota, setRemainingLeaveQuota] = useState("12.0");
  const [joinDate, setJoinDate] = useState(todayIso);
  const [isActive, setIsActive] = useState(true);

  const [touched, setTouched] = useState({});
  const [errors, setErrors] = useState({});
  const [liveAnnouncement, setLiveAnnouncement] = useState("");

  // Reset form ketika modal dibuka / target user berubah
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
      setJoinDate(initialUser.joinDate || todayIso);
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
      setJoinDate(todayIso);
      setIsActive(true);
    }
    setTouched({});
    setErrors({});
    setLiveAnnouncement("");
  }, [isOpen, isEdit, initialUser, todayIso]);

  // Sinkronkan fieldErrors dari Server Action
  useEffect(() => {
    if (!serverFieldErrors || Object.keys(serverFieldErrors).length === 0) return;
    setErrors((prev) => ({ ...prev, ...serverFieldErrors }));
    const nextTouched = {};
    Object.keys(serverFieldErrors).forEach((k) => {
      nextTouched[k] = true;
    });
    setTouched((prev) => ({ ...prev, ...nextTouched }));

    const firstErrorKey = Object.keys(serverFieldErrors)[0];
    const firstMsg = serverFieldErrors[firstErrorKey];
    if (firstMsg) {
      setLiveAnnouncement(firstMsg);
    }
  }, [serverFieldErrors]);

  // Buka & tutup native <dialog> melalui showModal()
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.close();
      dialog.returnValue = "";
    }
  }, [isOpen]);

  // Fallback light-dismiss untuk browser tanpa dukungan atribut closedby (mis. Safari)
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !isOpen) return undefined;

    function handleCancel(event) {
      if (isSubmitting) {
        event.preventDefault();
      }
    }

    function handleClose() {
      dialog.returnValue = "";
      if (!isSubmitting) {
        onClose?.();
      }
    }

    dialog.addEventListener("cancel", handleCancel);
    dialog.addEventListener("close", handleClose);

    let cleanupPointer = null;
    if (
      typeof HTMLDialogElement !== "undefined" &&
      !("closedBy" in HTMLDialogElement.prototype)
    ) {
      let pressedOutside = false;
      const isOutside = (e) => {
        const rect = dialog.getBoundingClientRect();
        return (
          e.clientX < rect.left ||
          e.clientX > rect.right ||
          e.clientY < rect.top ||
          e.clientY > rect.bottom
        );
      };
      const onPointerDown = (e) => {
        pressedOutside = isOutside(e);
      };
      const onPointerUp = (e) => {
        if (!isSubmitting && pressedOutside && isOutside(e)) {
          dialog.close();
        }
        pressedOutside = false;
      };
      dialog.addEventListener("pointerdown", onPointerDown);
      dialog.addEventListener("pointerup", onPointerUp);
      cleanupPointer = () => {
        dialog.removeEventListener("pointerdown", onPointerDown);
        dialog.removeEventListener("pointerup", onPointerUp);
      };
    }

    return () => {
      dialog.removeEventListener("cancel", handleCancel);
      dialog.removeEventListener("close", handleClose);
      cleanupPointer?.();
    };
  }, [isOpen, isSubmitting, onClose]);

  const currentValues = useMemo(
    () => ({
      fullName,
      username,
      email,
      password,
      role,
      divisionId,
      initialLeaveQuota,
      remainingLeaveQuota,
      joinDate,
      isActive,
    }),
    [
      fullName,
      username,
      email,
      password,
      role,
      divisionId,
      initialLeaveQuota,
      remainingLeaveQuota,
      joinDate,
      isActive,
    ]
  );

  const tenurePreview = useMemo(
    () => calculateTenurePreview(joinDate, todayIso),
    [joinDate, todayIso]
  );

  const ledDivision = useMemo(() => {
    if (!isEdit || !initialUser) return null;
    if (initialUser.ledDivisionName) {
      return { id: initialUser.ledDivisionId, name: initialUser.ledDivisionName };
    }
    return divisions.find((d) => d.leaderId === initialUser.id) || null;
  }, [isEdit, initialUser, divisions]);

  const willReleaseLeadership =
    Boolean(ledDivision) && (role !== "Ketua Divisi" || !isActive);

  function handleBlur(field) {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const msg = validateSingleField(field, currentValues, {
      isEdit,
      initialUser,
      existingUsers,
    });
    setErrors((prev) => {
      const next = { ...prev };
      if (msg) next[field] = msg;
      else delete next[field];
      return next;
    });
    if (msg) {
      setLiveAnnouncement(msg);
    }
  }

  function handleFieldChange(field, setter, nextValue) {
    setter(nextValue);
    if (touched[field] || errors[field]) {
      const nextVals = { ...currentValues, [field]: nextValue };
      const msg = validateSingleField(field, nextVals, {
        isEdit,
        initialUser,
        existingUsers,
      });
      setErrors((prev) => {
        const next = { ...prev };
        if (msg) next[field] = msg;
        else delete next[field];
        return next;
      });
    }
  }

  function validateAllFields() {
    const fields = [
      "fullName",
      "username",
      "email",
      "password",
      "initialLeaveQuota",
      "remainingLeaveQuota",
      "joinDate",
    ];
    const nextErrors = {};
    const nextTouched = {};

    for (const field of fields) {
      nextTouched[field] = true;
      const msg = validateSingleField(field, currentValues, {
        isEdit,
        initialUser,
        existingUsers,
      });
      if (msg) nextErrors[field] = msg;
    }

    setTouched((prev) => ({ ...prev, ...nextTouched }));
    setErrors(nextErrors);
    return nextErrors;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSubmitting) return;

    const nextErrors = validateAllFields();
    const errorKeys = Object.keys(nextErrors);
    if (errorKeys.length > 0) {
      const fieldIdMap = {
        fullName: "user-fullname",
        username: "user-username",
        email: "user-email",
        password: "user-password",
        initialLeaveQuota: "user-initial-quota",
        remainingLeaveQuota: "user-remaining-quota",
        joinDate: isEdit ? "user-joindate-edit" : "user-joindate",
      };
      const firstId = fieldIdMap[errorKeys[0]];
      if (firstId) {
        formRef.current?.querySelector(`#${firstId}`)?.focus();
      }
      setLiveAnnouncement(nextErrors[errorKeys[0]]);
      return;
    }

    const initQuotaNum = Number(initialLeaveQuota);
    const remQuotaNum = isEdit ? Number(remainingLeaveQuota) : initQuotaNum;

    await onSubmit?.({
      id: isEdit ? initialUser.id : undefined,
      fullName: fullName.trim(),
      username: username.trim().toLowerCase(),
      email: email.trim().toLowerCase(),
      password: password || undefined,
      role: isEditingSelf ? initialUser.role : role,
      divisionId: divisionId ? Number(divisionId) : null,
      initialLeaveQuota: initQuotaNum,
      remainingLeaveQuota: remQuotaNum,
      joinDate,
      isActive: isEditingSelf ? true : isActive,
    });
  }

  const inputBaseClass =
    "otium-field-input mt-1 w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors duration-150 hover:border-stone-400 focus-visible:border-slate-900 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-slate-500";

  return (
    <dialog
      ref={dialogRef}
      closedby={isSubmitting ? "none" : "any"}
      aria-labelledby={titleId}
      className="otium-modal w-full max-w-2xl"
    >
      <div className="flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-xl border border-stone-300 bg-white shadow-2xl">
        {/* Live region tunggal untuk pembaca layar */}
        <div aria-live="polite" className="visually-hidden">
          {liveAnnouncement}
        </div>

        {/* Header Editorial */}
        <div className="flex items-start justify-between gap-4 border-b border-stone-200 bg-[#F4F2EC] px-6 py-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-stone-300 bg-white text-slate-900">
              <UserPlus className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                {isEdit ? "Pembaruan Akun" : "Provisioning Akun Baru"}
              </p>
              <h2
                id={titleId}
                className="mt-0.5 text-base font-bold tracking-tight text-slate-900"
              >
                {isEdit ? "Edit Data Pengguna" : "Tambah Pengguna Baru"}
              </h2>
              <p className="mt-0.5 text-xs text-slate-600">
                {isEdit
                  ? `Perbarui identitas, role, kuota cuti, atau tanggal bergabung ${initialUser.fullName}.`
                  : "Seluruh akun dibuat terpusat oleh Admin tanpa registrasi publik."}
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => onClose?.()}
            aria-label="Tutup dialog"
            className="cursor-pointer rounded-lg p-1.5 text-slate-600 transition-colors duration-150 hover:bg-stone-200/80 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Form Body */}
        <form
          ref={formRef}
          id="admin-user-form"
          noValidate
          onSubmit={handleSubmit}
          className="flex-1 space-y-5 overflow-y-auto px-6 py-5"
        >
          {serverError && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-lg border border-rose-300 bg-rose-50 px-3.5 py-3 text-xs text-rose-900"
            >
              <AlertCircle
                className="mt-0.5 h-4 w-4 shrink-0 text-rose-700"
                aria-hidden="true"
              />
              <span>{serverError}</span>
            </div>
          )}

          {isEditingSelf && (
            <div className="flex items-start gap-2.5 rounded-lg border border-stone-300 bg-[#F4F2EC] px-3.5 py-3 text-xs text-slate-700">
              <Lock
                className="mt-0.5 h-4 w-4 shrink-0 text-slate-700"
                aria-hidden="true"
              />
              <div>
                <p className="font-semibold text-slate-900">
                  Proteksi Anti-Self-Lockout Aktif
                </p>
                <p className="mt-0.5 text-slate-600">
                  Anda sedang mengedit akun Admin Anda sendiri. Perubahan{" "}
                  <strong>Role</strong> dan <strong>Status Aktif</strong> dikunci
                  agar akses Administrator tidak terputus.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Nama Lengkap */}
            <div>
              <label
                htmlFor="user-fullname"
                className="block text-xs font-semibold text-slate-900"
              >
                Nama Lengkap <span className="text-rose-700">*</span>
              </label>
              <input
                id="user-fullname"
                name="fullName"
                type="text"
                autoFocus
                required
                minLength={3}
                maxLength={150}
                autoComplete="name"
                value={fullName}
                onChange={(e) =>
                  handleFieldChange("fullName", setFullName, e.target.value)
                }
                onBlur={() => handleBlur("fullName")}
                aria-invalid={Boolean(errors.fullName) ? "true" : "false"}
                aria-describedby={
                  errors.fullName ? "user-fullname-error" : undefined
                }
                placeholder="Contoh: Rina Permata"
                className={inputBaseClass}
              />
              {errors.fullName && (
                <p
                  id="user-fullname-error"
                  className="mt-1.5 flex items-start gap-1 text-xs font-medium text-rose-700"
                >
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>{errors.fullName}</span>
                </p>
              )}
            </div>

            {/* Username */}
            <div>
              <label
                htmlFor="user-username"
                className="block text-xs font-semibold text-slate-900"
              >
                Username <span className="text-rose-700">*</span>
              </label>
              <span
                id="user-username-hint"
                className="mt-0.5 block text-[11px] text-slate-600"
              >
                3–50 karakter: huruf kecil, angka, titik, underscore, atau strip.
              </span>
              <input
                id="user-username"
                name="username"
                type="text"
                required
                minLength={3}
                maxLength={50}
                pattern="[a-zA-Z0-9._\-]{3,50}"
                autoComplete="username"
                value={username}
                onChange={(e) =>
                  handleFieldChange("username", setUsername, e.target.value)
                }
                onBlur={() => handleBlur("username")}
                aria-invalid={Boolean(errors.username) ? "true" : "false"}
                aria-describedby={
                  errors.username
                    ? "user-username-hint user-username-error"
                    : "user-username-hint"
                }
                placeholder="rina.permata"
                className={inputBaseClass}
              />
              {errors.username && (
                <p
                  id="user-username-error"
                  className="mt-1.5 flex items-start gap-1 text-xs font-medium text-rose-700"
                >
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>{errors.username}</span>
                </p>
              )}
            </div>

            {/* Email Perusahaan */}
            <div>
              <label
                htmlFor="user-email"
                className="block text-xs font-semibold text-slate-900"
              >
                Email Perusahaan <span className="text-rose-700">*</span>
              </label>
              <span
                id="user-email-hint"
                className="mt-0.5 block text-[11px] text-slate-600"
              >
                Format: nama@otium.id (unik per akun).
              </span>
              <input
                id="user-email"
                name="email"
                type="email"
                required
                maxLength={100}
                autoComplete="email"
                value={email}
                onChange={(e) =>
                  handleFieldChange("email", setEmail, e.target.value)
                }
                onBlur={() => handleBlur("email")}
                aria-invalid={Boolean(errors.email) ? "true" : "false"}
                aria-describedby={
                  errors.email
                    ? "user-email-hint user-email-error"
                    : "user-email-hint"
                }
                placeholder="rina.permata@otium.id"
                className={inputBaseClass}
              />
              {errors.email && (
                <p
                  id="user-email-error"
                  className="mt-1.5 flex items-start gap-1 text-xs font-medium text-rose-700"
                >
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>{errors.email}</span>
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="user-password"
                className="block text-xs font-semibold text-slate-900"
              >
                Password{" "}
                {isEdit ? (
                  <span className="font-normal text-slate-600">
                    (Opsional saat edit)
                  </span>
                ) : (
                  <span className="text-rose-700">*</span>
                )}
              </label>
              <span
                id="user-password-hint"
                className="mt-0.5 block text-[11px] text-slate-600"
              >
                {isEdit
                  ? "Kosongkan bila tetap. Jika diisi: min. 8 karakter (huruf & angka)."
                  : "Minimal 8 karakter dengan kombinasi huruf dan angka."}
              </span>
              <div className="relative mt-1">
                <input
                  id="user-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required={!isEdit}
                  minLength={isEdit ? undefined : 8}
                  maxLength={128}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) =>
                    handleFieldChange("password", setPassword, e.target.value)
                  }
                  onBlur={() => handleBlur("password")}
                  aria-invalid={Boolean(errors.password) ? "true" : "false"}
                  aria-describedby={
                    errors.password
                      ? "user-password-hint user-password-error"
                      : "user-password-hint"
                  }
                  placeholder={
                    isEdit
                      ? "Isi hanya untuk reset password"
                      : "Contoh: Otium2026"
                  }
                  className="otium-field-input w-full rounded-lg border border-stone-300 bg-white py-2.5 pl-3.5 pr-10 text-sm text-slate-900 placeholder:text-slate-400 transition-colors duration-150 hover:border-stone-400 focus-visible:border-slate-900 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-slate-900"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={
                    showPassword ? "Sembunyikan password" : "Tampilkan password"
                  }
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer rounded-md p-1 text-slate-600 transition-colors duration-150 hover:bg-stone-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-slate-900"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p
                  id="user-password-error"
                  className="mt-1.5 flex items-start gap-1 text-xs font-medium text-rose-700"
                >
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>{errors.password}</span>
                </p>
              )}
            </div>

            {/* Role Pengguna */}
            <div>
              <label
                htmlFor="user-role"
                className="block text-xs font-semibold text-slate-900"
              >
                Role Pengguna <span className="text-rose-700">*</span>
              </label>
              <select
                id="user-role"
                name="role"
                disabled={isEditingSelf}
                value={role}
                onChange={(e) => setRole(e.target.value)}
                aria-invalid={Boolean(errors.role) ? "true" : "false"}
                aria-describedby={errors.role ? "user-role-error" : undefined}
                className={`${inputBaseClass} cursor-pointer`}
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              {errors.role && (
                <p
                  id="user-role-error"
                  className="mt-1.5 text-xs font-medium text-rose-700"
                >
                  {errors.role}
                </p>
              )}
            </div>

            {/* Divisi */}
            <div>
              <label
                htmlFor="user-division"
                className="block text-xs font-semibold text-slate-900"
              >
                Divisi{" "}
                <span className="font-normal text-slate-600">(Opsional)</span>
              </label>
              <select
                id="user-division"
                name="divisionId"
                value={divisionId}
                onChange={(e) => setDivisionId(e.target.value)}
                aria-invalid={Boolean(errors.divisionId) ? "true" : "false"}
                className={`${inputBaseClass} cursor-pointer`}
              >
                <option value="">Belum ditetapkan (NULL)</option>
                {divisions.map((div) => (
                  <option key={div.id} value={String(div.id)}>
                    {div.name}
                  </option>
                ))}
              </select>
              {errors.divisionId && (
                <p className="mt-1.5 text-xs font-medium text-rose-700">
                  {errors.divisionId}
                </p>
              )}
            </div>

            {/* Kuota Awal */}
            <div>
              <label
                htmlFor="user-initial-quota"
                className="block text-xs font-semibold text-slate-900"
              >
                Kuota Cuti Tahunan Awal (Hari){" "}
                <span className="text-rose-700">*</span>
              </label>
              <span
                id="user-initial-quota-hint"
                className="mt-0.5 block text-[11px] text-slate-600"
              >
                Mendukung kelipatan 0.5 hari (default 12.0).
              </span>
              <input
                id="user-initial-quota"
                name="initialLeaveQuota"
                type="number"
                required
                step="0.5"
                min="0"
                max="365"
                value={initialLeaveQuota}
                onChange={(e) =>
                  handleFieldChange(
                    "initialLeaveQuota",
                    setInitialLeaveQuota,
                    e.target.value
                  )
                }
                onBlur={() => handleBlur("initialLeaveQuota")}
                aria-invalid={
                  Boolean(errors.initialLeaveQuota) ? "true" : "false"
                }
                aria-describedby={
                  errors.initialLeaveQuota
                    ? "user-initial-quota-hint user-initial-quota-error"
                    : "user-initial-quota-hint"
                }
                className={`${inputBaseClass} tabular-nums`}
              />
              {errors.initialLeaveQuota && (
                <p
                  id="user-initial-quota-error"
                  className="mt-1.5 flex items-start gap-1 text-xs font-medium text-rose-700"
                >
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>{errors.initialLeaveQuota}</span>
                </p>
              )}
            </div>

            {/* Sisa Kuota (Edit) atau Join Date (Create) */}
            {isEdit ? (
              <div>
                <label
                  htmlFor="user-remaining-quota"
                  className="block text-xs font-semibold text-slate-900"
                >
                  Sisa Kuota Saat Ini (Hari){" "}
                  <span className="text-rose-700">*</span>
                </label>
                <span
                  id="user-remaining-quota-hint"
                  className="mt-0.5 block text-[11px] text-slate-600"
                >
                  Saldo realtime saat ini (kelipatan 0.5 hari).
                </span>
                <input
                  id="user-remaining-quota"
                  name="remainingLeaveQuota"
                  type="number"
                  required
                  step="0.5"
                  min="0"
                  max="365"
                  value={remainingLeaveQuota}
                  onChange={(e) =>
                    handleFieldChange(
                      "remainingLeaveQuota",
                      setRemainingLeaveQuota,
                      e.target.value
                    )
                  }
                  onBlur={() => handleBlur("remainingLeaveQuota")}
                  aria-invalid={
                    Boolean(errors.remainingLeaveQuota) ? "true" : "false"
                  }
                  aria-describedby={
                    errors.remainingLeaveQuota
                      ? "user-remaining-quota-hint user-remaining-quota-error"
                      : "user-remaining-quota-hint"
                  }
                  className={`${inputBaseClass} tabular-nums`}
                />
                {errors.remainingLeaveQuota && (
                  <p
                    id="user-remaining-quota-error"
                    className="mt-1.5 flex items-start gap-1 text-xs font-medium text-rose-700"
                  >
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>{errors.remainingLeaveQuota}</span>
                  </p>
                )}
              </div>
            ) : (
              <div>
                <label
                  htmlFor="user-joindate"
                  className="block text-xs font-semibold text-slate-900"
                >
                  Tanggal Bergabung <span className="text-rose-700">*</span>
                </label>
                <span
                  id="user-joindate-hint"
                  className="mt-0.5 block text-[11px] text-slate-600"
                >
                  Acuan kelayakan Cuti Tahunan (masa kerja &ge; 1 tahun).
                </span>
                <input
                  id="user-joindate"
                  name="joinDate"
                  type="date"
                  required
                  value={joinDate}
                  onChange={(e) =>
                    handleFieldChange("joinDate", setJoinDate, e.target.value)
                  }
                  onBlur={() => handleBlur("joinDate")}
                  aria-invalid={Boolean(errors.joinDate) ? "true" : "false"}
                  aria-describedby={
                    errors.joinDate
                      ? "user-joindate-hint user-joindate-error"
                      : "user-joindate-hint"
                  }
                  className={`${inputBaseClass} tabular-nums`}
                />
                {errors.joinDate && (
                  <p
                    id="user-joindate-error"
                    className="mt-1.5 flex items-start gap-1 text-xs font-medium text-rose-700"
                  >
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>{errors.joinDate}</span>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Join Date (Edit) + Status Akun */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {isEdit && (
              <div>
                <label
                  htmlFor="user-joindate-edit"
                  className="block text-xs font-semibold text-slate-900"
                >
                  Tanggal Bergabung <span className="text-rose-700">*</span>
                </label>
                <input
                  id="user-joindate-edit"
                  name="joinDate"
                  type="date"
                  required
                  value={joinDate}
                  onChange={(e) =>
                    handleFieldChange("joinDate", setJoinDate, e.target.value)
                  }
                  onBlur={() => handleBlur("joinDate")}
                  aria-invalid={Boolean(errors.joinDate) ? "true" : "false"}
                  aria-describedby={
                    errors.joinDate ? "user-joindate-edit-error" : undefined
                  }
                  className={`${inputBaseClass} tabular-nums`}
                />
                {errors.joinDate && (
                  <p
                    id="user-joindate-edit-error"
                    className="mt-1.5 flex items-start gap-1 text-xs font-medium text-rose-700"
                  >
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>{errors.joinDate}</span>
                  </p>
                )}
              </div>
            )}

            <div className={isEdit ? "" : "sm:col-span-2"}>
              <span className="block text-xs font-semibold text-slate-900">
                Status Akun
              </span>
              <label
                className={`otium-checkbox-label mt-1.5 flex items-center gap-3 rounded-lg border border-stone-300 px-3.5 py-2.5 transition-colors duration-150 ${
                  isEditingSelf
                    ? "cursor-not-allowed bg-stone-100 opacity-75"
                    : "cursor-pointer bg-[#F4F2EC]/70 hover:bg-[#F4F2EC]"
                }`}
              >
                <input
                  type="checkbox"
                  disabled={isEditingSelf}
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="otium-checkbox h-4 w-4 cursor-pointer rounded border-stone-400 disabled:cursor-not-allowed"
                />
                <span className="text-xs font-medium text-slate-800">
                  Akun Aktif (Dapat Login &amp; Bertransaksi Cuti)
                </span>
              </label>
            </div>
          </div>

          {/* Live Preview Kelayakan Masa Kerja 1 Tahun */}
          <div
            className={`flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-xs ${
              tenurePreview.isEligible
                ? "border-emerald-300/80 bg-emerald-50/70 text-emerald-950"
                : "border-amber-300/90 bg-amber-50/80 text-amber-950"
            }`}
          >
            {tenurePreview.isEligible ? (
              <CheckCircle2
                className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700"
                aria-hidden="true"
              />
            ) : (
              <AlertCircle
                className="mt-0.5 h-4 w-4 shrink-0 text-amber-700"
                aria-hidden="true"
              />
            )}
            <div>
              <p className="font-semibold">
                Evaluasi Masa Kerja: {tenurePreview.label} —{" "}
                {tenurePreview.isEligible
                  ? "Eligible Cuti Tahunan (≥ 1 Tahun)"
                  : "Belum Eligible Cuti Tahunan (< 1 Tahun)"}
              </p>
              <p className="mt-0.5 text-[11px] opacity-85">
                Dihitung terhadap tanggal server hari ini ({todayIso}). Karyawan
                dengan masa kerja &lt; 1 tahun tetap dapat mengajukan Cuti Sakit
                atau Cuti Lainnya.
              </p>
            </div>
          </div>

          {/* Peringatan otomatis bila Ketua Divisi aktif diubah role / dinonaktifkan */}
          {willReleaseLeadership && (
            <div className="flex items-start gap-2.5 rounded-lg border border-rose-300 bg-rose-50 px-3.5 py-3 text-xs text-rose-950">
              <AlertTriangle
                className="mt-0.5 h-4 w-4 shrink-0 text-rose-700"
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
                  mengosongkan <code className="font-mono">divisions.leader_id</code>{" "}
                  divisi tersebut dalam satu transaksi SQL atomik.
                </p>
              </div>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 border-t border-stone-200 bg-[#F4F2EC] px-6 py-3.5">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => onClose?.()}
            className="cursor-pointer rounded-lg border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 transition-colors duration-150 hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="submit"
            form="admin-user-form"
            disabled={isSubmitting}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-colors duration-150 hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {isSubmitting
              ? "Menyimpan..."
              : isEdit
                ? "Simpan Perubahan"
                : "Simpan Pengguna"}
          </button>
        </div>
      </div>
    </dialog>
  );
}
