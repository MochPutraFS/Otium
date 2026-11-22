"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Loader2,
  Lock,
  Save,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import {
  buildLeaveTypeRuleSummary,
  isCoreLeaveTypeCode,
} from "@/lib/leave-type-utils";

const CODE_REGEX = /^[A-Z0-9_]{2,30}$/;

/**
 * Modal Tambah / Edit Jenis Cuti Dinamis (CMS Modul 4) — Native <dialog className="otium-modal">.
 * Mendukung validasi pasca-interaksi (blur-validate, input-clear), fokus ke field invalid pertama,
 * penguncian kode inti (ANNUAL / SICK) saat mode Edit, dan sinkronisasi error server.
 */
export default function LeaveTypeFormModal({
  isOpen,
  mode = "create",
  initialLeaveType = null,
  existingLeaveTypes = [],
  isSubmitting = false,
  serverError = "",
  serverFieldErrors = null,
  onClose,
  onSubmit,
}) {
  const isEdit = mode === "edit" && Boolean(initialLeaveType);
  const isCoreLocked =
    isEdit && isCoreLeaveTypeCode(initialLeaveType?.code);

  const dialogRef = useRef(null);
  const codeInputRef = useRef(null);
  const nameInputRef = useRef(null);
  const maxQuotaInputRef = useRef(null);
  const leadTimeInputRef = useRef(null);
  const descriptionInputRef = useRef(null);

  const formId = useId();
  const titleId = useId();
  const codeId = useId();
  const codeHelpId = useId();
  const codeErrorId = useId();
  const nameId = useId();
  const nameErrorId = useId();
  const quotaId = useId();
  const quotaHelpId = useId();
  const quotaErrorId = useId();
  const leadId = useId();
  const leadHelpId = useId();
  const leadErrorId = useId();
  const descId = useId();
  const descErrorId = useId();
  const toggleAttachmentId = useId();
  const toggleDeductId = useId();
  const toggleTenureId = useId();
  const toggleActiveId = useId();

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [maxQuota, setMaxQuota] = useState("3.0");
  const [minSubmissionDays, setMinSubmissionDays] = useState("0");
  const [requiresAttachment, setRequiresAttachment] = useState(false);
  const [deductsAnnualQuota, setDeductsAnnualQuota] = useState(false);
  const [requiresMinOneYearTenure, setRequiresMinOneYearTenure] =
    useState(false);
  const [isActive, setIsActive] = useState(true);
  const [description, setDescription] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  // Reset nilai form setiap kali modal dibuka
  useEffect(() => {
    if (!isOpen) return;

    if (isEdit && initialLeaveType) {
      setCode(initialLeaveType.code || "");
      setName(initialLeaveType.name || "");
      setMaxQuota(Number(initialLeaveType.maxQuota ?? 1).toFixed(1));
      setMinSubmissionDays(String(initialLeaveType.minSubmissionDays ?? 0));
      setRequiresAttachment(Boolean(initialLeaveType.requiresAttachment));
      setDeductsAnnualQuota(Boolean(initialLeaveType.deductsAnnualQuota));
      setRequiresMinOneYearTenure(
        Boolean(initialLeaveType.requiresMinOneYearTenure)
      );
      setIsActive(Boolean(initialLeaveType.isActive));
      setDescription(initialLeaveType.description || "");
    } else {
      setCode("");
      setName("");
      setMaxQuota("3.0");
      setMinSubmissionDays("0");
      setRequiresAttachment(false);
      setDeductsAnnualQuota(false);
      setRequiresMinOneYearTenure(false);
      setIsActive(true);
      setDescription("");
    }
    setFieldErrors({});
  }, [isOpen, isEdit, initialLeaveType]);

  // Sinkronisasi fieldErrors dari Server Action
  useEffect(() => {
    if (serverFieldErrors && typeof serverFieldErrors === "object") {
      setFieldErrors((prev) => ({ ...prev, ...serverFieldErrors }));
    }
  }, [serverFieldErrors]);

  // Sinkronisasi native <dialog> top-layer
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
      const focusTarget = isCoreLocked
        ? nameInputRef.current
        : codeInputRef.current;
      focusTarget?.focus();
    } else if (dialog.open) {
      dialog.close();
      dialog.returnValue = "";
    }
  }, [isOpen, isCoreLocked]);

  // Event cancel/close & Safari light-dismiss fallback (pointerdown + pointerup)
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

  const rulePreview = useMemo(
    () =>
      buildLeaveTypeRuleSummary({
        maxQuota,
        minSubmissionDays,
        requiresAttachment,
        deductsAnnualQuota,
        requiresMinOneYearTenure,
      }),
    [
      maxQuota,
      minSubmissionDays,
      requiresAttachment,
      deductsAnnualQuota,
      requiresMinOneYearTenure,
    ]
  );

  function validateClientFields(
    values = { code, name, maxQuota, minSubmissionDays, description }
  ) {
    const nextErrors = {};
    const normalizedCode = String(values.code || "")
      .trim()
      .toUpperCase();
    const trimmedName = String(values.name || "").trim();

    if (!normalizedCode || !CODE_REGEX.test(normalizedCode)) {
      nextErrors.code =
        "Kode wajib 2–30 karakter huruf kapital, angka, atau underscore (mis. MARRIAGE).";
    } else {
      const dupCode = existingLeaveTypes.some(
        (lt) =>
          lt.code.toUpperCase() === normalizedCode &&
          (!isEdit || lt.id !== initialLeaveType?.id)
      );
      if (dupCode) {
        nextErrors.code = "Kode jenis cuti sudah digunakan.";
      }
    }

    if (trimmedName.length < 3) {
      nextErrors.name = "Nama jenis cuti minimal 3 karakter.";
    } else if (trimmedName.length > 100) {
      nextErrors.name = "Nama jenis cuti maksimal 100 karakter.";
    } else {
      const dupName = existingLeaveTypes.some(
        (lt) =>
          lt.name.toLowerCase() === trimmedName.toLowerCase() &&
          (!isEdit || lt.id !== initialLeaveType?.id)
      );
      if (dupName) {
        nextErrors.name = "Nama jenis cuti sudah terdaftar.";
      }
    }

    const parsedQuota = Number(values.maxQuota);
    if (
      values.maxQuota === "" ||
      !Number.isFinite(parsedQuota) ||
      parsedQuota <= 0 ||
      parsedQuota > 365
    ) {
      nextErrors.maxQuota = "Kuota maksimal harus > 0 dan <= 365 hari.";
    } else if (Math.round(parsedQuota * 2) !== parsedQuota * 2) {
      nextErrors.maxQuota = "Kuota maksimal harus kelipatan 0.5 hari.";
    }

    const parsedLead = Number(values.minSubmissionDays);
    if (
      values.minSubmissionDays === "" ||
      !Number.isFinite(parsedLead) ||
      !Number.isInteger(parsedLead) ||
      parsedLead < -30 ||
      parsedLead > 90
    ) {
      nextErrors.minSubmissionDays =
        "Batas waktu pengajuan harus bilangan bulat (-30 s.d. 90).";
    }

    if (String(values.description || "").trim().length > 500) {
      nextErrors.description = "Deskripsi maksimal 500 karakter.";
    }

    return nextErrors;
  }

  function handleBlurField(fieldName) {
    const nextErrors = validateClientFields();
    setFieldErrors((prev) => ({
      ...prev,
      [fieldName]: nextErrors[fieldName] || "",
    }));
  }

  function clearFieldError(fieldName) {
    setFieldErrors((prev) =>
      prev[fieldName] ? { ...prev, [fieldName]: "" } : prev
    );
  }

  function focusFirstInvalidField(errorsMap) {
    const fieldOrder = [
      { key: "code", ref: codeInputRef },
      { key: "name", ref: nameInputRef },
      { key: "maxQuota", ref: maxQuotaInputRef },
      { key: "minSubmissionDays", ref: leadTimeInputRef },
      { key: "description", ref: descriptionInputRef },
    ];
    for (const item of fieldOrder) {
      if (errorsMap[item.key] && item.ref.current) {
        item.ref.current.focus();
        return;
      }
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (isSubmitting) return;

    const nextErrors = validateClientFields();
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      focusFirstInvalidField(nextErrors);
      return;
    }

    onSubmit?.({
      id: isEdit ? initialLeaveType.id : undefined,
      code: isCoreLocked ? initialLeaveType.code : code.trim().toUpperCase(),
      name: name.trim(),
      maxQuota: Number(Number(maxQuota).toFixed(1)),
      minSubmissionDays: Number(minSubmissionDays),
      requiresAttachment,
      deductsAnnualQuota,
      requiresMinOneYearTenure,
      isActive,
      description: description.trim(),
    });
  }

  const toggleItems = [
    {
      id: toggleAttachmentId,
      name: "requires_attachment",
      checked: requiresAttachment,
      onChange: setRequiresAttachment,
      title: "Wajib Upload Lampiran Dokumen / Surat Bukti",
      subtitle:
        "Memaksa pemohon mengunggah PDF/JPG/PNG saat pengajuan (mis. Surat Dokter).",
    },
    {
      id: toggleDeductId,
      name: "deducts_annual_quota",
      checked: deductsAnnualQuota,
      onChange: setDeductsAnnualQuota,
      title: "Memotong Saldo Kuota Cuti Tahunan Utama (12 Hari)",
      subtitle:
        "Mengurangi remaining_leave_quota saat submit & auto-refund saat batal/ditolak.",
    },
    {
      id: toggleTenureId,
      name: "requires_min_one_year_tenure",
      checked: requiresMinOneYearTenure,
      onChange: setRequiresMinOneYearTenure,
      title: "Wajib Masa Kerja Minimal 1 Tahun",
      subtitle:
        "Memblokir karyawan dengan masa kerja < 1 tahun dari pengajuan kategori ini.",
    },
    {
      id: toggleActiveId,
      name: "is_active",
      checked: isActive,
      onChange: setIsActive,
      title: "Status Jenis Cuti Aktif",
      subtitle:
        "Jika nonaktif, disembunyikan dari dropdown Form Pengajuan tanpa menghapus riwayat.",
    },
  ];

  return (
    <dialog
      ref={dialogRef}
      className="otium-modal"
      aria-labelledby={titleId}
      closedby={isSubmitting ? "none" : "any"}
    >
      <div className="flex max-h-[calc(100dvh-2rem)] w-[min(42rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-[6px] border border-[var(--ink)] bg-[var(--paper-pure)] shadow-[var(--shadow-lg)]">
        {/* Header Editorial */}
        <div className="flex items-start justify-between gap-4 border-b border-[var(--rule)] bg-[var(--alabaster)] px-6 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[4px] border border-[var(--rule-strong)] bg-[var(--paper-pure)] text-[var(--spruce)]">
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--ink-muted)]">
                {isEdit ? "PERBARUI KONFIGURASI" : "KATEGORI BARU"} · LEAVE_TYPES
              </p>
              <h2
                id={titleId}
                className="mt-0.5 font-serif text-[20px] font-semibold leading-snug text-[var(--ink)]"
              >
                {isEdit ? "Ubah Jenis Cuti Dinamis" : "Tambah Jenis Cuti Baru"}
              </h2>
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
          id={formId}
          method="post"
          noValidate
          aria-labelledby={titleId}
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Kode Unik */}
            <div>
              <label
                htmlFor={codeId}
                className="flex items-center justify-between font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-[var(--ink-soft)]"
              >
                <span>
                  Kode Unik Jenis Cuti{" "}
                  <span className="text-[var(--terracotta)]" aria-hidden="true">
                    *
                  </span>
                </span>
                {isCoreLocked && (
                  <span className="tag text-[9.5px]">
                    <Lock className="h-2.5 w-2.5" aria-hidden="true" />
                    Kode Inti
                  </span>
                )}
              </label>
              <input
                ref={codeInputRef}
                id={codeId}
                name="code"
                type="text"
                required
                readOnly={isCoreLocked}
                maxLength={30}
                autoCorrect="off"
                autoCapitalize="characters"
                spellCheck={false}
                enterKeyHint="next"
                value={code}
                onChange={(e) => {
                  if (isCoreLocked) return;
                  setCode(e.target.value.toUpperCase());
                  clearFieldError("code");
                }}
                onBlur={() => {
                  if (!isCoreLocked) handleBlurField("code");
                }}
                aria-invalid={fieldErrors.code ? "true" : undefined}
                aria-describedby={
                  fieldErrors.code ? `${codeHelpId} ${codeErrorId}` : codeHelpId
                }
                placeholder="Contoh: MARRIAGE"
                className={`input otium-field-input mt-1.5 w-full font-mono uppercase ${
                  isCoreLocked ? "cursor-not-allowed opacity-70" : ""
                }`}
              />
              <p id={codeHelpId} className="mt-1 text-[11px] text-[var(--ink-muted)]">
                {isCoreLocked
                  ? "Kode inti dikunci agar aturan sistem (H-3 / H+3) tetap konsisten."
                  : "Huruf kapital, angka, atau underscore (2–30 karakter)."}
              </p>
              {fieldErrors.code && (
                <p
                  id={codeErrorId}
                  role="alert"
                  className="mt-1 text-[11.5px] font-medium text-[var(--terracotta)]"
                >
                  {fieldErrors.code}
                </p>
              )}
            </div>

            {/* Nama Jenis Cuti */}
            <div>
              <label
                htmlFor={nameId}
                className="block font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-[var(--ink-soft)]"
              >
                Nama Jenis Cuti{" "}
                <span className="text-[var(--terracotta)]" aria-hidden="true">
                  *
                </span>
              </label>
              <input
                ref={nameInputRef}
                id={nameId}
                name="name"
                type="text"
                required
                minLength={3}
                maxLength={100}
                enterKeyHint="next"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  clearFieldError("name");
                }}
                onBlur={() => handleBlurField("name")}
                aria-invalid={fieldErrors.name ? "true" : undefined}
                aria-describedby={fieldErrors.name ? nameErrorId : undefined}
                placeholder="Contoh: Cuti Menikah"
                className="input otium-field-input mt-1.5 w-full"
              />
              {fieldErrors.name && (
                <p
                  id={nameErrorId}
                  role="alert"
                  className="mt-1 text-[11.5px] font-medium text-[var(--terracotta)]"
                >
                  {fieldErrors.name}
                </p>
              )}
            </div>

            {/* Kuota Maksimal */}
            <div>
              <label
                htmlFor={quotaId}
                className="block font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-[var(--ink-soft)]"
              >
                Kuota Maksimal (Hari){" "}
                <span className="text-[var(--terracotta)]" aria-hidden="true">
                  *
                </span>
              </label>
              <input
                ref={maxQuotaInputRef}
                id={quotaId}
                name="max_quota"
                type="number"
                required
                step="0.5"
                min="0.5"
                max="365"
                inputMode="decimal"
                enterKeyHint="next"
                value={maxQuota}
                onChange={(e) => {
                  setMaxQuota(e.target.value);
                  clearFieldError("maxQuota");
                }}
                onBlur={() => handleBlurField("maxQuota")}
                aria-invalid={fieldErrors.maxQuota ? "true" : undefined}
                aria-describedby={
                  fieldErrors.maxQuota
                    ? `${quotaHelpId} ${quotaErrorId}`
                    : quotaHelpId
                }
                className="input otium-field-input mt-1.5 w-full font-mono tabular-nums"
              />
              <p id={quotaHelpId} className="mt-1 text-[11px] text-[var(--ink-muted)]">
                Mendukung pecahan kelipatan <code className="font-mono">0.5</code>{" "}
                hari (maks. 365).
              </p>
              {fieldErrors.maxQuota && (
                <p
                  id={quotaErrorId}
                  role="alert"
                  className="mt-1 text-[11.5px] font-medium text-[var(--terracotta)]"
                >
                  {fieldErrors.maxQuota}
                </p>
              )}
            </div>

            {/* Batas Waktu Pengajuan */}
            <div>
              <label
                htmlFor={leadId}
                className="block font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-[var(--ink-soft)]"
              >
                Batas Waktu Pengajuan (Hari Kalender){" "}
                <span className="text-[var(--terracotta)]" aria-hidden="true">
                  *
                </span>
              </label>
              <input
                ref={leadTimeInputRef}
                id={leadId}
                name="min_submission_days"
                type="number"
                required
                step="1"
                min="-30"
                max="90"
                inputMode="numeric"
                enterKeyHint="next"
                value={minSubmissionDays}
                onChange={(e) => {
                  setMinSubmissionDays(e.target.value);
                  clearFieldError("minSubmissionDays");
                }}
                onBlur={() => handleBlurField("minSubmissionDays")}
                aria-invalid={fieldErrors.minSubmissionDays ? "true" : undefined}
                aria-describedby={
                  fieldErrors.minSubmissionDays
                    ? `${leadHelpId} ${leadErrorId}`
                    : leadHelpId
                }
                className="input otium-field-input mt-1.5 w-full font-mono tabular-nums"
              />
              <p id={leadHelpId} className="mt-1 text-[11px] text-[var(--ink-muted)]">
                Positif = Min. H-n (mis. <code className="font-mono">3</code>),{" "}
                <code className="font-mono">0</code> = H-0, Negatif = Maks. H+n
                (mis. <code className="font-mono">-3</code>).
              </p>
              {fieldErrors.minSubmissionDays && (
                <p
                  id={leadErrorId}
                  role="alert"
                  className="mt-1 text-[11.5px] font-medium text-[var(--terracotta)]"
                >
                  {fieldErrors.minSubmissionDays}
                </p>
              )}
            </div>
          </div>

          {/* Business Rules Toggles dalam <fieldset> + <legend> semantik */}
          <fieldset className="space-y-2.5">
            <legend className="font-mono text-[10.5px] font-medium uppercase tracking-[0.12em] text-[var(--ink-muted)]">
              Pengaturan Aturan Bisnis (Business Rules)
            </legend>
            <div className="space-y-2">
              {toggleItems.map((item) => (
                <label
                  key={item.id}
                  htmlFor={item.id}
                  className="otium-checkbox-label flex cursor-pointer items-start gap-3 rounded-[4px] border border-[var(--rule)] bg-[var(--alabaster)] px-3.5 py-3 transition-colors duration-150 hover:border-[var(--rule-strong)] hover:bg-[var(--paper)]"
                >
                  <input
                    id={item.id}
                    name={item.name}
                    type="checkbox"
                    checked={item.checked}
                    onChange={(e) => item.onChange(e.target.checked)}
                    className="otium-checkbox mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded"
                  />
                  <span className="block">
                    <span className="block text-[12.5px] font-semibold text-[var(--ink)]">
                      {item.title}
                    </span>
                    <span className="mt-0.5 block text-[11.5px] leading-relaxed text-[var(--ink-soft)]">
                      {item.subtitle}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Pratinjau Ringkasan Aturan */}
          <div className="notice notice-info">
            <Sparkles
              className="mt-0.5 h-4 w-4 shrink-0"
              aria-hidden="true"
            />
            <div>
              <p className="font-semibold text-[var(--ink)]">
                Pratinjau Ringkasan Aturan di Form Pemohon
              </p>
              <p className="mt-0.5 leading-relaxed">{rulePreview}</p>
            </div>
          </div>

          {/* Deskripsi / Panduan Pemohon */}
          <div>
            <div className="flex items-center justify-between">
              <label
                htmlFor={descId}
                className="block font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-[var(--ink-soft)]"
              >
                Deskripsi / Panduan Pemohon{" "}
                <span className="font-sans normal-case tracking-normal text-[var(--ink-muted)]">
                  (Opsional)
                </span>
              </label>
              <span className="font-mono text-[11px] tabular-nums text-[var(--ink-muted)]">
                {description.length}/500
              </span>
            </div>
            <textarea
              ref={descriptionInputRef}
              id={descId}
              name="description"
              rows={3}
              maxLength={500}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                clearFieldError("description");
              }}
              onBlur={() => handleBlurField("description")}
              aria-invalid={fieldErrors.description ? "true" : undefined}
              aria-describedby={fieldErrors.description ? descErrorId : undefined}
              placeholder="Tuliskan persyaratan dokumen atau panduan pengajuan jenis cuti ini..."
              className="textarea otium-field-input mt-1.5 w-full"
            />
            {fieldErrors.description && (
              <p
                id={descErrorId}
                role="alert"
                className="mt-1 text-[11.5px] font-medium text-[var(--terracotta)]"
              >
                {fieldErrors.description}
              </p>
            )}
          </div>
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
            form={formId}
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
                : "Simpan Jenis Cuti"}
          </button>
        </div>
      </div>
    </dialog>
  );
}
