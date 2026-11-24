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
        return "Masukkan alamat email valid, misalnya nama@perusahaan.com.";
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
    case "phone": {
      const trimmed = values.phone.trim();
      if (trimmed && !/^[0-9+\-\s()]{8,20}$/.test(trimmed)) {
        return "Format nomor telepon tidak valid (8–20 karakter angka, +, -, spasi, atau kurung).";
      }
      return "";
    }
    case "address": {
      if (values.address.trim().length > 500) {
        return "Alamat domisili maksimal 500 karakter.";
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
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
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
      setPhone(initialUser.phone || "");
      setAddress(initialUser.address || "");
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
      setPhone("");
      setAddress("");
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
      phone,
      address,
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
      phone,
      address,
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
      "phone",
      "address",
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
        phone: "user-phone",
        address: "user-address",
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
      phone: phone.trim() || null,
      address: address.trim() || null,
      initialLeaveQuota: initQuotaNum,
      remainingLeaveQuota: remQuotaNum,
      joinDate,
      isActive: isEditingSelf ? true : isActive,
    });
  }

  const inputBaseClass = "input otium-field-input mt-1 w-full";

  return (
    <dialog
      ref={dialogRef}
      closedby={isSubmitting ? "none" : "any"}
      aria-labelledby={titleId}
      className="otium-modal w-full max-w-2xl"
    >
      <div className="flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-[6px] border border-[var(--ink)] bg-[var(--paper-pure)] shadow-[var(--shadow-lg)]">
        {/* Live region tunggal untuk pembaca layar */}
        <div aria-live="polite" className="visually-hidden">
          {liveAnnouncement}
        </div>

        {/* Header Editorial */}
        <div className="flex items-start justify-between gap-4 border-b border-[var(--rule)] bg-[var(--alabaster)] px-6 py-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[4px] border border-[var(--rule-strong)] bg-[var(--paper-pure)] text-[var(--spruce)]">
              <UserPlus className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--ink-muted)]">
                {isEdit ? "PEMBARUAN AKUN" : "PROVISIONING AKUN BARU"}
              </p>
              <h2
                id={titleId}
                className="mt-0.5 font-serif text-[20px] font-semibold leading-snug text-[var(--ink)]"
              >
                {isEdit ? "Edit Data Pengguna" : "Tambah Pengguna Baru"}
              </h2>
              <p className="mt-0.5 text-[12px] text-[var(--ink-soft)]">
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
            className="btn-icon h-7 w-7 shrink-0"
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
            <div role="alert" className="notice notice-danger">
              <AlertCircle
                className="mt-0.5 h-4 w-4 shrink-0"
                aria-hidden="true"
              />
              <span>{serverError}</span>
            </div>
          )}

          {isEditingSelf && (
            <div className="notice notice-info">
              <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <div>
                <p className="font-semibold text-[var(--ink)]">
                  Proteksi Anti-Self-Lockout Aktif
                </p>
                <p className="mt-0.5 text-[12px]">
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
                className="block text-xs font-semibold text-[var(--ink-soft)]"
              >
                Nama Lengkap <span className="text-[var(--terracotta)]">*</span>
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
                  className="mt-1.5 flex items-start gap-1 text-[11.5px] font-medium text-[var(--terracotta)]"
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
                className="block text-xs font-semibold text-[var(--ink-soft)]"
              >
                Username <span className="text-[var(--terracotta)]">*</span>
              </label>
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
                className={`${inputBaseClass} font-mono`}
              />
              <span
                id="user-username-hint"
                className="mt-1 block text-[11px] text-[var(--ink-muted)]"
              >
                3–50 karakter: huruf kecil, angka, titik, underscore, atau strip.
              </span>
              {errors.username && (
                <p
                  id="user-username-error"
                  className="mt-1.5 flex items-start gap-1 text-[11.5px] font-medium text-[var(--terracotta)]"
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
                className="block text-xs font-semibold text-[var(--ink-soft)]"
              >
                Email Perusahaan <span className="text-[var(--terracotta)]">*</span>
              </label>
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
                placeholder="rina.permata@perusahaan.com"
                className={inputBaseClass}
              />
              <span
                id="user-email-hint"
                className="mt-1 block text-[11px] text-[var(--ink-muted)]"
              >
                Format: nama@perusahaan.com (unik per akun).
              </span>
              {errors.email && (
                <p
                  id="user-email-error"
                  className="mt-1.5 flex items-start gap-1 text-[11.5px] font-medium text-[var(--terracotta)]"
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
                className="block text-xs font-semibold text-[var(--ink-soft)]"
              >
                Password{" "}
                {isEdit ? (
                  <span className="font-normal text-[var(--ink-muted)]">
                    (Opsional saat edit)
                  </span>
                ) : (
                  <span className="text-[var(--terracotta)]">*</span>
                )}
              </label>
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
                  className="input otium-field-input w-full pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={
                    showPassword ? "Sembunyikan password" : "Tampilkan password"
                  }
                  className="absolute right-1.5 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-[2px] text-[var(--ink-muted)] transition-colors hover:bg-[var(--alabaster-deep)] hover:text-[var(--ink)]"
                >
                  {showPassword ? (
                    <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                </button>
              </div>
              <span
                id="user-password-hint"
                className="mt-1 block text-[11px] text-[var(--ink-muted)]"
              >
                {isEdit
                  ? "Kosongkan bila tetap. Jika diisi: min. 8 karakter (huruf & angka)."
                  : "Minimal 8 karakter dengan kombinasi huruf dan angka."}
              </span>
              {errors.password && (
                <p
                  id="user-password-error"
                  className="mt-1.5 flex items-start gap-1 text-[11.5px] font-medium text-[var(--terracotta)]"
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
                className="block text-xs font-semibold text-[var(--ink-soft)]"
              >
                Role Pengguna <span className="text-[var(--terracotta)]">*</span>
              </label>
              <select
                id="user-role"
                name="role"
                disabled={isEditingSelf}
                value={role}
                onChange={(e) => setRole(e.target.value)}
                aria-invalid={Boolean(errors.role) ? "true" : "false"}
                aria-describedby={errors.role ? "user-role-error" : undefined}
                className="select otium-field-input mt-1 w-full"
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
                  className="mt-1.5 text-[11.5px] font-medium text-[var(--terracotta)]"
                >
                  {errors.role}
                </p>
              )}
            </div>

            {/* Divisi */}
            <div>
              <label
                htmlFor="user-division"
                className="block text-xs font-semibold text-[var(--ink-soft)]"
              >
                Divisi{" "}
                <span className="font-sans normal-case tracking-normal text-[var(--ink-muted)]">
                  (Opsional)
                </span>
              </label>
              <select
                id="user-division"
                name="divisionId"
                value={divisionId}
                onChange={(e) => setDivisionId(e.target.value)}
                aria-invalid={Boolean(errors.divisionId) ? "true" : "false"}
                className="select otium-field-input mt-1 w-full"
              >
                <option value="">Belum ditetapkan (NULL)</option>
                {divisions.map((div) => (
                  <option key={div.id} value={String(div.id)}>
                    {div.name}
                  </option>
                ))}
              </select>
              {errors.divisionId && (
                <p className="mt-1.5 text-[11.5px] font-medium text-[var(--terracotta)]">
                  {errors.divisionId}
                </p>
              )}
            </div>

            {/* Kuota Awal */}
            <div>
              <label
                htmlFor="user-initial-quota"
                className="block text-xs font-semibold text-[var(--ink-soft)]"
              >
                Kuota Cuti Tahunan Awal (Hari){" "}
                <span className="text-[var(--terracotta)]">*</span>
              </label>
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
                className={`${inputBaseClass} font-mono tabular-nums`}
              />
              <span
                id="user-initial-quota-hint"
                className="mt-1 block text-[11px] text-[var(--ink-muted)]"
              >
                Mendukung kelipatan 0.5 hari (default 12.0).
              </span>
              {errors.initialLeaveQuota && (
                <p
                  id="user-initial-quota-error"
                  className="mt-1.5 flex items-start gap-1 text-[11.5px] font-medium text-[var(--terracotta)]"
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
                  className="block text-xs font-semibold text-[var(--ink-soft)]"
                >
                  Sisa Kuota Saat Ini (Hari){" "}
                  <span className="text-[var(--terracotta)]">*</span>
                </label>
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
                  className={`${inputBaseClass} font-mono tabular-nums`}
                />
                <span
                  id="user-remaining-quota-hint"
                  className="mt-1 block text-[11px] text-[var(--ink-muted)]"
                >
                  Saldo realtime saat ini (kelipatan 0.5 hari).
                </span>
                {errors.remainingLeaveQuota && (
                  <p
                    id="user-remaining-quota-error"
                    className="mt-1.5 flex items-start gap-1 text-[11.5px] font-medium text-[var(--terracotta)]"
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
                  className="block text-xs font-semibold text-[var(--ink-soft)]"
                >
                  Tanggal Bergabung <span className="text-[var(--terracotta)]">*</span>
                </label>
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
                  className={`${inputBaseClass} font-mono tabular-nums`}
                />
                <span
                  id="user-joindate-hint"
                  className="mt-1 block text-[11px] text-[var(--ink-muted)]"
                >
                  Acuan kelayakan Cuti Tahunan (masa kerja &ge; 1 tahun).
                </span>
                {errors.joinDate && (
                  <p
                    id="user-joindate-error"
                    className="mt-1.5 flex items-start gap-1 text-[11.5px] font-medium text-[var(--terracotta)]"
                  >
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>{errors.joinDate}</span>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Join Date (Edit), Kontak & Status Akun */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {isEdit && (
              <div>
                <label
                  htmlFor="user-joindate-edit"
                  className="block text-xs font-semibold text-[var(--ink-soft)]"
                >
                  Tanggal Bergabung <span className="text-[var(--terracotta)]">*</span>
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
                  className={`${inputBaseClass} font-mono tabular-nums`}
                />
                {errors.joinDate && (
                  <p
                    id="user-joindate-edit-error"
                    className="mt-1.5 flex items-start gap-1 text-[11.5px] font-medium text-[var(--terracotta)]"
                  >
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>{errors.joinDate}</span>
                  </p>
                )}
              </div>
            )}

            {/* Nomor Telepon */}
            <div>
              <label
                htmlFor="user-phone"
                className="block text-xs font-semibold text-[var(--ink-soft)]"
              >
                Nomor Telepon{" "}
                <span className="font-normal text-[var(--ink-muted)]">
                  (Opsional)
                </span>
              </label>
              <input
                id="user-phone"
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                maxLength={20}
                value={phone}
                onChange={(e) =>
                  handleFieldChange("phone", setPhone, e.target.value)
                }
                onBlur={() => handleBlur("phone")}
                aria-invalid={Boolean(errors.phone) ? "true" : "false"}
                aria-describedby={
                  errors.phone
                    ? "user-phone-hint user-phone-error"
                    : "user-phone-hint"
                }
                placeholder="Contoh: 081234567890"
                className={`${inputBaseClass} font-mono`}
              />
              <span
                id="user-phone-hint"
                className="mt-1 block text-[11px] text-[var(--ink-muted)]"
              >
                8–20 karakter (angka, +, -, spasi, atau kurung).
              </span>
              {errors.phone && (
                <p
                  id="user-phone-error"
                  className="mt-1.5 flex items-start gap-1 text-[11.5px] font-medium text-[var(--terracotta)]"
                >
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>{errors.phone}</span>
                </p>
              )}
            </div>

            {!isEdit && (
              <div>
                <span className="block text-xs font-semibold text-[var(--ink-soft)]">
                  Status Akun
                </span>
                <label className="otium-checkbox-label mt-1.5 flex cursor-pointer items-center gap-3 rounded-[4px] border border-[var(--rule-strong)] bg-[var(--alabaster)] px-3.5 py-2.5 transition-colors duration-150 hover:bg-[var(--paper)]">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="otium-checkbox h-4 w-4 cursor-pointer rounded"
                  />
                  <span className="text-[12.5px] font-medium text-[var(--ink)]">
                    Akun Aktif (Dapat Login &amp; Bertransaksi Cuti)
                  </span>
                </label>
              </div>
            )}

            {/* Alamat Domisili */}
            <div className="sm:col-span-2">
              <label
                htmlFor="user-address"
                className="block text-xs font-semibold text-[var(--ink-soft)]"
              >
                Alamat Domisili{" "}
                <span className="font-normal text-[var(--ink-muted)]">
                  (Opsional)
                </span>
              </label>
              <textarea
                id="user-address"
                name="address"
                rows={2}
                maxLength={500}
                autoComplete="street-address"
                value={address}
                onChange={(e) =>
                  handleFieldChange("address", setAddress, e.target.value)
                }
                onBlur={() => handleBlur("address")}
                aria-invalid={Boolean(errors.address) ? "true" : "false"}
                aria-describedby={
                  errors.address
                    ? "user-address-hint user-address-error"
                    : "user-address-hint"
                }
                placeholder="Contoh: Jl. Jend. Sudirman No. 1, Jakarta"
                className="textarea otium-field-input mt-1 w-full"
              />
              <span
                id="user-address-hint"
                className="mt-1 block text-[11px] text-[var(--ink-muted)]"
              >
                Maksimal 500 karakter. Digunakan sebagai default kontak saat pengajuan cuti.
              </span>
              {errors.address && (
                <p
                  id="user-address-error"
                  className="mt-1.5 flex items-start gap-1 text-[11.5px] font-medium text-[var(--terracotta)]"
                >
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>{errors.address}</span>
                </p>
              )}
            </div>

            {isEdit && (
              <div className="sm:col-span-2">
                <span className="block text-xs font-semibold text-[var(--ink-soft)]">
                  Status Akun
                </span>
                <label
                  className={`otium-checkbox-label mt-1.5 flex items-center gap-3 rounded-[4px] border border-[var(--rule-strong)] px-3.5 py-2.5 transition-colors duration-150 ${
                    isEditingSelf
                      ? "cursor-not-allowed bg-[var(--alabaster)] opacity-70"
                      : "cursor-pointer bg-[var(--alabaster)] hover:bg-[var(--paper)]"
                  }`}
                >
                  <input
                    type="checkbox"
                    disabled={isEditingSelf}
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="otium-checkbox h-4 w-4 cursor-pointer rounded disabled:cursor-not-allowed"
                  />
                  <span className="text-[12.5px] font-medium text-[var(--ink)]">
                    Akun Aktif (Dapat Login &amp; Bertransaksi Cuti)
                  </span>
                </label>
              </div>
            )}
          </div>

          {/* Live Preview Kelayakan Masa Kerja 1 Tahun */}
          <div
            className={`notice ${
              tenurePreview.isEligible ? "notice-success" : "notice-warn"
            }`}
          >
            {tenurePreview.isEligible ? (
              <CheckCircle2
                className="mt-0.5 h-4 w-4 shrink-0"
                aria-hidden="true"
              />
            ) : (
              <AlertCircle
                className="mt-0.5 h-4 w-4 shrink-0"
                aria-hidden="true"
              />
            )}
            <div>
              <p className="font-semibold text-[var(--ink)]">
                Evaluasi Masa Kerja: {tenurePreview.label} —{" "}
                {tenurePreview.isEligible
                  ? "Eligible Cuti Tahunan (≥ 1 Tahun)"
                  : "Belum Eligible Cuti Tahunan (< 1 Tahun)"}
              </p>
              <p className="mt-0.5 text-[11.5px]">
                Dihitung terhadap tanggal server hari ini (
                <span className="font-mono">{todayIso}</span>). Karyawan dengan
                masa kerja &lt; 1 tahun tetap dapat mengajukan Cuti Sakit atau
                Cuti Lainnya.
              </p>
            </div>
          </div>

          {/* Peringatan otomatis bila Ketua Divisi aktif diubah role / dinonaktifkan */}
          {willReleaseLeadership && (
            <div className="notice notice-danger">
              <AlertTriangle
                className="mt-0.5 h-4 w-4 shrink-0"
                aria-hidden="true"
              />
              <div>
                <p className="font-semibold text-[var(--ink)]">
                  Posisi Ketua Divisi Akan Dilepas Otomatis
                </p>
                <p className="mt-0.5 text-[12px]">
                  Akun ini sedang memimpin divisi{" "}
                  <strong>{ledDivision.name}</strong>. Mengubah role menjadi
                  selain <em>Ketua Divisi</em> atau menonaktifkan akun akan
                  mengosongkan{" "}
                  <code className="font-mono">divisions.leader_id</code> divisi
                  tersebut dalam satu transaksi SQL atomik.
                </p>
              </div>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-[var(--rule)] bg-[var(--alabaster)] px-6 py-3.5">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => onClose?.()}
            className="btn btn-sm"
          >
            Batal
          </button>
          <button
            type="submit"
            form="admin-user-form"
            disabled={isSubmitting}
            className="btn btn-sm btn-primary"
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
