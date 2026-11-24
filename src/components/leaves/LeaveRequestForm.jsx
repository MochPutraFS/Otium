"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  FileText,
  Loader2,
  Paperclip,
  RotateCcw,
  Send,
  Upload,
  X,
} from "lucide-react";
import WhatIfQuotaWidget from "@/components/leaves/WhatIfQuotaWidget";
import { submitLeaveRequestAction } from "@/actions/leave-request-actions";
import {
  calculateWorkingDays,
  formatIndonesianDate,
  getHolidaysInRange,
  getNextValidWorkingDate,
  hasDateOverlap,
  isValidIsoDate,
  validateSubmissionLeadTime,
} from "@/lib/date-utils";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const PHONE_REGEX = /^[0-9+\-\s()]{8,20}$/;

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "";
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Form Pengajuan Cuti Baru (/leaves/new) bergaya Swiss Archival (100% UI-Only).
 * Mempertahankan penuh validasi berlapis, /api/leaves/check-availability,
 * /api/upload, dan submitLeaveRequestAction.
 */
export default function LeaveRequestForm({
  serverToday,
  userProfile,
  leaveTypes = [],
  colleagues = [],
  holidays = [],
  activeLeaveRanges = [],
  colleagueLeaves = [],
  blackoutPeriods = [],
}) {
  const router = useRouter();
  const isLeaderRole = userProfile.role === "Ketua Divisi";
  const hasDivision = Boolean(userProfile.divisionId);
  const holidayDates = useMemo(
    () => holidays.map((h) => h.holidayDate),
    [holidays]
  );

  const initialLeaveType = leaveTypes[0] || null;
  const defaultSuggestedDate = useMemo(
    () =>
      getNextValidWorkingDate(
        serverToday,
        initialLeaveType?.minSubmissionDays ?? 3,
        holidayDates
      ),
    [serverToday, initialLeaveType, holidayDates]
  );

  // State field form utama
  const [leaveTypeId, setLeaveTypeId] = useState(
    initialLeaveType ? String(initialLeaveType.id) : ""
  );
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [startDate, setStartDate] = useState(defaultSuggestedDate);
  const [endDate, setEndDate] = useState(defaultSuggestedDate);
  const [hasEditedDates, setHasEditedDates] = useState(false);
  const [reason, setReason] = useState("");
  const [handoverUserId, setHandoverUserId] = useState("");
  const [handoverNotes, setHandoverNotes] = useState("");

  // Smart Collapse Kontak Selama Cuti (auto-fill dari profil DB)
  const [leaveAddress, setLeaveAddress] = useState(userProfile.address || "");
  const [emergencyPhone, setEmergencyPhone] = useState(userProfile.phone || "");
  const [isEditingContact, setIsEditingContact] = useState(
    !userProfile.address || !userProfile.phone
  );

  // Progressive Disclosure Lampiran (diunggah tepat saat submit agar tanpa file yatim)
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [uploadedAttachment, setUploadedAttachment] = useState(null);
  const [fileError, setFileError] = useState("");

  // State validasi field pasca-interaksi & respons server
  const [fieldErrors, setFieldErrors] = useState({});
  const [formBannerError, setFormBannerError] = useState("");
  const [submitNotice, setSubmitNotice] = useState("");
  const [liveAnnouncement, setLiveAnnouncement] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);

  // State live verification dari POST /api/leaves/check-availability
  const [availabilityState, setAvailabilityState] = useState(null);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);

  const fieldRefs = useRef({
    leaveTypeId: null,
    startDate: null,
    endDate: null,
    reason: null,
    handoverUserId: null,
    handoverNotes: null,
    leaveAddress: null,
    emergencyPhone: null,
    attachment: null,
  });

  const selectedLeaveType = useMemo(
    () =>
      leaveTypes.find((lt) => String(lt.id) === String(leaveTypeId)) ||
      leaveTypes[0] ||
      null,
    [leaveTypes, leaveTypeId]
  );

  const effectiveEndDate = isHalfDay ? startDate : endDate;

  const localWorkingDays = useMemo(
    () =>
      calculateWorkingDays(
        startDate,
        effectiveEndDate,
        isHalfDay,
        holidayDates
      ),
    [startDate, effectiveEndDate, isHalfDay, holidayDates]
  );

  const localHolidayHits = useMemo(
    () => getHolidaysInRange(startDate, effectiveEndDate, holidays),
    [startDate, effectiveEndDate, holidays]
  );

  const isTenureBlocked = Boolean(
    selectedLeaveType?.requiresMinOneYearTenure &&
      !userProfile.isEligibleAnnualLeave
  );

  // Sinkronisasi realtime dengan POST /api/leaves/check-availability
  useEffect(() => {
    if (
      !selectedLeaveType ||
      !isValidIsoDate(startDate) ||
      !isValidIsoDate(effectiveEndDate) ||
      effectiveEndDate < startDate
    ) {
      setAvailabilityState(null);
      setIsCheckingAvailability(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setIsCheckingAvailability(true);
      try {
        const res = await fetch("/api/leaves/check-availability", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            leaveTypeId: selectedLeaveType.id,
            startDate,
            endDate: effectiveEndDate,
            isHalfDay,
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          setAvailabilityState(null);
          return;
        }

        const json = await res.json();
        if (json?.ok) {
          setAvailabilityState(json);
        }
      } catch (err) {
        if (err?.name !== "AbortError") {
          setAvailabilityState(null);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsCheckingAvailability(false);
        }
      }
    }, 220);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [selectedLeaveType, startDate, effectiveEndDate, isHalfDay]);

  const {
    totalWorkingDays,
    holidayHits,
    currentQuota,
    initialQuota,
    usedNonAnnualDays,
    remainingNonAnnualQuota,
    validationErrors,
    inlineDateError,
  } = useMemo(() => {
    if (
      availabilityState &&
      isValidIsoDate(startDate) &&
      isValidIsoDate(effectiveEndDate) &&
      effectiveEndDate >= startDate
    ) {
      return {
        totalWorkingDays: availabilityState.totalWorkingDays,
        holidayHits: availabilityState.holidayHits || localHolidayHits,
        currentQuota: availabilityState.currentQuota,
        initialQuota: availabilityState.initialQuota,
        usedNonAnnualDays: Number(availabilityState.usedNonAnnualDays || 0),
        remainingNonAnnualQuota:
          availabilityState.remainingNonAnnualQuota ?? null,
        validationErrors: availabilityState.errors || [],
        inlineDateError: availabilityState.inlineDateError || "",
      };
    }

    const errors = [];
    let dateErr = "";

    if (isTenureBlocked) {
      errors.push(
        "Anda belum memenuhi syarat masa kerja minimal 1 tahun untuk mengajukan Cuti Tahunan."
      );
    }

    if (!startDate || !effectiveEndDate) {
      dateErr = "Tanggal mulai dan selesai wajib diisi.";
      errors.push(dateErr);
    } else if (effectiveEndDate < startDate) {
      dateErr = "Tanggal selesai tidak boleh lebih awal dari tanggal mulai.";
      errors.push(dateErr);
    } else if (localWorkingDays <= 0) {
      dateErr = isHalfDay
        ? "Cuti 0.5 hari harus jatuh pada hari kerja aktif (Senin–Jumat, bukan hari libur)."
        : "Rentang tanggal yang dipilih hanya berisi akhir pekan atau hari libur nasional.";
      errors.push(dateErr);
    } else if (selectedLeaveType) {
      const leadCheck = validateSubmissionLeadTime(
        startDate,
        serverToday,
        selectedLeaveType.code,
        selectedLeaveType.minSubmissionDays,
        selectedLeaveType.name
      );
      if (!leadCheck.valid) {
        dateErr = leadCheck.message;
        errors.push(leadCheck.message);
      }
    }

    if (
      startDate &&
      effectiveEndDate &&
      effectiveEndDate >= startDate &&
      hasDateOverlap(startDate, effectiveEndDate, activeLeaveRanges)
    ) {
      dateErr =
        "Tanggal bentrok (overlap) dengan pengajuan cuti aktif Anda lainnya.";
      errors.push(dateErr);
    }

    if (selectedLeaveType) {
      if (selectedLeaveType.deductsAnnualQuota) {
        if (localWorkingDays > userProfile.remainingLeaveQuota) {
          errors.push(
            `Sisa kuota cuti tahunan (${Number(userProfile.remainingLeaveQuota).toFixed(1)} hari) tidak mencukupi.`
          );
        }
      } else if (localWorkingDays > selectedLeaveType.maxQuota) {
        errors.push(
          `Durasi melebihi batas maksimal ${selectedLeaveType.name} (${Number(selectedLeaveType.maxQuota).toFixed(1)} hari).`
        );
      }
    }

    return {
      totalWorkingDays: localWorkingDays,
      holidayHits: localHolidayHits,
      currentQuota: userProfile.remainingLeaveQuota,
      initialQuota: userProfile.initialLeaveQuota,
      usedNonAnnualDays: 0,
      remainingNonAnnualQuota: selectedLeaveType?.maxQuota ?? null,
      validationErrors: errors,
      inlineDateError: dateErr,
    };
  }, [
    availabilityState,
    startDate,
    effectiveEndDate,
    localWorkingDays,
    localHolidayHits,
    isTenureBlocked,
    isHalfDay,
    selectedLeaveType,
    serverToday,
    activeLeaveRanges,
    userProfile.remainingLeaveQuota,
    userProfile.initialLeaveQuota,
  ]);

  function clearFieldError(field) {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function validateSingleField(field, value) {
    let message = "";
    const trimmed = String(value || "").trim();

    if (field === "reason" && trimmed.length < 5) {
      message = "Alasan cuti wajib diisi minimal 5 karakter.";
    } else if (field === "handoverUserId" && !trimmed) {
      message = "Pilih rekan pengganti satu divisi.";
    } else if (field === "handoverNotes" && trimmed.length < 5) {
      message = "Catatan serah terima tugas wajib diisi minimal 5 karakter.";
    } else if (field === "leaveAddress" && trimmed.length < 5) {
      message = "Alamat selama cuti wajib diisi minimal 5 karakter.";
    } else if (field === "emergencyPhone") {
      if (!trimmed) {
        message = "Nomor telepon darurat wajib diisi.";
      } else if (!PHONE_REGEX.test(trimmed)) {
        message =
          "Format nomor darurat tidak valid (8–20 karakter angka, +, atau -).";
      }
    }

    setFieldErrors((prev) => {
      if (!message) {
        if (!prev[field]) return prev;
        const next = { ...prev };
        delete next[field];
        return next;
      }
      return { ...prev, [field]: message };
    });

    if (message) {
      setLiveAnnouncement(message);
    }

    return message;
  }

  function handleLeaveTypeChange(nextId) {
    setLeaveTypeId(nextId);
    setFileError("");
    setFormBannerError("");
    clearFieldError("leaveTypeId");

    if (!hasEditedDates) {
      const nextType = leaveTypes.find((lt) => String(lt.id) === String(nextId));
      if (nextType) {
        const nextSuggested = getNextValidWorkingDate(
          serverToday,
          nextType.minSubmissionDays,
          holidayDates
        );
        setStartDate(nextSuggested);
        setEndDate(nextSuggested);
      }
    }
  }

  function handleHalfDayToggle(checked) {
    setIsHalfDay(checked);
    setHasEditedDates(true);
    if (checked && startDate) {
      setEndDate(startDate);
    }
  }

  function handleStartDateChange(newStart) {
    setStartDate(newStart);
    setHasEditedDates(true);
    clearFieldError("startDate");
    if (isHalfDay || !endDate || endDate < newStart) {
      setEndDate(newStart);
      clearFieldError("endDate");
    }
  }

  function handleEndDateChange(newEnd) {
    setEndDate(newEnd);
    setHasEditedDates(true);
    clearFieldError("endDate");
  }

  function handleCalendarRangeSelect(nextStart, nextEnd) {
    setStartDate(nextStart);
    setEndDate(isHalfDay ? nextStart : nextEnd);
    setHasEditedDates(true);
    clearFieldError("startDate");
    clearFieldError("endDate");
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      const msg = "Format file harus PDF, JPG, atau PNG.";
      setFileError(msg);
      setLiveAnnouncement(msg);
      setAttachmentFile(null);
      setUploadedAttachment(null);
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      const msg = "Ukuran file maksimal 5 MB.";
      setFileError(msg);
      setLiveAnnouncement(msg);
      setAttachmentFile(null);
      setUploadedAttachment(null);
      return;
    }

    setFileError("");
    clearFieldError("attachmentUrl");
    setAttachmentFile(file);
    setUploadedAttachment(null);
  }

  function handleRemoveAttachment() {
    setAttachmentFile(null);
    setUploadedAttachment(null);
    setFileError("");
    if (fieldRefs.current.attachment) {
      fieldRefs.current.attachment.value = "";
    }
  }

  function handleReset() {
    const firstType = leaveTypes[0] || null;
    const resetDate = getNextValidWorkingDate(
      serverToday,
      firstType?.minSubmissionDays ?? 3,
      holidayDates
    );

    setLeaveTypeId(firstType ? String(firstType.id) : "");
    setIsHalfDay(false);
    setStartDate(resetDate);
    setEndDate(resetDate);
    setHasEditedDates(false);
    setReason("");
    setHandoverUserId("");
    setHandoverNotes("");
    setLeaveAddress(userProfile.address || "");
    setEmergencyPhone(userProfile.phone || "");
    setIsEditingContact(!userProfile.address || !userProfile.phone);
    setAttachmentFile(null);
    setUploadedAttachment(null);
    setFileError("");
    setFieldErrors({});
    setFormBannerError("");
    setSubmitNotice("");
    setLiveAnnouncement(
      "Formulir pengajuan cuti telah dikembalikan ke nilai awal."
    );
    if (fieldRefs.current.attachment) {
      fieldRefs.current.attachment.value = "";
    }
  }

  function focusFirstInvalidField(errorsObj) {
    const order = [
      "leaveTypeId",
      "startDate",
      "endDate",
      "reason",
      "handoverUserId",
      "handoverNotes",
      "leaveAddress",
      "emergencyPhone",
      "attachmentUrl",
    ];

    const firstKey = order.find((key) => Boolean(errorsObj[key]));
    if (!firstKey) return;

    if (firstKey === "leaveAddress" || firstKey === "emergencyPhone") {
      setIsEditingContact(true);
      setTimeout(() => {
        fieldRefs.current[firstKey]?.focus();
      }, 30);
      return;
    }

    const refKey = firstKey === "attachmentUrl" ? "attachment" : firstKey;
    fieldRefs.current[refKey]?.focus();
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormBannerError("");
    setSubmitNotice("");

    if (!hasDivision || colleagues.length === 0) {
      const msg = !hasDivision
        ? "Akun Anda belum tergabung dalam divisi. Hubungi Administrator sebelum mengajukan cuti."
        : "Belum ada rekan kerja aktif lain di divisi Anda untuk ditunjuk sebagai pengganti (handover).";
      setFormBannerError(msg);
      setLiveAnnouncement(msg);
      return;
    }

    if (validationErrors.length > 0) {
      setFormBannerError(validationErrors[0]);
      setLiveAnnouncement(validationErrors[0]);
      fieldRefs.current.startDate?.focus();
      return;
    }

    const nextFieldErrors = {};
    if (!selectedLeaveType) {
      nextFieldErrors.leaveTypeId = "Jenis cuti wajib dipilih.";
    }
    if (reason.trim().length < 5) {
      nextFieldErrors.reason = "Alasan cuti wajib diisi minimal 5 karakter.";
    }
    if (!handoverUserId) {
      nextFieldErrors.handoverUserId =
        "Rekan pengganti satu divisi wajib dipilih.";
    }
    if (handoverNotes.trim().length < 5) {
      nextFieldErrors.handoverNotes =
        "Catatan serah terima tugas wajib diisi minimal 5 karakter.";
    }
    if (leaveAddress.trim().length < 5) {
      nextFieldErrors.leaveAddress =
        "Alamat selama cuti wajib diisi minimal 5 karakter.";
    }
    if (!emergencyPhone.trim()) {
      nextFieldErrors.emergencyPhone = "Nomor telepon darurat wajib diisi.";
    } else if (!PHONE_REGEX.test(emergencyPhone.trim())) {
      nextFieldErrors.emergencyPhone =
        "Format nomor darurat tidak valid (8–20 karakter angka, +, atau -).";
    }

    if (selectedLeaveType?.requiresAttachment && !attachmentFile) {
      const attachErr =
        "Lampiran surat dokter / dokumen pendukung wajib diunggah.";
      setFileError(attachErr);
      nextFieldErrors.attachmentUrl = attachErr;
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      const firstErr = Object.values(nextFieldErrors)[0];
      setLiveAnnouncement(firstErr);
      focusFirstInvalidField(nextFieldErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      let finalAttachmentUrl = null;
      if (attachmentFile) {
        if (
          uploadedAttachment &&
          uploadedAttachment.file === attachmentFile &&
          uploadedAttachment.url
        ) {
          finalAttachmentUrl = uploadedAttachment.url;
        } else {
          setIsUploadingFile(true);
          const uploadData = new FormData();
          uploadData.append("file", attachmentFile);
          uploadData.append("folder", "attachments");

          const uploadRes = await fetch("/api/upload", {
            method: "POST",
            body: uploadData,
          });
          const uploadJson = await uploadRes.json().catch(() => ({}));
          setIsUploadingFile(false);

          if (!uploadRes.ok || !uploadJson?.url) {
            const uploadErr =
              uploadJson?.error || "Gagal mengunggah file lampiran.";
            setFileError(uploadErr);
            setFormBannerError(uploadErr);
            setLiveAnnouncement(uploadErr);
            setIsSubmitting(false);
            return;
          }

          finalAttachmentUrl = uploadJson.url;
          setUploadedAttachment({
            file: attachmentFile,
            url: finalAttachmentUrl,
          });
        }
      }

      const result = await submitLeaveRequestAction({
        leaveTypeId: selectedLeaveType.id,
        isHalfDay,
        startDate,
        endDate: effectiveEndDate,
        reason: reason.trim(),
        handoverUserId: Number(handoverUserId),
        handoverNotes: handoverNotes.trim(),
        leaveAddress: leaveAddress.trim(),
        emergencyPhone: emergencyPhone.trim(),
        attachmentUrl: finalAttachmentUrl,
      });

      if (!result?.ok) {
        if (result?.fieldErrors) {
          setFieldErrors(result.fieldErrors);
          focusFirstInvalidField(result.fieldErrors);
        }
        const errMsg =
          result?.error ||
          "Pengajuan cuti gagal disimpan. Periksa kembali isian Anda.";
        setFormBannerError(errMsg);
        setLiveAnnouncement(errMsg);
        setIsSubmitting(false);
        return;
      }

      const okMsg =
        "Pengajuan cuti berhasil disimpan dan notifikasi handover telah dikirim. Mengalihkan ke Riwayat Cuti...";
      setSubmitNotice(okMsg);
      setLiveAnnouncement(okMsg);

      router.push("/leaves?submitted=1");
      router.refresh();
    } catch {
      const netErr = "Terjadi gangguan koneksi saat mengirim pengajuan cuti.";
      setFormBannerError(netErr);
      setLiveAnnouncement(netErr);
      setIsSubmitting(false);
      setIsUploadingFile(false);
    }
  }

  const isHardBlocked =
    !hasDivision ||
    colleagues.length === 0 ||
    isTenureBlocked ||
    validationErrors.length > 0;

  return (
    <div className="space-y-5">
      {/* Live region tunggal (polite) untuk screen reader */}
      <div aria-live="polite" className="visually-hidden">
        {liveAnnouncement}
      </div>

      {/* Header Arsip Pengajuan */}
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--rule-strong)] pb-4">
        <div>
          <span className="panel-eyebrow">
            Formulir Permohonan &bull; Tanggal Catat:{" "}
            {formatIndonesianDate(serverToday)}
          </span>
          <h2 className="mt-1 font-serif text-[28px] font-semibold leading-tight text-[var(--ink)]">
            Ajukan Cuti Baru
          </h2>
          <p className="mt-1 text-xs text-[var(--ink-soft)]">
            Alur Persetujuan:{" "}
            <strong className="font-semibold text-[var(--ink)]">
              {isLeaderRole
                ? "Ketua Divisi → Langsung ke HRD"
                : `Karyawan → ${userProfile.leaderName || "Ketua Divisi"} → HRD`}
            </strong>
          </p>
        </div>

        <Link href="/leaves" className="btn btn-sm">
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Riwayat Cuti</span>
        </Link>
      </header>

      {/* Banner Status Sukses / Error Global */}
      {submitNotice && (
        <div role="status" className="notice notice-success">
          <CheckCircle2 aria-hidden="true" />
          <span>{submitNotice}</span>
        </div>
      )}

      {formBannerError && (
        <div role="alert" className="notice notice-danger">
          <AlertCircle aria-hidden="true" />
          <span>{formBannerError}</span>
        </div>
      )}

      {/* Peringatan jika user belum memiliki divisi atau rekan sedivisi */}
      {(!hasDivision || colleagues.length === 0) && (
        <div role="alert" className="notice notice-warn">
          <AlertCircle aria-hidden="true" />
          <div>
            <p className="m-0 font-semibold">
              {!hasDivision
                ? "Akun Anda belum tergabung dalam divisi"
                : `Belum ada rekan pengganti aktif di divisi ${userProfile.divisionName}`}
            </p>
            <p className="mt-0.5 text-xs">
              {!hasDivision
                ? "Pengajuan cuti memerlukan penunjukan rekan pengganti (handover) satu divisi. Silakan hubungi Administrator."
                : "Minimal terdapat 1 rekan kerja aktif lain dalam divisi yang sama untuk menerima serah terima tugas."}
            </p>
          </div>
        </div>
      )}

      {/* Layout 2 Kolom (Form Kiri fleksibel + Sticky What-If Ruler & Kalender Kanan) */}
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_308px] xl:grid-cols-[minmax(0,1fr)_348px]">
        <form
          onSubmit={handleSubmit}
          noValidate
          className="min-w-0 space-y-5"
        >
          {/* Banner Blokir Masa Kerja < 1 Tahun (Garda 4) */}
          {isTenureBlocked && (
            <div role="alert" className="notice notice-danger">
              <AlertCircle aria-hidden="true" />
              <div>
                <p className="m-0 font-semibold">
                  Belum memenuhi syarat masa kerja minimal 1 tahun
                </p>
                <p className="mt-0.5">
                  Tanggal bergabung Anda:{" "}
                  <strong className="mono">
                    {formatIndonesianDate(userProfile.joinDate)}
                  </strong>
                  . Cuti Tahunan baru tersedia setelah 1 tahun masa kerja. Anda
                  tetap dapat memilih <strong>Cuti Sakit</strong> atau{" "}
                  <strong>Cuti Lainnya</strong>.
                </p>
              </div>
            </div>
          )}

          {/* PANEL 1: Jenis & Tanggal Cuti */}
          <fieldset className="panel min-w-0">
            <legend className="visually-hidden">
              1. Jenis dan Tanggal Cuti
            </legend>
            <div className="panel-head">
              <div className="min-w-0">
                <span className="panel-eyebrow !mb-0">Bagian 01</span>
                <h3 className="panel-title">Jenis &amp; Rentang Tanggal</h3>
              </div>
              {selectedLeaveType?.ruleSummary && (
                <span className="tag max-w-full truncate">
                  {selectedLeaveType.ruleSummary}
                </span>
              )}
            </div>

            <div className="panel-body space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex min-w-0 flex-col gap-1.5">
                  <label
                    htmlFor="leave-type-select"
                    className="text-xs font-semibold text-[var(--ink-soft)]"
                  >
                    Jenis Cuti{" "}
                    <span className="text-[var(--terracotta)]" aria-hidden="true">
                      *
                    </span>
                  </label>
                  <select
                    ref={(el) => {
                      fieldRefs.current.leaveTypeId = el;
                    }}
                    id="leave-type-select"
                    name="leave_type_id"
                    required
                    value={leaveTypeId}
                    onChange={(e) => handleLeaveTypeChange(e.target.value)}
                    aria-invalid={fieldErrors.leaveTypeId ? "true" : "false"}
                    aria-describedby={
                      fieldErrors.leaveTypeId
                        ? "leave-type-error"
                        : selectedLeaveType?.description
                          ? "leave-type-desc"
                          : undefined
                    }
                    className="otium-field-input select min-w-0 w-full cursor-pointer"
                  >
                    {leaveTypes.map((lt) => (
                      <option key={lt.id} value={String(lt.id)}>
                        {lt.name} (Maks. {Number(lt.maxQuota).toFixed(1)} Hari)
                      </option>
                    ))}
                  </select>
                  {selectedLeaveType?.description && !fieldErrors.leaveTypeId && (
                    <p
                      id="leave-type-desc"
                      className="text-[11px] text-[var(--ink-muted)]"
                    >
                      {selectedLeaveType.description}
                    </p>
                  )}
                  {fieldErrors.leaveTypeId && (
                    <p
                      id="leave-type-error"
                      className="flex items-center gap-1.5 text-xs font-medium text-[var(--terracotta)]"
                    >
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      {fieldErrors.leaveTypeId}
                    </p>
                  )}
                </div>

                <div className="flex min-w-0 flex-col gap-1.5">
                  <span className="text-xs font-semibold text-[var(--ink-soft)]">
                    Opsi Durasi
                  </span>
                  <label className="otium-checkbox-label flex min-h-[40px] min-w-0 cursor-pointer select-none items-center gap-2.5 rounded-[2px] border border-[var(--rule-strong)] bg-[var(--alabaster)] px-3 py-2 transition-colors hover:border-[var(--ink)]">
                    <input
                      type="checkbox"
                      id="is-half-day"
                      name="is_half_day"
                      checked={isHalfDay}
                      onChange={(e) => handleHalfDayToggle(e.target.checked)}
                      className="otium-checkbox h-4 w-4 shrink-0 cursor-pointer"
                    />
                    <span className="min-w-0 text-[13px] font-medium leading-tight text-[var(--ink)]">
                      Cuti Setengah Hari (
                      <span className="mono font-semibold">0.5</span> hari)
                    </span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex min-w-0 flex-col gap-1.5">
                  <label
                    htmlFor="start-date"
                    className="text-xs font-semibold text-[var(--ink-soft)]"
                  >
                    Tanggal Mulai{" "}
                    <span className="text-[var(--terracotta)]" aria-hidden="true">
                      *
                    </span>
                  </label>
                  <input
                    ref={(el) => {
                      fieldRefs.current.startDate = el;
                    }}
                    id="start-date"
                    name="start_date"
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    aria-invalid={
                      fieldErrors.startDate || inlineDateError ? "true" : "false"
                    }
                    aria-describedby={
                      fieldErrors.startDate || inlineDateError
                        ? "date-range-error"
                        : undefined
                    }
                    className="otium-field-input input mono min-w-0 w-full cursor-pointer"
                  />
                </div>

                <div className="flex min-w-0 flex-col gap-1.5">
                  <label
                    htmlFor="end-date"
                    className="text-xs font-semibold text-[var(--ink-soft)]"
                  >
                    Tanggal Selesai{" "}
                    <span className="text-[var(--terracotta)]" aria-hidden="true">
                      *
                    </span>
                  </label>
                  <input
                    ref={(el) => {
                      fieldRefs.current.endDate = el;
                    }}
                    id="end-date"
                    name="end_date"
                    type="date"
                    required
                    disabled={isHalfDay}
                    min={startDate || undefined}
                    value={effectiveEndDate}
                    onChange={(e) => handleEndDateChange(e.target.value)}
                    aria-invalid={fieldErrors.endDate ? "true" : "false"}
                    aria-describedby={
                      fieldErrors.endDate || inlineDateError
                        ? "date-range-error"
                        : undefined
                    }
                    className="otium-field-input input mono min-w-0 w-full cursor-pointer"
                  />
                </div>
              </div>

              {(inlineDateError || fieldErrors.startDate || fieldErrors.endDate) && (
                <div id="date-range-error" className="notice notice-danger">
                  <AlertCircle aria-hidden="true" />
                  <span>
                    {fieldErrors.startDate ||
                      fieldErrors.endDate ||
                      inlineDateError}
                  </span>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="leave-reason"
                  className="text-xs font-semibold text-[var(--ink-soft)]"
                >
                  Alasan Cuti{" "}
                  <span className="text-[var(--terracotta)]" aria-hidden="true">
                    *
                  </span>
                </label>
                <textarea
                  ref={(el) => {
                    fieldRefs.current.reason = el;
                  }}
                  id="leave-reason"
                  name="reason"
                  rows={3}
                  required
                  minLength={5}
                  maxLength={1000}
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value);
                    if (fieldErrors.reason) clearFieldError("reason");
                  }}
                  onBlur={(e) => validateSingleField("reason", e.target.value)}
                  placeholder="Tuliskan alasan singkat dan jelas pengajuan cuti Anda..."
                  aria-invalid={fieldErrors.reason ? "true" : "false"}
                  aria-describedby={fieldErrors.reason ? "reason-error" : undefined}
                  className="otium-field-input textarea"
                />
                {fieldErrors.reason && (
                  <p
                    id="reason-error"
                    className="flex items-center gap-1.5 text-xs font-medium text-[var(--terracotta)]"
                  >
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    {fieldErrors.reason}
                  </p>
                )}
              </div>
            </div>
          </fieldset>

          {/* PANEL 2: Serah Terima Tugas (Handover) */}
          <fieldset className="panel min-w-0">
            <legend className="visually-hidden">
              2. Serah Terima Tugas (Handover)
            </legend>
            <div className="panel-head">
              <div>
                <span className="panel-eyebrow !mb-0">Bagian 02</span>
                <h3 className="panel-title">Serah Terima Tugas (Handover)</h3>
              </div>
              {userProfile.divisionName && (
                <span className="tag tag-leader">
                  Divisi {userProfile.divisionName}
                </span>
              )}
            </div>

            <div className="panel-body space-y-4">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="handover-user"
                  className="text-xs font-semibold text-[var(--ink-soft)]"
                >
                  Rekan Pengganti Satu Divisi{" "}
                  <span className="text-[var(--terracotta)]" aria-hidden="true">
                    *
                  </span>
                </label>
                <select
                  ref={(el) => {
                    fieldRefs.current.handoverUserId = el;
                  }}
                  id="handover-user"
                  name="handover_user_id"
                  required
                  disabled={!hasDivision || colleagues.length === 0}
                  value={handoverUserId}
                  onChange={(e) => {
                    setHandoverUserId(e.target.value);
                    clearFieldError("handoverUserId");
                  }}
                  onBlur={(e) =>
                    validateSingleField("handoverUserId", e.target.value)
                  }
                  aria-invalid={fieldErrors.handoverUserId ? "true" : "false"}
                  aria-describedby={
                    fieldErrors.handoverUserId
                      ? "handover-user-error"
                      : "handover-user-hint"
                  }
                  className="otium-field-input select cursor-pointer"
                >
                  <option value="" disabled>
                    {colleagues.length > 0
                      ? "Pilih rekan satu divisi..."
                      : "Tidak ada rekan aktif di divisi ini"}
                  </option>
                  {colleagues.map((colleague) => (
                    <option key={colleague.id} value={String(colleague.id)}>
                      {colleague.fullName} — {colleague.role}
                    </option>
                  ))}
                </select>
                {!fieldErrors.handoverUserId && (
                  <p
                    id="handover-user-hint"
                    className="text-[11px] text-[var(--ink-muted)]"
                  >
                    Rekan terpilih otomatis menerima notifikasi penunjukan
                    handover setelah pengajuan dikirim.
                  </p>
                )}
                {fieldErrors.handoverUserId && (
                  <p
                    id="handover-user-error"
                    className="flex items-center gap-1.5 text-xs font-medium text-[var(--terracotta)]"
                  >
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    {fieldErrors.handoverUserId}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="handover-notes"
                  className="text-xs font-semibold text-[var(--ink-soft)]"
                >
                  Catatan Tugas{" "}
                  <span className="text-[var(--terracotta)]" aria-hidden="true">
                    *
                  </span>
                </label>
                <textarea
                  ref={(el) => {
                    fieldRefs.current.handoverNotes = el;
                  }}
                  id="handover-notes"
                  name="handover_notes"
                  rows={3}
                  required
                  minLength={5}
                  maxLength={1000}
                  value={handoverNotes}
                  onChange={(e) => {
                    setHandoverNotes(e.target.value);
                    if (fieldErrors.handoverNotes)
                      clearFieldError("handoverNotes");
                  }}
                  onBlur={(e) =>
                    validateSingleField("handoverNotes", e.target.value)
                  }
                  placeholder="Rincian pekerjaan, PIC sementara, atau jadwal penting yang perlu dipantau rekan pengganti..."
                  aria-invalid={fieldErrors.handoverNotes ? "true" : "false"}
                  aria-describedby={
                    fieldErrors.handoverNotes ? "handover-notes-error" : undefined
                  }
                  className="otium-field-input textarea"
                />
                {fieldErrors.handoverNotes && (
                  <p
                    id="handover-notes-error"
                    className="flex items-center gap-1.5 text-xs font-medium text-[var(--terracotta)]"
                  >
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    {fieldErrors.handoverNotes}
                  </p>
                )}
              </div>
            </div>
          </fieldset>

          {/* PANEL 3: Kontak Selama Cuti & Lampiran Pendukung */}
          <fieldset className="panel min-w-0">
            <legend className="visually-hidden">
              3. Kontak Selama Cuti dan Lampiran Pendukung
            </legend>
            <div className="panel-head">
              <div>
                <span className="panel-eyebrow !mb-0">Bagian 03</span>
                <h3 className="panel-title">Kontak Darurat &amp; Lampiran</h3>
              </div>
              <button
                type="button"
                aria-expanded={isEditingContact}
                aria-controls="contact-editor-panel"
                onClick={() => setIsEditingContact((prev) => !prev)}
                className="btn btn-sm"
              >
                {isEditingContact ? "Selesai Ubah Kontak" : "Ubah Kontak"}
              </button>
            </div>

            <div className="panel-body space-y-4">
              {!isEditingContact ? (
                <div className="border border-[var(--rule)] bg-[var(--alabaster)] px-3.5 py-2.5 text-xs text-[var(--ink-soft)]">
                  <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-[var(--ink-muted)]">
                    Otomatis dari Profil:{" "}
                  </span>
                  <span className="font-medium text-[var(--ink)]">
                    {leaveAddress || "-"}
                  </span>{" "}
                  &bull;{" "}
                  <span className="mono font-medium text-[var(--ink)]">
                    {emergencyPhone || "-"}
                  </span>
                </div>
              ) : (
                <div
                  id="contact-editor-panel"
                  className="grid grid-cols-1 gap-4 sm:grid-cols-2"
                >
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="leave-address"
                      className="text-xs font-semibold text-[var(--ink-soft)]"
                    >
                      Alamat Selama Cuti{" "}
                      <span
                        className="text-[var(--terracotta)]"
                        aria-hidden="true"
                      >
                        *
                      </span>
                    </label>
                    <input
                      ref={(el) => {
                        fieldRefs.current.leaveAddress = el;
                      }}
                      id="leave-address"
                      name="leave_address"
                      type="text"
                      required
                      minLength={5}
                      maxLength={500}
                      autoComplete="street-address"
                      value={leaveAddress}
                      onChange={(e) => {
                        setLeaveAddress(e.target.value);
                        if (fieldErrors.leaveAddress)
                          clearFieldError("leaveAddress");
                      }}
                      onBlur={(e) =>
                        validateSingleField("leaveAddress", e.target.value)
                      }
                      aria-invalid={fieldErrors.leaveAddress ? "true" : "false"}
                      aria-describedby={
                        fieldErrors.leaveAddress
                          ? "leave-address-error"
                          : undefined
                      }
                      className="otium-field-input input"
                    />
                    {fieldErrors.leaveAddress && (
                      <p
                        id="leave-address-error"
                        className="flex items-center gap-1.5 text-xs font-medium text-[var(--terracotta)]"
                      >
                        <AlertCircle
                          className="h-3.5 w-3.5 shrink-0"
                          aria-hidden="true"
                        />
                        {fieldErrors.leaveAddress}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="emergency-phone"
                      className="text-xs font-semibold text-[var(--ink-soft)]"
                    >
                      Nomor Darurat{" "}
                      <span
                        className="text-[var(--terracotta)]"
                        aria-hidden="true"
                      >
                        *
                      </span>
                    </label>
                    <input
                      ref={(el) => {
                        fieldRefs.current.emergencyPhone = el;
                      }}
                      id="emergency-phone"
                      name="emergency_phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      required
                      maxLength={30}
                      value={emergencyPhone}
                      onChange={(e) => {
                        setEmergencyPhone(e.target.value);
                        if (fieldErrors.emergencyPhone)
                          clearFieldError("emergencyPhone");
                      }}
                      onBlur={(e) =>
                        validateSingleField("emergencyPhone", e.target.value)
                      }
                      aria-invalid={
                        fieldErrors.emergencyPhone ? "true" : "false"
                      }
                      aria-describedby={
                        fieldErrors.emergencyPhone
                          ? "emergency-phone-error"
                          : undefined
                      }
                      className="otium-field-input input mono"
                    />
                    {fieldErrors.emergencyPhone && (
                      <p
                        id="emergency-phone-error"
                        className="flex items-center gap-1.5 text-xs font-medium text-[var(--terracotta)]"
                      >
                        <AlertCircle
                          className="h-3.5 w-3.5 shrink-0"
                          aria-hidden="true"
                        />
                        {fieldErrors.emergencyPhone}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Lampiran Dokumen + File Preview Chip */}
              <div className="border-t border-[var(--rule)] pt-4">
                {selectedLeaveType?.requiresAttachment ? (
                  <div className="space-y-3 border border-dashed border-[var(--terracotta-border)] bg-[var(--terracotta-tint)] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[var(--terracotta)]">
                        Surat Dokter / Lampiran Pendukung{" "}
                        <span aria-hidden="true">*</span> (Wajib)
                      </span>
                      <span className="mono text-[10.5px] text-[var(--ink-muted)]">
                        PDF, JPG, PNG &bull; Maks. 5 MB
                      </span>
                    </div>

                    <label
                      htmlFor="leave-attachment-input"
                      className="btn w-full justify-between"
                    >
                      <span className="inline-flex min-w-0 items-center gap-2">
                        <Upload
                          className="h-3.5 w-3.5 shrink-0 text-[var(--terracotta)]"
                          aria-hidden="true"
                        />
                        <span className="truncate">
                          {attachmentFile
                            ? "Ganti berkas surat dokter..."
                            : "Pilih berkas surat dokter / dokumen pendukung..."}
                        </span>
                      </span>
                      <span className="mono text-[11px] font-semibold text-[var(--spruce)]">
                        {attachmentFile ? "Ganti" : "Pilih File"}
                      </span>
                      <input
                        ref={(el) => {
                          fieldRefs.current.attachment = el;
                        }}
                        id="leave-attachment-input"
                        name="attachment"
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={handleFileChange}
                        aria-invalid={
                          fileError || fieldErrors.attachmentUrl
                            ? "true"
                            : "false"
                        }
                        aria-describedby={
                          fileError || fieldErrors.attachmentUrl
                            ? "attachment-error"
                            : undefined
                        }
                        className="visually-hidden"
                      />
                    </label>

                    {attachmentFile && (
                      <div className="file-chip">
                        <span className="inline-flex min-w-0 items-center gap-2 font-medium">
                          <FileText
                            className="h-3.5 w-3.5 shrink-0"
                            aria-hidden="true"
                          />
                          <span className="truncate">
                            {attachmentFile.name} (
                            {formatFileSize(attachmentFile.size)})
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={handleRemoveAttachment}
                          aria-label="Hapus file lampiran"
                          className="cursor-pointer rounded-[2px] p-0.5 text-[var(--spruce)] hover:bg-[var(--paper-pure)]"
                        >
                          <X className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label
                        htmlFor="leave-attachment-input"
                        className="btn btn-sm"
                      >
                        <Paperclip className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Tambah Lampiran (Opsional)</span>
                        <input
                          ref={(el) => {
                            fieldRefs.current.attachment = el;
                          }}
                          id="leave-attachment-input"
                          name="attachment"
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={handleFileChange}
                          className="visually-hidden"
                        />
                      </label>
                      <span className="mono text-[10.5px] text-[var(--ink-muted)]">
                        PDF, JPG, PNG &bull; Maks. 5 MB
                      </span>
                    </div>

                    {attachmentFile && (
                      <div className="file-chip">
                        <span className="inline-flex min-w-0 items-center gap-2 font-medium">
                          <FileText
                            className="h-3.5 w-3.5 shrink-0"
                            aria-hidden="true"
                          />
                          <span className="truncate">
                            {attachmentFile.name} (
                            {formatFileSize(attachmentFile.size)})
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={handleRemoveAttachment}
                          aria-label="Hapus lampiran"
                          className="cursor-pointer rounded-[2px] p-0.5 text-[var(--spruce)] hover:bg-[var(--paper-pure)]"
                        >
                          <X className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {(fileError || fieldErrors.attachmentUrl) && (
                  <p
                    id="attachment-error"
                    className="mt-2 flex items-center gap-1.5 text-xs font-medium text-[var(--terracotta)]"
                  >
                    <AlertCircle
                      className="h-3.5 w-3.5 shrink-0"
                      aria-hidden="true"
                    />
                    {fileError || fieldErrors.attachmentUrl}
                  </p>
                )}
              </div>
            </div>
          </fieldset>

          {/* Tombol Aksi Form */}
          <div className="flex flex-wrap items-center justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleReset}
              disabled={isSubmitting}
              className="btn"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Reset</span>
            </button>
            <Link href="/leaves" className="btn">
              Batal
            </Link>
            <button
              type="submit"
              disabled={isHardBlocked || isSubmitting}
              className="btn btn-primary"
            >
              {isSubmitting ? (
                <>
                  <Loader2
                    className="h-3.5 w-3.5 animate-spin"
                    aria-hidden="true"
                  />
                  <span>
                    {isUploadingFile
                      ? "Mengunggah Lampiran..."
                      : "Mengirim Pengajuan..."}
                  </span>
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Kirim Pengajuan</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Kolom Kanan Sticky: What-If Projection Ruler + Kalender Interaktif */}
        <div className="min-w-0">
          <WhatIfQuotaWidget
            selectedLeaveType={selectedLeaveType}
            totalDays={totalWorkingDays}
            currentQuota={currentQuota}
            initialQuota={initialQuota}
            usedNonAnnualDays={usedNonAnnualDays}
            remainingNonAnnualQuota={remainingNonAnnualQuota}
            holidayHits={holidayHits}
            validationErrors={validationErrors}
            capacityWarning={availabilityState?.capacityWarning || null}
            isCheckingAvailability={isCheckingAvailability}
            startDate={startDate}
            endDate={effectiveEndDate}
            isHalfDay={isHalfDay}
            serverToday={serverToday}
            holidays={holidays}
            colleagueLeaves={colleagueLeaves}
            blackoutPeriods={blackoutPeriods}
            onSelectDateRange={handleCalendarRangeSelect}
          />
        </div>
      </div>
    </div>
  );
}
