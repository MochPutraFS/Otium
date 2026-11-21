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
 * Form Pengajuan Cuti Baru (/leaves/new) — Pure Production.
 * - Bahasa desain Warm Alabaster (#F4F2EC) — Swiss Editorial Minimalism.
 * - Validasi berlapis: Client-Side UX (pasca-interaksi) + Live Check (/api/leaves/check-availability)
 *   + Upload Lampiran (/api/upload) + Server Action Transaksional (submitLeaveRequestAction).
 */
export default function LeaveRequestForm({
  serverToday,
  userProfile,
  leaveTypes = [],
  colleagues = [],
  holidays = [],
  activeLeaveRanges = [],
}) {
  const router = useRouter();
  const isLeaderRole = userProfile.role === "Ketua Divisi";
  const hasDivision = Boolean(userProfile.divisionId);
  const holidayDates = useMemo(
    () => holidays.map((h) => h.holidayDate),
    [holidays]
  );

  // Pilih jenis cuti awal yang paling relevan (jika belum eligible tahunan, tetap tampilkan
  // jenis pertama dari DB agar aturan blokir Cuti Tahunan terlihat transparan sesuai PRD)
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
  const [uploadedAttachment, setUploadedAttachment] = useState(null); // { file, url }
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

  // Refs untuk focus routing ke field invalid pertama & reset file input
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

  // Kalkulasi instan di klien (tanpa lag) sambil menunggu sinkronisasi server
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

  // Sinkronisasi realtime dengan POST /api/leaves/check-availability (debounced + AbortController)
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

  // Evaluasi kontekstual (Garda 3 s.d. 8): gunakan hasil server jika tersedia, fallback instan ke kalkulasi lokal
  const {
    totalWorkingDays,
    holidayHits,
    currentQuota,
    initialQuota,
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

    // Jika user belum mengubah tanggal secara manual, sesuaikan saran hari kerja
    // agar cocok dengan aturan lead time jenis cuti yang baru dipilih (mis. H-3 vs H-0)
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
    setLiveAnnouncement("Formulir pengajuan cuti telah dikembalikan ke nilai awal.");
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

    // Validasi seluruh field form secara serentak pada submit
    const nextFieldErrors = {};
    if (!selectedLeaveType) {
      nextFieldErrors.leaveTypeId = "Jenis cuti wajib dipilih.";
    }
    if (reason.trim().length < 5) {
      nextFieldErrors.reason = "Alasan cuti wajib diisi minimal 5 karakter.";
    }
    if (!handoverUserId) {
      nextFieldErrors.handoverUserId = "Rekan pengganti satu divisi wajib dipilih.";
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
      // 1. Unggah lampiran tepat saat submit (hindari file yatim di public/uploads/attachments)
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

      // 2. Eksekusi Server Action transaksional (8 Garda Validasi + Hold Kuota + Notifikasi Handover)
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
          result?.error || "Pengajuan cuti gagal disimpan. Periksa kembali isian Anda.";
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
    <div className="space-y-6">
      {/* Live region tunggal (polite) untuk pengumuman error/status kepada screen reader */}
      <div aria-live="polite" className="visually-hidden">
        {liveAnnouncement}
      </div>

      {/* Header Editorial Ringkas */}
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-stone-200 pb-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
            Pengajuan Cuti
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Ajukan Cuti Baru
          </h1>
          <p className="mt-1 text-xs text-slate-600">
            Tanggal Pengajuan:{" "}
            <span className="font-semibold text-slate-900">
              {formatIndonesianDate(serverToday)}
            </span>{" "}
            <span aria-hidden="true" className="mx-1.5 text-stone-400">
              ·
            </span>{" "}
            Alur Persetujuan:{" "}
            <span className="font-semibold text-slate-900">
              {isLeaderRole
                ? "Langsung ke HRD"
                : `${userProfile.leaderName || "Ketua Divisi"} → HRD`}
            </span>
          </p>
        </div>

        <Link
          href="/leaves"
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 transition-colors duration-200 hover:bg-[#FAF9F6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Riwayat Cuti
        </Link>
      </header>

      {/* Banner Status Sukses / Error Global */}
      {submitNotice && (
        <div
          role="status"
          className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-900"
        >
          <CheckCircle2
            className="h-4 w-4 shrink-0 text-emerald-700"
            aria-hidden="true"
          />
          <span>{submitNotice}</span>
        </div>
      )}

      {formBannerError && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-900"
        >
          <AlertCircle
            className="mt-0.5 h-4 w-4 shrink-0 text-rose-700"
            aria-hidden="true"
          />
          <span>{formBannerError}</span>
        </div>
      )}

      {/* Peringatan jika user belum memiliki divisi atau belum ada rekan sedivisi */}
      {(!hasDivision || colleagues.length === 0) && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3.5 text-xs text-amber-950"
        >
          <AlertCircle
            className="mt-0.5 h-4 w-4 shrink-0 text-amber-700"
            aria-hidden="true"
          />
          <div>
            <p className="font-semibold">
              {!hasDivision
                ? "Akun Anda belum tergabung dalam divisi"
                : `Belum ada rekan pengganti aktif di divisi ${userProfile.divisionName}`}
            </p>
            <p className="mt-0.5 text-amber-900">
              {!hasDivision
                ? "Pengajuan cuti memerlukan penunjukan rekan pengganti (handover) satu divisi. Silakan hubungi Administrator untuk penempatan divisi."
                : "Minimal terdapat 1 rekan kerja aktif lain dalam divisi yang sama untuk menerima serah terima tugas (handover)."}
            </p>
          </div>
        </div>
      )}

      {/* Layout 2 Kolom (8/12 Form Kiri + 4/12 Sticky Ringkasan Kanan) */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <form
          onSubmit={handleSubmit}
          noValidate
          className="space-y-5 lg:col-span-8"
        >
          {/* Banner Blokir Kontekstual Masa Kerja < 1 Tahun (Garda 4) */}
          {isTenureBlocked && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-900"
            >
              <AlertCircle
                className="mt-0.5 h-4 w-4 shrink-0 text-rose-700"
                aria-hidden="true"
              />
              <div>
                <p className="font-semibold">
                  Belum memenuhi syarat masa kerja minimal 1 tahun
                </p>
                <p className="mt-0.5 text-rose-800">
                  Tanggal bergabung Anda:{" "}
                  <strong>{formatIndonesianDate(userProfile.joinDate)}</strong>.
                  Cuti Tahunan baru tersedia setelah 1 tahun masa kerja. Anda
                  tetap dapat memilih <strong>Cuti Sakit</strong> atau{" "}
                  <strong>Cuti Lainnya</strong>.
                </p>
              </div>
            </div>
          )}

          {/* KARTU 1: Jenis & Tanggal Cuti */}
          <fieldset className="space-y-4 rounded-xl border border-stone-200 bg-white p-5">
            <legend className="sr-only">1. Jenis dan Tanggal Cuti</legend>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3">
              <span
                aria-hidden="true"
                className="text-xs font-bold uppercase tracking-[0.06em] text-slate-900"
              >
                1. Jenis &amp; Tanggal Cuti
              </span>
              {selectedLeaveType?.ruleSummary && (
                <span className="rounded-md border border-stone-200 bg-[#FAF9F6] px-2.5 py-1 text-[11px] font-medium text-slate-700">
                  {selectedLeaveType.ruleSummary}
                </span>
              )}
            </div>

            <div>
              <label
                htmlFor="leave-type-select"
                className="mb-1.5 block text-xs font-semibold text-slate-800"
              >
                Jenis Cuti <span className="text-rose-700" aria-hidden="true">*</span>
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
                className="otium-field-input w-full cursor-pointer rounded-lg border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 transition-colors focus:border-slate-900 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-slate-900"
              >
                {leaveTypes.map((lt) => (
                  <option key={lt.id} value={String(lt.id)}>
                    {lt.name} (Maks. {Number(lt.maxQuota).toFixed(1)} Hari)
                  </option>
                ))}
              </select>
              {selectedLeaveType?.description && !fieldErrors.leaveTypeId && (
                <p id="leave-type-desc" className="mt-1.5 text-[11px] text-slate-600">
                  {selectedLeaveType.description}
                </p>
              )}
              {fieldErrors.leaveTypeId && (
                <p
                  id="leave-type-error"
                  className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-rose-700"
                >
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {fieldErrors.leaveTypeId}
                </p>
              )}
            </div>

            <div className="space-y-3">
              <label className="otium-checkbox-label inline-flex cursor-pointer select-none items-center gap-2.5 py-1">
                <input
                  type="checkbox"
                  id="is-half-day"
                  name="is_half_day"
                  checked={isHalfDay}
                  onChange={(e) => handleHalfDayToggle(e.target.checked)}
                  className="otium-checkbox h-4 w-4 cursor-pointer rounded border-stone-300"
                />
                <span className="text-xs font-medium text-slate-800">
                  Cuti Setengah Hari{" "}
                  <span className="text-slate-500">(0.5 hari kerja)</span>
                </span>
              </label>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="start-date"
                    className="mb-1.5 block text-xs font-semibold text-slate-800"
                  >
                    Tanggal Mulai{" "}
                    <span className="text-rose-700" aria-hidden="true">*</span>
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
                    className="otium-field-input w-full cursor-pointer rounded-lg border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 transition-colors focus:border-slate-900 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-slate-900"
                  />
                </div>
                <div>
                  <label
                    htmlFor="end-date"
                    className="mb-1.5 block text-xs font-semibold text-slate-800"
                  >
                    Tanggal Selesai{" "}
                    <span className="text-rose-700" aria-hidden="true">*</span>
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
                    className="otium-field-input w-full cursor-pointer rounded-lg border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 transition-colors focus:border-slate-900 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-slate-500"
                  />
                </div>
              </div>

              {(inlineDateError || fieldErrors.startDate || fieldErrors.endDate) && (
                <p
                  id="date-range-error"
                  className="flex items-start gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-800"
                >
                  <AlertCircle
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-700"
                    aria-hidden="true"
                  />
                  <span>
                    {fieldErrors.startDate ||
                      fieldErrors.endDate ||
                      inlineDateError}
                  </span>
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="leave-reason"
                className="mb-1.5 block text-xs font-semibold text-slate-800"
              >
                Alasan Cuti{" "}
                <span className="text-rose-700" aria-hidden="true">*</span>
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
                className="otium-field-input w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-slate-900 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-slate-900"
              />
              {fieldErrors.reason && (
                <p
                  id="reason-error"
                  className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-rose-700"
                >
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {fieldErrors.reason}
                </p>
              )}
            </div>
          </fieldset>

          {/* KARTU 2: Serah Terima Tugas (Handover) */}
          <fieldset className="space-y-4 rounded-xl border border-stone-200 bg-white p-5">
            <legend className="sr-only">2. Serah Terima Tugas (Handover)</legend>
            <div className="border-b border-stone-100 pb-3">
              <span
                aria-hidden="true"
                className="text-xs font-bold uppercase tracking-[0.06em] text-slate-900"
              >
                2. Serah Terima Tugas (Handover)
              </span>
            </div>

            <div>
              <label
                htmlFor="handover-user"
                className="mb-1.5 block text-xs font-semibold text-slate-800"
              >
                Rekan Pengganti{" "}
                {userProfile.divisionName ? (
                  <span className="font-normal text-slate-600">
                    (Divisi {userProfile.divisionName})
                  </span>
                ) : null}{" "}
                <span className="text-rose-700" aria-hidden="true">*</span>
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
                className="otium-field-input w-full cursor-pointer rounded-lg border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 transition-colors focus:border-slate-900 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-slate-500"
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
                  className="mt-1.5 text-[11px] text-slate-500"
                >
                  Rekan terpilih otomatis menerima notifikasi penunjukan handover
                  setelah pengajuan dikirim.
                </p>
              )}
              {fieldErrors.handoverUserId && (
                <p
                  id="handover-user-error"
                  className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-rose-700"
                >
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {fieldErrors.handoverUserId}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="handover-notes"
                className="mb-1.5 block text-xs font-semibold text-slate-800"
              >
                Catatan Tugas{" "}
                <span className="text-rose-700" aria-hidden="true">*</span>
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
                  if (fieldErrors.handoverNotes) clearFieldError("handoverNotes");
                }}
                onBlur={(e) =>
                  validateSingleField("handoverNotes", e.target.value)
                }
                placeholder="Rincian pekerjaan, PIC sementara, atau jadwal penting yang perlu dipantau rekan pengganti..."
                aria-invalid={fieldErrors.handoverNotes ? "true" : "false"}
                aria-describedby={
                  fieldErrors.handoverNotes ? "handover-notes-error" : undefined
                }
                className="otium-field-input w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-slate-900 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-slate-900"
              />
              {fieldErrors.handoverNotes && (
                <p
                  id="handover-notes-error"
                  className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-rose-700"
                >
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {fieldErrors.handoverNotes}
                </p>
              )}
            </div>
          </fieldset>

          {/* KARTU 3: Smart Collapse Kontak & Progressive Disclosure Lampiran */}
          <fieldset className="space-y-4 rounded-xl border border-stone-200 bg-white p-5">
            <legend className="sr-only">
              3. Kontak Selama Cuti dan Lampiran Pendukung
            </legend>

            {/* Smart Collapse Kontak */}
            <div>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span
                    aria-hidden="true"
                    className="text-xs font-bold uppercase tracking-[0.06em] text-slate-900"
                  >
                    3. Kontak Selama Cuti
                  </span>
                  <span className="ml-2 text-[11px] font-normal text-slate-500">
                    (otomatis dari Profil)
                  </span>
                </div>
                <button
                  type="button"
                  aria-expanded={isEditingContact}
                  aria-controls="contact-editor-panel"
                  onClick={() => setIsEditingContact((prev) => !prev)}
                  className="cursor-pointer rounded-md px-2 py-1 text-xs font-semibold text-slate-800 underline decoration-stone-300 underline-offset-4 transition-colors hover:bg-[#FAF9F6] hover:decoration-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
                >
                  {isEditingContact ? "Selesai" : "Ubah"}
                </button>
              </div>

              {!isEditingContact ? (
                <p className="mt-2 rounded-lg border border-stone-200 bg-[#FAF9F6] px-3.5 py-2.5 text-xs text-slate-700">
                  {leaveAddress || "-"} <span aria-hidden="true">·</span>{" "}
                  <span className="font-medium tabular-nums">
                    {emergencyPhone || "-"}
                  </span>
                </p>
              ) : (
                <div
                  id="contact-editor-panel"
                  className="mt-3 grid grid-cols-1 gap-3 border-t border-stone-100 pt-3.5 sm:grid-cols-2"
                >
                  <div>
                    <label
                      htmlFor="leave-address"
                      className="mb-1.5 block text-xs font-semibold text-slate-800"
                    >
                      Alamat Selama Cuti{" "}
                      <span className="text-rose-700" aria-hidden="true">*</span>
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
                      className="otium-field-input w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 transition-colors focus:border-slate-900 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-slate-900"
                    />
                    {fieldErrors.leaveAddress && (
                      <p
                        id="leave-address-error"
                        className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-rose-700"
                      >
                        <AlertCircle
                          className="h-3.5 w-3.5 shrink-0"
                          aria-hidden="true"
                        />
                        {fieldErrors.leaveAddress}
                      </p>
                    )}
                  </div>
                  <div>
                    <label
                      htmlFor="emergency-phone"
                      className="mb-1.5 block text-xs font-semibold text-slate-800"
                    >
                      Nomor Darurat{" "}
                      <span className="text-rose-700" aria-hidden="true">*</span>
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
                      className="otium-field-input w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2.5 text-sm tabular-nums text-slate-900 transition-colors focus:border-slate-900 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-slate-900"
                    />
                    {fieldErrors.emergencyPhone && (
                      <p
                        id="emergency-phone-error"
                        className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-rose-700"
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
            </div>

            {/* Progressive Disclosure Lampiran (Aksesibel dengan .visually-hidden) */}
            <div className="border-t border-stone-100 pt-4">
              {selectedLeaveType?.requiresAttachment ? (
                <div className="space-y-2.5 rounded-xl border border-dashed border-rose-300 bg-rose-50/50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-rose-800">
                      Surat Dokter / Lampiran Pendukung{" "}
                      <span aria-hidden="true">*</span>
                      <span className="ml-1 font-medium">(Wajib)</span>
                    </span>
                    <span className="text-[11px] text-slate-600">
                      PDF, JPG, PNG · Maks. 5 MB
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <label
                      htmlFor="leave-attachment-input"
                      className="flex flex-1 cursor-pointer items-center justify-between gap-3 rounded-lg border border-rose-200 bg-white px-3.5 py-2.5 text-xs transition-colors hover:bg-rose-50/40 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-slate-900"
                    >
                      <span className="inline-flex min-w-0 items-center gap-2 font-medium text-slate-800">
                        {attachmentFile ? (
                          <FileText
                            className="h-4 w-4 shrink-0 text-slate-700"
                            aria-hidden="true"
                          />
                        ) : (
                          <Upload
                            className="h-4 w-4 shrink-0 text-rose-700"
                            aria-hidden="true"
                          />
                        )}
                        <span className="truncate">
                          {attachmentFile
                            ? `${attachmentFile.name} (${formatFileSize(attachmentFile.size)})`
                            : "Pilih file surat dokter atau dokumen pendukung..."}
                        </span>
                      </span>
                      <span className="shrink-0 rounded-md bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white">
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
                      <button
                        type="button"
                        onClick={handleRemoveAttachment}
                        aria-label="Hapus file lampiran"
                        className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-stone-300 bg-white text-slate-600 transition-colors hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label
                    htmlFor="leave-attachment-input"
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-1 text-xs font-semibold text-slate-800 underline decoration-stone-300 underline-offset-4 transition-colors hover:bg-[#FAF9F6] hover:decoration-slate-900 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-slate-900"
                  >
                    <Paperclip className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>+ Tambah Lampiran (Opsional · PDF/JPG/PNG, maks. 5 MB)</span>
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

                  {attachmentFile && (
                    <span className="inline-flex items-center gap-1.5 rounded-md border border-stone-200 bg-[#FAF9F6] px-2.5 py-1 text-xs text-slate-700">
                      <FileText
                        className="h-3.5 w-3.5 shrink-0 text-slate-600"
                        aria-hidden="true"
                      />
                      <span className="max-w-[200px] truncate">
                        {attachmentFile.name} ({formatFileSize(attachmentFile.size)})
                      </span>
                      <button
                        type="button"
                        onClick={handleRemoveAttachment}
                        aria-label="Hapus lampiran"
                        className="cursor-pointer rounded p-0.5 text-slate-500 transition-colors hover:text-rose-700 focus-visible:outline-2 focus-visible:outline-slate-900"
                      >
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </span>
                  )}
                </div>
              )}

              {(fileError || fieldErrors.attachmentUrl) && (
                <p
                  id="attachment-error"
                  className="mt-2 flex items-center gap-1.5 text-xs font-medium text-rose-700"
                >
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {fileError || fieldErrors.attachmentUrl}
                </p>
              )}
            </div>
          </fieldset>

          {/* Tombol Aksi Form */}
          <div className="flex flex-wrap items-center justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleReset}
              disabled={isSubmitting}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 transition-colors duration-200 hover:bg-[#FAF9F6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Reset
            </button>
            <Link
              href="/leaves"
              className="inline-flex cursor-pointer items-center rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-800 transition-colors duration-200 hover:bg-[#FAF9F6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
            >
              Batal
            </Link>
            <button
              type="submit"
              disabled={isHardBlocked || isSubmitting}
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white transition-colors duration-200 hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  {isUploadingFile ? "Mengunggah Lampiran..." : "Mengirim Pengajuan..."}
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" aria-hidden="true" />
                  Kirim Pengajuan
                </>
              )}
            </button>
          </div>
        </form>

        {/* Kolom Kanan Sticky (4/12) */}
        <div className="lg:col-span-4">
          <WhatIfQuotaWidget
            selectedLeaveType={selectedLeaveType}
            totalDays={totalWorkingDays}
            currentQuota={currentQuota}
            initialQuota={initialQuota}
            holidayHits={holidayHits}
            validationErrors={validationErrors}
            isCheckingAvailability={isCheckingAvailability}
          />
        </div>
      </div>
    </div>
  );
}
