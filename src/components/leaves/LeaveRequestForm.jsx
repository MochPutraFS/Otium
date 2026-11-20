"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Paperclip,
  Upload,
  X,
} from "lucide-react";
import WhatIfQuotaWidget from "@/components/leaves/WhatIfQuotaWidget";
import {
  calculateWorkingDays,
  hasDateOverlap,
  validateSubmissionLeadTime,
} from "@/lib/date-utils";
import {
  HOLIDAY_DATE_LIST,
  WORKSPACE_TODAY_ISO,
  WORKSPACE_TODAY_LABEL,
  loadLeavesPreviewState,
  saveLeavesPreviewState,
} from "@/lib/mock-leaves-data";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png"];

export default function LeaveRequestForm({
  userProfile,
  roleKey = "karyawan",
  leaveTypes = [],
  colleagues = [],
}) {
  const router = useRouter();
  const isLeaderRole = userProfile.role === "Ketua Divisi";

  // State pratinjau riwayat & kuota realtime (disinkronkan sementara dengan /leaves)
  const [previewState, setPreviewState] = useState({
    requests: [],
    remainingQuota: userProfile.remainingLeaveQuota,
  });

  // Simulasi opsional masa kerja < 1 tahun untuk pengujian UI
  const [simulateNewEmployee, setSimulateNewEmployee] = useState(
    !userProfile.isEligibleAnnualLeave
  );

  // Field form utama
  const [leaveTypeId, setLeaveTypeId] = useState(leaveTypes[0]?.id || 1);
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [startDate, setStartDate] = useState("2026-11-24");
  const [endDate, setEndDate] = useState("2026-11-25");
  const [reason, setReason] = useState("");
  const [handoverUserId, setHandoverUserId] = useState(
    colleagues[0]?.id ? String(colleagues[0].id) : ""
  );
  const [handoverNotes, setHandoverNotes] = useState("");

  // Smart Collapse Kontak Selama Cuti (auto-fill dari profil)
  const [leaveAddress, setLeaveAddress] = useState(userProfile.address || "");
  const [emergencyPhone, setEmergencyPhone] = useState(userProfile.phone || "");
  const [isEditingContact, setIsEditingContact] = useState(
    !userProfile.address || !userProfile.phone
  );

  // Progressive Disclosure Lampiran
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const [submitNotice, setSubmitNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loaded = loadLeavesPreviewState(
      roleKey,
      userProfile.remainingLeaveQuota
    );
    setPreviewState(loaded);
  }, [roleKey, userProfile.remainingLeaveQuota]);

  const selectedLeaveType = useMemo(
    () => leaveTypes.find((lt) => lt.id === Number(leaveTypeId)) || leaveTypes[0],
    [leaveTypes, leaveTypeId]
  );

  const effectiveEndDate = isHalfDay ? startDate : endDate;

  const totalWorkingDays = useMemo(
    () =>
      calculateWorkingDays(
        startDate,
        effectiveEndDate,
        isHalfDay,
        HOLIDAY_DATE_LIST
      ),
    [startDate, effectiveEndDate, isHalfDay]
  );

  const isTenureBlocked = Boolean(
    selectedLeaveType?.requiresMinOneYearTenure && simulateNewEmployee
  );

  // Evaluasi kontekstual (Garda 3 s.d. Garda 8) — hanya kumpulkan yang gagal
  const { validationErrors, inlineDateError } = useMemo(() => {
    const errors = [];
    let dateErr = "";

    if (isTenureBlocked) {
      errors.push("Masa kerja < 1 tahun belum eligible untuk Cuti Tahunan.");
    }

    if (!startDate || !effectiveEndDate) {
      dateErr = "Tanggal mulai dan selesai wajib diisi.";
      errors.push(dateErr);
    } else if (effectiveEndDate < startDate) {
      dateErr = "Tanggal selesai tidak boleh lebih awal dari tanggal mulai.";
      errors.push(dateErr);
    } else if (totalWorkingDays <= 0) {
      dateErr = isHalfDay
        ? "Cuti 0.5 hari harus jatuh pada hari kerja aktif (Senin–Jumat)."
        : "Rentang tanggal hanya berisi hari libur atau akhir pekan.";
      errors.push(dateErr);
    } else if (selectedLeaveType) {
      const leadCheck = validateSubmissionLeadTime(
        startDate,
        WORKSPACE_TODAY_ISO,
        selectedLeaveType.code,
        selectedLeaveType.minSubmissionDays
      );
      if (!leadCheck.valid) {
        dateErr = leadCheck.message;
        errors.push(leadCheck.message);
      }
    }

    if (
      startDate &&
      effectiveEndDate &&
      hasDateOverlap(startDate, effectiveEndDate, previewState.requests)
    ) {
      dateErr = "Tanggal bentrok (overlap) dengan pengajuan cuti aktif Anda lainnya.";
      errors.push(dateErr);
    }

    if (selectedLeaveType) {
      if (selectedLeaveType.deductsAnnualQuota) {
        if (totalWorkingDays > previewState.remainingQuota) {
          errors.push(
            `Sisa kuota (${Number(previewState.remainingQuota).toFixed(1)} hari) tidak mencukupi.`
          );
        }
      } else if (totalWorkingDays > selectedLeaveType.maxQuota) {
        errors.push(
          `Melebihi batas maksimal ${selectedLeaveType.name} (${selectedLeaveType.maxQuota} hari).`
        );
      }
    }

    return { validationErrors: errors, inlineDateError: dateErr };
  }, [
    isTenureBlocked,
    startDate,
    effectiveEndDate,
    totalWorkingDays,
    isHalfDay,
    selectedLeaveType,
    previewState.requests,
    previewState.remainingQuota,
  ]);

  function handleHalfDayToggle(checked) {
    setIsHalfDay(checked);
    if (checked && startDate) {
      setEndDate(startDate);
    }
  }

  function handleStartDateChange(newStart) {
    setStartDate(newStart);
    if (isHalfDay || !endDate || endDate < newStart) {
      setEndDate(newStart);
    }
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setFileError("Format file harus PDF, JPG, atau PNG.");
      setAttachmentFile(null);
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setFileError("Ukuran file maksimal 5 MB.");
      setAttachmentFile(null);
      return;
    }

    setFileError("");
    setAttachmentFile(file);
  }

  function handleReset() {
    setLeaveTypeId(leaveTypes[0]?.id || 1);
    setIsHalfDay(false);
    setStartDate("2026-11-24");
    setEndDate("2026-11-25");
    setReason("");
    setHandoverUserId(colleagues[0]?.id ? String(colleagues[0].id) : "");
    setHandoverNotes("");
    setLeaveAddress(userProfile.address || "");
    setEmergencyPhone(userProfile.phone || "");
    setIsEditingContact(!userProfile.address || !userProfile.phone);
    setAttachmentFile(null);
    setFileError("");
    setSubmitNotice("");
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (validationErrors.length > 0) return;

    if (selectedLeaveType?.requiresAttachment && !attachmentFile) {
      setFileError("Lampiran surat dokter / dokumen pendukung wajib diunggah.");
      return;
    }
    if (!leaveAddress.trim() || !emergencyPhone.trim()) {
      setIsEditingContact(true);
      return;
    }

    setIsSubmitting(true);

    const chosenColleague = colleagues.find(
      (c) => String(c.id) === String(handoverUserId)
    );
    const nextQuota = selectedLeaveType.deductsAnnualQuota
      ? Number(
          Math.max(0, previewState.remainingQuota - totalWorkingDays).toFixed(1)
        )
      : previewState.remainingQuota;

    const timeline = isLeaderRole
      ? [
          {
            stage: "Pengajuan Dibuat",
            actor: userProfile.fullName,
            role: userProfile.role,
            time: `${WORKSPACE_TODAY_LABEL}, baru saja`,
            state: "done",
            notes: "",
          },
          {
            stage: "Persetujuan Final HRD",
            actor: "Nadia Putri",
            role: "HRD",
            time: "Menunggu persetujuan final (Jalur langsung Ketua Divisi)",
            state: "active",
            notes: "",
          },
        ]
      : [
          {
            stage: "Pengajuan Dibuat",
            actor: userProfile.fullName,
            role: userProfile.role,
            time: `${WORKSPACE_TODAY_LABEL}, baru saja`,
            state: "done",
            notes: "",
          },
          {
            stage: "Verifikasi Ketua Divisi",
            actor: userProfile.leaderName || "Ketua Divisi",
            role: "Ketua Divisi",
            time: "Menunggu verifikasi",
            state: "active",
            notes: "",
          },
          {
            stage: "Persetujuan Final HRD",
            actor: "Nadia Putri",
            role: "HRD",
            time: "Menunggu tahap sebelumnya",
            state: "pending",
            notes: "",
          },
        ];

    const newRequest = {
      id: Date.now(),
      leaveTypeId: selectedLeaveType.id,
      leaveTypeCode: selectedLeaveType.code,
      leaveTypeName: selectedLeaveType.name,
      isHalfDay,
      submissionDate: WORKSPACE_TODAY_ISO,
      startDate,
      endDate: effectiveEndDate,
      totalDays: totalWorkingDays,
      reason: reason.trim(),
      handoverUserId: chosenColleague?.id || null,
      handoverUserName: chosenColleague?.fullName || "-",
      handoverNotes: handoverNotes.trim(),
      leaveAddress: leaveAddress.trim(),
      emergencyPhone: emergencyPhone.trim(),
      attachmentUrl: attachmentFile
        ? `/uploads/attachments/${attachmentFile.name}`
        : null,
      attachmentName: attachmentFile ? attachmentFile.name : null,
      status: "Pending",
      rejectedByRole: null,
      rejectionReason: null,
      cancellationReason: null,
      quotaDeducted: selectedLeaveType.deductsAnnualQuota,
      deductsAnnualQuota: selectedLeaveType.deductsAnnualQuota,
      timeline,
    };

    const updatedState = {
      requests: [newRequest, ...previewState.requests],
      remainingQuota: nextQuota,
    };
    saveLeavesPreviewState(roleKey, updatedState);
    setPreviewState(updatedState);
    setSubmitNotice(
      "Pengajuan cuti berhasil disimpan (Mode Pratinjau UI). Mengalihkan ke Riwayat Cuti..."
    );

    setTimeout(() => {
      router.push(`/leaves?role=${roleKey}`);
    }, 650);
  }

  return (
    <div className="space-y-5">
      {/* Header Ringkas: Tanggal Pengajuan & Jalur sebagai metadata mikro */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Ajukan Cuti
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Diajukan:{" "}
            <span className="font-semibold text-slate-700">
              {WORKSPACE_TODAY_LABEL}
            </span>{" "}
            • Alur:{" "}
            <span className="font-semibold text-slate-700">
              {isLeaderRole
                ? "Langsung ke HRD"
                : `${userProfile.leaderName || "Ketua Divisi"} → HRD`}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle kecil simulasi masa kerja < 1 tahun untuk uji UX */}
          {!isLeaderRole && (
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 transition hover:bg-slate-50">
              <input
                type="checkbox"
                checked={simulateNewEmployee}
                onChange={(e) => setSimulateNewEmployee(e.target.checked)}
                className="h-3.5 w-3.5 rounded accent-blue-600"
              />
              <span>Uji Masa Kerja &lt; 1 Thn</span>
            </label>
          )}

          <Link
            href={`/leaves?role=${roleKey}`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Riwayat Cuti
          </Link>
        </div>
      </div>

      {submitNotice && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{submitNotice}</span>
        </div>
      )}

      {/* Layout 2 Kolom (8/12 Kiri + 4/12 Sticky Kanan) */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <form onSubmit={handleSubmit} className="space-y-5 lg:col-span-8">
          {/* Banner Blokir Kontekstual: Hanya tampil saat masa kerja < 1 tahun & Cuti Tahunan */}
          {isTenureBlocked && (
            <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
              <AlertCircle
                className="mt-0.5 h-4 w-4 shrink-0 text-rose-600"
                aria-hidden="true"
              />
              <div>
                <p className="font-semibold">
                  Belum memenuhi syarat masa kerja 1 tahun
                </p>
                <p className="mt-0.5 text-rose-700">
                  Cuti Tahunan baru tersedia setelah 1 tahun masa kerja. Anda
                  tetap dapat memilih <strong>Cuti Sakit</strong> atau{" "}
                  <strong>Cuti Lainnya</strong>.
                </p>
              </div>
            </div>
          )}

          {/* KARTU 1: Jenis & Tanggal Cuti */}
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                1. Jenis &amp; Tanggal Cuti
              </h3>
              {selectedLeaveType?.ruleSummary && (
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
                  {selectedLeaveType.ruleSummary}
                </span>
              )}
            </div>

            <div>
              <label
                htmlFor="leave-type-select"
                className="mb-1.5 block text-xs font-semibold text-slate-700"
              >
                Jenis Cuti <span className="text-rose-600">*</span>
              </label>
              <select
                id="leave-type-select"
                value={leaveTypeId}
                onChange={(e) => {
                  setLeaveTypeId(Number(e.target.value));
                  setFileError("");
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {leaveTypes.map((lt) => (
                  <option key={lt.id} value={lt.id}>
                    {lt.name} (Maks. {Number(lt.maxQuota).toFixed(0)} Hari)
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              <label className="inline-flex cursor-pointer select-none items-center gap-2">
                <input
                  type="checkbox"
                  checked={isHalfDay}
                  onChange={(e) => handleHalfDayToggle(e.target.checked)}
                  className="h-4 w-4 rounded accent-blue-600"
                />
                <span className="text-xs font-medium text-slate-700">
                  Cuti Setengah Hari{" "}
                  <span className="text-slate-400">(0.5 hari kerja)</span>
                </span>
              </label>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="start-date"
                    className="mb-1 block text-xs font-semibold text-slate-700"
                  >
                    Tanggal Mulai <span className="text-rose-600">*</span>
                  </label>
                  <input
                    id="start-date"
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label
                    htmlFor="end-date"
                    className="mb-1 block text-xs font-semibold text-slate-700"
                  >
                    Tanggal Selesai <span className="text-rose-600">*</span>
                  </label>
                  <input
                    id="end-date"
                    type="date"
                    required
                    disabled={isHalfDay}
                    min={startDate}
                    value={effectiveEndDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                  />
                </div>
              </div>

              {inlineDateError && (
                <p className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {inlineDateError}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="leave-reason"
                className="mb-1.5 block text-xs font-semibold text-slate-700"
              >
                Alasan Cuti <span className="text-rose-600">*</span>
              </label>
              <textarea
                id="leave-reason"
                rows={2}
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Tuliskan alasan singkat pengajuan cuti..."
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          {/* KARTU 2: Serah Terima Tugas (Handover) */}
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900">
              2. Serah Terima Tugas (Handover)
            </h3>

            <div>
              <label
                htmlFor="handover-user"
                className="mb-1.5 block text-xs font-semibold text-slate-700"
              >
                Rekan Pengganti ({userProfile.divisionName}){" "}
                <span className="text-rose-600">*</span>
              </label>
              <select
                id="handover-user"
                required
                value={handoverUserId}
                onChange={(e) => setHandoverUserId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">Pilih rekan satu divisi...</option>
                {colleagues.map((colleague) => (
                  <option key={colleague.id} value={colleague.id}>
                    {colleague.fullName} — {colleague.role}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="handover-notes"
                className="mb-1.5 block text-xs font-semibold text-slate-700"
              >
                Catatan Tugas <span className="text-rose-600">*</span>
              </label>
              <textarea
                id="handover-notes"
                rows={2}
                required
                value={handoverNotes}
                onChange={(e) => setHandoverNotes(e.target.value)}
                placeholder="Tugas penting yang perlu dipantau rekan pengganti selama Anda cuti..."
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          {/* KARTU 3: Smart Collapse Kontak & Progressive Disclosure Lampiran */}
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            {/* Smart Collapse Kontak */}
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-800">
                  Kontak Selama Cuti{" "}
                  <span className="font-normal text-slate-400">
                    (otomatis dari Profil)
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsEditingContact((prev) => !prev)}
                  className="text-xs font-semibold text-blue-600 transition hover:text-blue-700 hover:underline"
                >
                  {isEditingContact ? "Selesai" : "Ubah"}
                </button>
              </div>

              {!isEditingContact ? (
                <p className="mt-1 text-xs text-slate-500">
                  {leaveAddress || "-"} • {emergencyPhone || "-"}
                </p>
              ) : (
                <div className="mt-3 grid grid-cols-1 gap-3 border-t border-slate-100 pt-3 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="leave-address"
                      className="mb-1 block text-xs font-semibold text-slate-700"
                    >
                      Alamat Selama Cuti <span className="text-rose-600">*</span>
                    </label>
                    <input
                      id="leave-address"
                      type="text"
                      required
                      value={leaveAddress}
                      onChange={(e) => setLeaveAddress(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="emergency-phone"
                      className="mb-1 block text-xs font-semibold text-slate-700"
                    >
                      Nomor Darurat <span className="text-rose-600">*</span>
                    </label>
                    <input
                      id="emergency-phone"
                      type="tel"
                      required
                      value={emergencyPhone}
                      onChange={(e) => setEmergencyPhone(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Progressive Disclosure Lampiran */}
            <div className="border-t border-slate-100 pt-4">
              {selectedLeaveType?.requiresAttachment ? (
                <div className="space-y-2.5 rounded-xl border border-dashed border-rose-300 bg-rose-50/60 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-rose-700">
                      Surat Dokter / Lampiran Pendukung (Wajib *)
                    </span>
                    <span className="text-[11px] text-slate-500">
                      PDF, JPG, PNG • Maks. 5 MB
                    </span>
                  </div>

                  <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-rose-200 bg-white px-3.5 py-2.5 text-xs transition hover:bg-rose-50/40">
                    <span className="inline-flex items-center gap-2 font-medium text-slate-700">
                      <Upload
                        className="h-4 w-4 text-rose-600"
                        aria-hidden="true"
                      />
                      {attachmentFile
                        ? attachmentFile.name
                        : "Pilih file lampiran..."}
                    </span>
                    <span className="rounded-lg bg-rose-600 px-2.5 py-1 text-[11px] font-semibold text-white">
                      Unggah
                    </span>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-blue-600 transition hover:text-blue-700 hover:underline">
                    <Paperclip className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>+ Tambah Lampiran (Opsional)</span>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>

                  {attachmentFile && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs text-slate-600">
                      <span className="max-w-[180px] truncate">
                        {attachmentFile.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => setAttachmentFile(null)}
                        aria-label="Hapus lampiran"
                        className="text-slate-400 hover:text-rose-600"
                      >
                        <X className="h-3 w-3" aria-hidden="true" />
                      </button>
                    </span>
                  )}
                </div>
              )}

              {fileError && (
                <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-rose-600">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {fileError}
                </p>
              )}
            </div>
          </div>

          {/* Tombol Aksi Form */}
          <div className="flex flex-wrap items-center justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleReset}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Reset
            </button>
            <Link
              href={`/leaves?role=${roleKey}`}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Batal
            </Link>
            <button
              type="submit"
              disabled={validationErrors.length > 0 || isSubmitting}
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {isSubmitting ? "Mengirim..." : "Kirim Pengajuan"}
            </button>
          </div>
        </form>

        {/* Kolom Kanan Sticky (4/12) */}
        <div className="lg:col-span-4">
          <WhatIfQuotaWidget
            selectedLeaveType={selectedLeaveType}
            totalDays={totalWorkingDays}
            currentQuota={previewState.remainingQuota}
            initialQuota={userProfile.initialLeaveQuota}
            validationErrors={validationErrors}
          />
        </div>
      </div>
    </div>
  );
}
