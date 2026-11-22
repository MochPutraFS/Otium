"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { AlertCircle, Building2, Loader2, Save, X } from "lucide-react";

/**
 * Modal Tambah / Edit Divisi (CMS Modul 2) — Native <dialog className="otium-modal">.
 * Memuat kandidat Ketua Divisi secara live dari GET /api/divisions/available-leaders
 * untuk menegakkan aturan 1 Ketua Divisi maksimal memimpin 1 divisi aktif.
 */
export default function DivisionFormModal({
  isOpen,
  mode = "create",
  initialDivision = null,
  divisions = [],
  initialAvailableLeaders = [],
  isSubmitting = false,
  serverError = "",
  serverFieldErrors = null,
  onClose,
  onSubmit,
}) {
  const isEdit = mode === "edit" && Boolean(initialDivision);
  const dialogRef = useRef(null);
  const nameInputRef = useRef(null);
  const titleId = useId();
  const nameId = useId();
  const nameErrorId = useId();
  const descId = useId();
  const descErrorId = useId();
  const leaderIdField = useId();
  const leaderErrorId = useId();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [leaderId, setLeaderId] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched] = useState({});

  const [availableLeaders, setAvailableLeaders] = useState(
    initialAvailableLeaders
  );
  const [isLoadingLeaders, setIsLoadingLeaders] = useState(false);
  const [leadersLoadError, setLeadersLoadError] = useState("");

  // Reset form & fetch live kandidat Ketua Divisi saat modal dibuka
  useEffect(() => {
    if (!isOpen) return;

    if (isEdit && initialDivision) {
      setName(initialDivision.name || "");
      setDescription(initialDivision.description || "");
      setLeaderId(
        initialDivision.leaderId ? String(initialDivision.leaderId) : ""
      );
    } else {
      setName("");
      setDescription("");
      setLeaderId("");
    }
    setFieldErrors({});
    setTouched({});
    setLeadersLoadError("");

    let cancelled = false;
    async function fetchAvailableLeaders() {
      setIsLoadingLeaders(true);
      try {
        const querySuffix =
          isEdit && initialDivision?.id
            ? `?currentDivisionId=${encodeURIComponent(initialDivision.id)}`
            : "";
        const res = await fetch(
          `/api/divisions/available-leaders${querySuffix}`,
          {
            method: "GET",
            cache: "no-store",
          }
        );
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok || !data.ok) {
          setLeadersLoadError(
            data.error || "Gagal memuat daftar kandidat Ketua Divisi."
          );
          return;
        }
        setAvailableLeaders(data.leaders || []);
      } catch {
        if (!cancelled) {
          setLeadersLoadError(
            "Koneksi bermasalah saat memuat kandidat Ketua Divisi."
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingLeaders(false);
        }
      }
    }

    fetchAvailableLeaders();
    return () => {
      cancelled = true;
    };
  }, [isOpen, isEdit, initialDivision]);

  // Sinkronkan fieldErrors dari server bila ada
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
    } else if (dialog.open) {
      dialog.close();
      dialog.returnValue = "";
    }
  }, [isOpen]);

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

  function validateClientFields(values = { name, description, leaderId }) {
    const nextErrors = {};
    const trimmedName = values.name.trim();

    if (trimmedName.length < 2) {
      nextErrors.name = "Nama divisi wajib diisi (minimal 2 karakter).";
    } else if (trimmedName.length > 100) {
      nextErrors.name = "Nama divisi maksimal 100 karakter.";
    } else {
      const duplicate = divisions.some(
        (d) =>
          d.name.toLowerCase() === trimmedName.toLowerCase() &&
          (!isEdit || d.id !== initialDivision?.id)
      );
      if (duplicate) {
        nextErrors.name = "Nama divisi sudah digunakan. Pilih nama lain.";
      }
    }

    if (values.description.trim().length > 500) {
      nextErrors.description = "Deskripsi divisi maksimal 500 karakter.";
    }

    if (!values.leaderId) {
      nextErrors.leaderId =
        "Ketua Divisi wajib dipilih dari kandidat yang tersedia.";
    }

    return nextErrors;
  }

  function handleBlurField(fieldName) {
    setTouched((prev) => ({ ...prev, [fieldName]: true }));
    const nextErrors = validateClientFields();
    setFieldErrors((prev) => ({
      ...prev,
      [fieldName]: nextErrors[fieldName] || "",
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validateClientFields();
    setTouched({ name: true, description: true, leaderId: true });
    setFieldErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      if (nextErrors.name) {
        nameInputRef.current?.focus();
      }
      return;
    }

    onSubmit?.({
      id: isEdit ? initialDivision.id : undefined,
      name: name.trim(),
      description: description.trim(),
      leaderId: Number(leaderId),
    });
  }

  const nameError = fieldErrors.name || "";
  const descError = fieldErrors.description || "";
  const leaderError = fieldErrors.leaderId || "";

  return (
    <dialog
      ref={dialogRef}
      closedby={isSubmitting ? "none" : "any"}
      aria-labelledby={titleId}
      className="otium-modal w-full max-w-lg"
    >
      <div className="flex max-h-[calc(100dvh-2rem)] w-full flex-col overflow-hidden rounded-[6px] border border-[var(--ink)] bg-[var(--paper-pure)] shadow-[var(--shadow-lg)]">
        {/* Header Editorial */}
        <div className="flex items-start justify-between gap-3 border-b border-[var(--rule)] bg-[var(--alabaster)] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[4px] border border-[var(--rule-strong)] bg-[var(--paper-pure)] text-[var(--spruce)]">
              <Building2 className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--ink-muted)]">
                {isEdit ? "PERBARUI MASTER DIVISI" : "REGISTRASI DIVISI BARU"}
              </p>
              <h2
                id={titleId}
                className="font-serif text-[20px] font-semibold leading-snug text-[var(--ink)]"
              >
                {isEdit ? "Edit Data Divisi" : "Buat Divisi Baru"}
              </h2>
            </div>
          </div>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => onClose?.()}
            aria-label="Tutup modal form divisi"
            className="btn-icon h-7 w-7 shrink-0"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Form Body */}
        <form
          onSubmit={handleSubmit}
          noValidate
          className="flex flex-1 flex-col overflow-y-auto"
        >
          <div className="space-y-4 px-5 py-5">
            {serverError && (
              <div role="alert" className="notice notice-danger">
                <AlertCircle
                  className="mt-0.5 h-4 w-4 shrink-0"
                  aria-hidden="true"
                />
                <span>{serverError}</span>
              </div>
            )}

            {/* Nama Divisi */}
            <div>
              <label
                htmlFor={nameId}
                className="block font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-[var(--ink-soft)]"
              >
                Nama Divisi <span className="text-[var(--terracotta)]">*</span>
              </label>
              <input
                ref={nameInputRef}
                id={nameId}
                type="text"
                required
                minLength={2}
                maxLength={100}
                autoFocus
                value={name}
                onChange={(e) => {
                  const nextVal = e.target.value;
                  setName(nextVal);
                  if (touched.name || fieldErrors.name) {
                    const errs = validateClientFields({
                      name: nextVal,
                      description,
                      leaderId,
                    });
                    setFieldErrors((prev) => ({
                      ...prev,
                      name: errs.name || "",
                    }));
                  }
                }}
                onBlur={() => handleBlurField("name")}
                aria-invalid={nameError ? "true" : "false"}
                aria-describedby={nameError ? nameErrorId : undefined}
                placeholder="Contoh: Finance & Accounting"
                className="input otium-field-input mt-1.5 w-full"
              />
              {nameError && (
                <p
                  id={nameErrorId}
                  className="mt-1.5 flex items-center gap-1 text-[11.5px] font-medium text-[var(--terracotta)]"
                >
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>{nameError}</span>
                </p>
              )}
            </div>

            {/* Deskripsi Singkat */}
            <div>
              <label
                htmlFor={descId}
                className="block font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-[var(--ink-soft)]"
              >
                Deskripsi Singkat{" "}
                <span className="font-sans normal-case tracking-normal text-[var(--ink-muted)]">
                  (Opsional)
                </span>
              </label>
              <textarea
                id={descId}
                rows={3}
                maxLength={500}
                value={description}
                onChange={(e) => {
                  const nextVal = e.target.value;
                  setDescription(nextVal);
                  if (touched.description || fieldErrors.description) {
                    const errs = validateClientFields({
                      name,
                      description: nextVal,
                      leaderId,
                    });
                    setFieldErrors((prev) => ({
                      ...prev,
                      description: errs.description || "",
                    }));
                  }
                }}
                onBlur={() => handleBlurField("description")}
                aria-invalid={descError ? "true" : "false"}
                aria-describedby={descError ? descErrorId : undefined}
                placeholder="Uraikan ruang lingkup dan tanggung jawab utama divisi ini..."
                className="textarea otium-field-input mt-1.5 w-full"
              />
              {descError && (
                <p
                  id={descErrorId}
                  className="mt-1.5 flex items-center gap-1 text-[11.5px] font-medium text-[var(--terracotta)]"
                >
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>{descError}</span>
                </p>
              )}
            </div>

            {/* Dropdown Kandidat Ketua Divisi */}
            <div>
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor={leaderIdField}
                  className="block font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-[var(--ink-soft)]"
                >
                  Ketua Divisi <span className="text-[var(--terracotta)]">*</span>
                </label>
                {isLoadingLeaders && (
                  <span className="inline-flex items-center gap-1 font-mono text-[10.5px] text-[var(--ink-muted)]">
                    <Loader2
                      className="h-3 w-3 animate-spin"
                      aria-hidden="true"
                    />
                    Memuat kandidat...
                  </span>
                )}
              </div>

              <select
                id={leaderIdField}
                required
                disabled={isLoadingLeaders || isSubmitting}
                value={leaderId}
                onChange={(e) => {
                  const nextVal = e.target.value;
                  setLeaderId(nextVal);
                  setTouched((prev) => ({ ...prev, leaderId: true }));
                  const errs = validateClientFields({
                    name,
                    description,
                    leaderId: nextVal,
                  });
                  setFieldErrors((prev) => ({
                    ...prev,
                    leaderId: errs.leaderId || "",
                  }));
                }}
                onBlur={() => handleBlurField("leaderId")}
                aria-invalid={leaderError ? "true" : "false"}
                aria-describedby={leaderError ? leaderErrorId : undefined}
                className="select otium-field-input mt-1.5 w-full"
              >
                <option value="" disabled>
                  -- Pilih Kandidat Ketua Divisi --
                </option>
                {availableLeaders.map((leader) => (
                  <option key={leader.id} value={String(leader.id)}>
                    {leader.fullName} ({leader.email})
                    {leader.isCurrentLeader
                      ? " — Ketua Saat Ini"
                      : " — Tersedia"}
                  </option>
                ))}
              </select>

              <p className="mt-1.5 text-[11px] text-[var(--ink-muted)]">
                Aturan kepemimpinan tunggal: 1 Ketua Divisi hanya dapat memimpin
                maksimal 1 divisi aktif.
                {isEdit
                  ? " Mengganti ketua akan otomatis melepas division_id ketua lama."
                  : ""}
              </p>

              {leaderError && (
                <p
                  id={leaderErrorId}
                  className="mt-1.5 flex items-center gap-1 text-[11.5px] font-medium text-[var(--terracotta)]"
                >
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>{leaderError}</span>
                </p>
              )}

              {leadersLoadError && (
                <div role="alert" className="notice notice-danger mt-2">
                  <span>{leadersLoadError}</span>
                </div>
              )}

              {!isLoadingLeaders &&
                !leadersLoadError &&
                availableLeaders.length === 0 && (
                  <div className="notice notice-warn mt-2.5">
                    <AlertCircle
                      className="mt-0.5 h-4 w-4 shrink-0"
                      aria-hidden="true"
                    />
                    <div>
                      <p className="font-semibold text-[var(--ink)]">
                        Belum ada kandidat Ketua Divisi yang bebas tugas.
                      </p>
                      <p className="mt-0.5 leading-relaxed">
                        Tambahkan akun aktif ber-role <em>Ketua Divisi</em> di{" "}
                        <Link
                          href="/admin/users"
                          onClick={() => onClose?.()}
                          className="font-semibold text-[var(--ink)] underline underline-offset-2"
                        >
                          Modul 1 (Manajemen Pengguna)
                        </Link>{" "}
                        terlebih dahulu.
                      </p>
                    </div>
                  </div>
                )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 border-t border-[var(--rule)] bg-[var(--alabaster)] px-5 py-3.5">
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
              disabled={
                isSubmitting ||
                isLoadingLeaders ||
                availableLeaders.length === 0
              }
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
                  : "Buat Divisi"}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}
