// Data dummy & penyimpanan simulasi sessionStorage untuk Modul 6A (Ketua Divisi) & 6B (HRD).
// Bentuk field menyelaraskan 1:1 dengan tabel leave_requests, users, divisions, & leave_types
// agar pada fase integrasi backend Raw SQL cukup mengganti sumber data & handler Server Actions.

const STORAGE_KEY = "otium_approvals_preview_v1";

export const APPROVALS_TODAY_LABEL = "20 Nov 2026";

export const INITIAL_APPROVAL_REQUESTS = [
  {
    id: 201,
    applicantId: 2,
    applicantName: "Budi Santoso",
    applicantInitials: "BS",
    applicantRole: "Karyawan",
    divisionName: "Engineering",
    leaveTypeId: 1,
    leaveTypeCode: "ANNUAL",
    leaveTypeName: "Cuti Tahunan",
    deductsAnnualQuota: true,
    isHalfDay: true,
    startDate: "2026-11-26",
    endDate: "2026-11-26",
    totalDays: 0.5,
    remainingQuota: 11.5,
    submissionDate: "2026-11-19",
    reason:
      "Mengurus perpanjangan dokumen administrasi keluarga di pagi hari.",
    handoverUserName: "Siti Aminah",
    handoverNotes:
      "PR modul autentikasi sudah di-push ke branch staging. Mohon pantau tiket bug #104 jika ada isu mendesak.",
    leaveAddress: "Jl. Merdeka No. 45, Jakarta Selatan",
    emergencyPhone: "0812-3456-7890",
    attachmentUrl: null,
    attachmentName: null,
    status: "Pending",
    quotaDeducted: true,
    leaderApproverName: null,
    leaderApprovedAt: null,
    leaderNotes: null,
    hrdApproverName: null,
    hrdApprovedAt: null,
    hrdNotes: null,
    rejectedByRole: null,
    rejectionReason: null,
    cancellationReason: null,
  },
  {
    id: 202,
    applicantId: 4,
    applicantName: "Rina Permata",
    applicantInitials: "RP",
    applicantRole: "Karyawan",
    divisionName: "Engineering",
    leaveTypeId: 2,
    leaveTypeCode: "SICK",
    leaveTypeName: "Cuti Sakit",
    deductsAnnualQuota: false,
    isHalfDay: false,
    startDate: "2026-11-20",
    endDate: "2026-11-21",
    totalDays: 2.0,
    remainingQuota: 12.0,
    submissionDate: "2026-11-20",
    reason:
      "Demam tinggi dan dianjurkan istirahat total selama 2 hari oleh dokter klinik.",
    handoverUserName: "Budi Santoso",
    handoverNotes:
      "Checklist QA halaman profil dan catatan bug minor sudah diunggah ke folder tim Engineering.",
    leaveAddress: "Jl. Tebet Barat Dalam No. 18, Jakarta Selatan",
    emergencyPhone: "0813-8821-0092",
    attachmentUrl: "/uploads/attachments/surat-dokter-rina-20nov.pdf",
    attachmentName: "surat-dokter-rina-20nov.pdf",
    status: "Pending",
    quotaDeducted: false,
    leaderApproverName: null,
    leaderApprovedAt: null,
    leaderNotes: null,
    hrdApproverName: null,
    hrdApprovedAt: null,
    hrdNotes: null,
    rejectedByRole: null,
    rejectionReason: null,
    cancellationReason: null,
  },
  {
    id: 203,
    applicantId: 5,
    applicantName: "Siti Aminah",
    applicantInitials: "SA",
    applicantRole: "Karyawan",
    divisionName: "Engineering",
    leaveTypeId: 1,
    leaveTypeCode: "ANNUAL",
    leaveTypeName: "Cuti Tahunan",
    deductsAnnualQuota: true,
    isHalfDay: false,
    startDate: "2026-12-02",
    endDate: "2026-12-04",
    totalDays: 3.0,
    remainingQuota: 9.0,
    submissionDate: "2026-11-15",
    reason: "Menghadiri acara pernikahan saudara kandung di Yogyakarta.",
    handoverUserName: "Budi Santoso",
    handoverNotes:
      "Monitoring deployment API v2 dan review PR sprint 12 sudah diserahkan ke Budi.",
    leaveAddress: "Jl. Malioboro No. 88, Yogyakarta",
    emergencyPhone: "0812-7744-9910",
    attachmentUrl: null,
    attachmentName: null,
    status: "Approved by Leader",
    quotaDeducted: true,
    leaderApproverName: "Andi Wijaya",
    leaderApprovedAt: "16 Nov 2026, 10:24",
    leaderNotes:
      "Jadwal rilis aman, serah terima tugas dengan Budi sudah dikonfirmasi.",
    hrdApproverName: null,
    hrdApprovedAt: null,
    hrdNotes: null,
    rejectedByRole: null,
    rejectionReason: null,
    cancellationReason: null,
  },
  {
    id: 204,
    applicantId: 3,
    applicantName: "Andi Wijaya",
    applicantInitials: "AW",
    applicantRole: "Ketua Divisi",
    divisionName: "Engineering",
    leaveTypeId: 1,
    leaveTypeCode: "ANNUAL",
    leaveTypeName: "Cuti Tahunan",
    deductsAnnualQuota: true,
    isHalfDay: true,
    startDate: "2026-11-27",
    endDate: "2026-11-27",
    totalDays: 0.5,
    remainingQuota: 10.5,
    submissionDate: "2026-11-18",
    reason: "Keperluan pribadi keluarga di pagi hari (Jalur Langsung HRD).",
    handoverUserName: "Budi Santoso",
    handoverNotes:
      "Daily standup Engineering pagi hari dipimpin sementara oleh Budi Santoso.",
    leaveAddress: "Jl. Kemang Raya No. 11, Jakarta Selatan",
    emergencyPhone: "0811-2233-4455",
    attachmentUrl: null,
    attachmentName: null,
    status: "Pending",
    quotaDeducted: true,
    leaderApproverName: null,
    leaderApprovedAt: null,
    leaderNotes: null,
    hrdApproverName: null,
    hrdApprovedAt: null,
    hrdNotes: null,
    rejectedByRole: null,
    rejectionReason: null,
    cancellationReason: null,
  },
  {
    id: 205,
    applicantId: 8,
    applicantName: "Dimas Anggara",
    applicantInitials: "DA",
    applicantRole: "Karyawan",
    divisionName: "Marketing",
    leaveTypeId: 3,
    leaveTypeCode: "MARRIAGE",
    leaveTypeName: "Cuti Menikah",
    deductsAnnualQuota: false,
    isHalfDay: false,
    startDate: "2026-12-07",
    endDate: "2026-12-09",
    totalDays: 3.0,
    remainingQuota: 12.0,
    submissionDate: "2026-11-14",
    reason: "Melangsungkan pernikahan resmi sesuai jadwal keluarga.",
    handoverUserName: "Nadia Putri",
    handoverNotes:
      "Seluruh kampanye iklan bulan Desember sudah dijadwalkan di Meta Ads Manager.",
    leaveAddress: "Jl. Braga No. 12, Bandung",
    emergencyPhone: "0856-9012-3344",
    attachmentUrl: "/uploads/attachments/undangan-nikah-dimas.jpg",
    attachmentName: "undangan-nikah-dimas.jpg",
    status: "Approved by Leader",
    quotaDeducted: false,
    leaderApproverName: "Dewi Lestari",
    leaderApprovedAt: "15 Nov 2026, 14:10",
    leaderNotes:
      "Selamat menempuh hidup baru! Handover kampanye sudah dicek bersama Nadia.",
    hrdApproverName: null,
    hrdApprovedAt: null,
    hrdNotes: null,
    rejectedByRole: null,
    rejectionReason: null,
    cancellationReason: null,
  },
  {
    id: 206,
    applicantId: 6,
    applicantName: "Hendra Wijaya",
    applicantInitials: "HW",
    applicantRole: "Karyawan",
    divisionName: "Engineering",
    leaveTypeId: 1,
    leaveTypeCode: "ANNUAL",
    leaveTypeName: "Cuti Tahunan",
    deductsAnnualQuota: true,
    isHalfDay: false,
    startDate: "2026-11-10",
    endDate: "2026-11-11",
    totalDays: 2.0,
    remainingQuota: 8.5,
    submissionDate: "2026-11-02",
    reason: "Kunjungan keluarga ke Surabaya.",
    handoverUserName: "Siti Aminah",
    handoverNotes:
      "Backup database mingguan sudah diotomatisasi dan dipantau oleh Siti.",
    leaveAddress: "Jl. Darmo No. 22, Surabaya",
    emergencyPhone: "0812-3399-1122",
    attachmentUrl: null,
    attachmentName: null,
    status: "Approved",
    quotaDeducted: true,
    leaderApproverName: "Andi Wijaya",
    leaderApprovedAt: "03 Nov 2026, 09:05",
    leaderNotes: "Aman, disetujui.",
    hrdApproverName: "Ratna Sari",
    hrdApprovedAt: "03 Nov 2026, 15:40",
    hrdNotes: "Final approved. Selamat beristirahat.",
    rejectedByRole: null,
    rejectionReason: null,
    cancellationReason: null,
  },
  {
    id: 207,
    applicantId: 9,
    applicantName: "Fajar Pratama",
    applicantInitials: "FP",
    applicantRole: "Karyawan",
    divisionName: "Finance & Ops",
    leaveTypeId: 1,
    leaveTypeCode: "ANNUAL",
    leaveTypeName: "Cuti Tahunan",
    deductsAnnualQuota: true,
    isHalfDay: false,
    startDate: "2026-10-28",
    endDate: "2026-10-30",
    totalDays: 3.0,
    remainingQuota: 10.0,
    submissionDate: "2026-10-20",
    reason: "Liburan keluarga akhir bulan.",
    handoverUserName: "Lina Marlina",
    handoverNotes: "Rekonsiliasi kas kecil sementara dipantau Lina.",
    leaveAddress: "Jl. Sudirman No. 15, Bogor",
    emergencyPhone: "0817-4455-8800",
    attachmentUrl: null,
    attachmentName: null,
    status: "Rejected",
    quotaDeducted: false,
    leaderApproverName: "Rizky Ramadhan",
    leaderApprovedAt: "21 Okt 2026, 11:00",
    leaderNotes: "Mohon maaf, periode closing laporan keuangan akhir bulan sedang padat.",
    hrdApproverName: null,
    hrdApprovedAt: null,
    hrdNotes: null,
    rejectedByRole: "Ketua Divisi",
    rejectionReason:
      "Periode closing laporan keuangan akhir bulan sedang padat, mohon jadwalkan ulang di awal November.",
    cancellationReason: null,
  },
];

export function loadApprovalsPreviewState() {
  if (typeof window === "undefined") {
    return INITIAL_APPROVAL_REQUESTS;
  }
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_APPROVAL_REQUESTS;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return INITIAL_APPROVAL_REQUESTS;
    }
    return parsed;
  } catch {
    return INITIAL_APPROVAL_REQUESTS;
  }
}

export function saveApprovalsPreviewState(requests) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
  } catch {
    // Abaikan jika storage penuh / mode privat
  }
}

export function resetApprovalsPreviewState() {
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Abaikan
    }
  }
  return INITIAL_APPROVAL_REQUESTS;
}
