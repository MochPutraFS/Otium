// Data mock terstruktur (1:1 dengan skema PostgreSQL) untuk pratinjau UI Modul 5
// (Form Pengajuan Cuti & Riwayat Cuti) sebelum tahap integrasi backend.

export const WORKSPACE_TODAY_ISO = "2026-11-19";
export const WORKSPACE_TODAY_LABEL = "19 Nov 2026";

export const HOLIDAYS_MOCK = [
  { date: "2026-12-25", name: "Hari Raya Natal" },
  { date: "2027-01-01", name: "Tahun Baru Masehi" },
];

export const HOLIDAY_DATE_LIST = HOLIDAYS_MOCK.map((h) => h.date);

// Merepresentasikan tabel `leave_types` (dinamis dari database, bukan hardcode di komponen)
export const LEAVE_TYPES_MOCK = [
  {
    id: 1,
    code: "ANNUAL",
    name: "Cuti Tahunan",
    maxQuota: 12.0,
    minSubmissionDays: 3,
    requiresAttachment: false,
    deductsAnnualQuota: true,
    requiresMinOneYearTenure: true,
    ruleSummary: "Min. H-3 • Potong Kuota",
    isActive: true,
  },
  {
    id: 2,
    code: "SICK",
    name: "Cuti Sakit",
    maxQuota: 14.0,
    minSubmissionDays: -3,
    requiresAttachment: true,
    deductsAnnualQuota: false,
    requiresMinOneYearTenure: false,
    ruleSummary: "H-0 s.d. H+3 • Wajib Surat Dokter",
    isActive: true,
  },
  {
    id: 3,
    code: "MARRIAGE",
    name: "Cuti Menikah",
    maxQuota: 3.0,
    minSubmissionDays: 7,
    requiresAttachment: true,
    deductsAnnualQuota: false,
    requiresMinOneYearTenure: false,
    ruleSummary: "Min. H-7 • Wajib Lampiran",
    isActive: true,
  },
  {
    id: 4,
    code: "BEREAVEMENT",
    name: "Cuti Duka",
    maxQuota: 2.0,
    minSubmissionDays: 0,
    requiresAttachment: false,
    deductsAnnualQuota: false,
    requiresMinOneYearTenure: false,
    ruleSummary: "Bisa H-0 • Tanpa Potong Kuota",
    isActive: true,
  },
];

// Merepresentasikan rekan satu divisi aktif (`GET /api/divisions/[id]/colleagues`)
export const COLLEAGUES_BY_DIVISION_MOCK = {
  Engineering: [
    { id: 2, fullName: "Budi Santoso", role: "Karyawan" },
    { id: 3, fullName: "Andi Wijaya", role: "Ketua Divisi" },
    { id: 5, fullName: "Siti Aminah", role: "Karyawan" },
    { id: 6, fullName: "Rina Permata", role: "Karyawan" },
    { id: 7, fullName: "Hendra Wijaya", role: "Karyawan" },
    { id: 8, fullName: "Bagas Pratama", role: "Karyawan" },
  ],
};

// Riwayat pengajuan cuti awal per role preview (`karyawan` & `ketua-divisi`)
export const INITIAL_LEAVE_REQUESTS_BY_ROLE = {
  karyawan: [
    {
      id: 401,
      leaveTypeId: 1,
      leaveTypeCode: "ANNUAL",
      leaveTypeName: "Cuti Tahunan",
      isHalfDay: true,
      submissionDate: "2026-11-18",
      startDate: "2026-11-26",
      endDate: "2026-11-26",
      totalDays: 0.5,
      reason: "Mengurus perpanjangan paspor di kantor imigrasi pada pagi hari.",
      handoverUserId: 5,
      handoverUserName: "Siti Aminah",
      handoverNotes:
        "PR modul auth sudah di-push; pantau tiket bug #104 jika ada kebutuhan mendesak.",
      leaveAddress: "Jl. Merdeka Selatan No. 45, Kebayoran Baru, Jakarta Selatan",
      emergencyPhone: "0812-3456-7890",
      attachmentUrl: null,
      attachmentName: null,
      status: "Pending",
      rejectedByRole: null,
      rejectionReason: null,
      cancellationReason: null,
      quotaDeducted: true,
      deductsAnnualQuota: true,
      timeline: [
        {
          stage: "Pengajuan Dibuat",
          actor: "Budi Santoso",
          role: "Karyawan",
          time: "18 Nov 2026, 09:15",
          state: "done",
          notes: "",
        },
        {
          stage: "Verifikasi Ketua Divisi",
          actor: "Andi Wijaya",
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
      ],
    },
    {
      id: 399,
      leaveTypeId: 1,
      leaveTypeCode: "ANNUAL",
      leaveTypeName: "Cuti Tahunan",
      isHalfDay: false,
      submissionDate: "2026-11-15",
      startDate: "2026-12-08",
      endDate: "2026-12-09",
      totalDays: 2.0,
      reason: "Menghadiri acara wisuda adik di Bandung bersama keluarga.",
      handoverUserId: 7,
      handoverUserName: "Hendra Wijaya",
      handoverNotes:
        "Deployment staging sudah dijadwalkan ulang ke Senin pagi; dokumentasi rilis ada di Notion.",
      leaveAddress: "Jl. Braga No. 12, Bandung",
      emergencyPhone: "0812-3456-7890",
      attachmentUrl: null,
      attachmentName: null,
      status: "Approved by Leader",
      rejectedByRole: null,
      rejectionReason: null,
      cancellationReason: null,
      quotaDeducted: true,
      deductsAnnualQuota: true,
      timeline: [
        {
          stage: "Pengajuan Dibuat",
          actor: "Budi Santoso",
          role: "Karyawan",
          time: "15 Nov 2026, 14:10",
          state: "done",
          notes: "",
        },
        {
          stage: "Verifikasi Ketua Divisi",
          actor: "Andi Wijaya",
          role: "Ketua Divisi",
          time: "16 Nov 2026, 10:20",
          state: "done",
          notes: "Jadwal sprint aman, handover dengan Hendra sudah dikonfirmasi.",
        },
        {
          stage: "Persetujuan Final HRD",
          actor: "Nadia Putri",
          role: "HRD",
          time: "Menunggu persetujuan final",
          state: "active",
          notes: "",
        },
      ],
    },
    {
      id: 398,
      leaveTypeId: 2,
      leaveTypeCode: "SICK",
      leaveTypeName: "Cuti Sakit",
      isHalfDay: false,
      submissionDate: "2026-11-02",
      startDate: "2026-11-02",
      endDate: "2026-11-03",
      totalDays: 2.0,
      reason: "Demam tinggi dan istirahat total sesuai anjuran dokter.",
      handoverUserId: 6,
      handoverUserName: "Rina Permata",
      handoverNotes: "Follow-up QA release v1.4 dan rekap hasil uji regresi.",
      leaveAddress: "Jl. Merdeka Selatan No. 45, Kebayoran Baru, Jakarta Selatan",
      emergencyPhone: "0812-3456-7890",
      attachmentUrl: "/uploads/attachments/surat-dokter-budi-nov2026.pdf",
      attachmentName: "surat-dokter-budi-nov2026.pdf",
      status: "Approved",
      rejectedByRole: null,
      rejectionReason: null,
      cancellationReason: null,
      quotaDeducted: false,
      deductsAnnualQuota: false,
      timeline: [
        {
          stage: "Pengajuan Dibuat",
          actor: "Budi Santoso",
          role: "Karyawan",
          time: "02 Nov 2026, 08:30",
          state: "done",
          notes: "",
        },
        {
          stage: "Verifikasi Ketua Divisi",
          actor: "Andi Wijaya",
          role: "Ketua Divisi",
          time: "02 Nov 2026, 09:05",
          state: "done",
          notes: "Semoga lekas pulih, tugas QA sudah dibantu Rina.",
        },
        {
          stage: "Persetujuan Final HRD",
          actor: "Nadia Putri",
          role: "HRD",
          time: "02 Nov 2026, 11:40",
          state: "done",
          notes: "Surat keterangan dokter terverifikasi. Disetujui final.",
        },
      ],
    },
    {
      id: 365,
      leaveTypeId: 1,
      leaveTypeCode: "ANNUAL",
      leaveTypeName: "Cuti Tahunan",
      isHalfDay: false,
      submissionDate: "2026-09-14",
      startDate: "2026-09-21",
      endDate: "2026-09-23",
      totalDays: 3.0,
      reason: "Rencana liburan keluarga keluar kota.",
      handoverUserId: 5,
      handoverUserName: "Siti Aminah",
      handoverNotes: "Monitoring server produksi dan laporan metrik mingguan.",
      leaveAddress: "Jl. Merdeka Selatan No. 45, Kebayoran Baru, Jakarta Selatan",
      emergencyPhone: "0812-3456-7890",
      attachmentUrl: null,
      attachmentName: null,
      status: "Rejected",
      rejectedByRole: "Ketua Divisi",
      rejectionReason:
        "Bertepatan dengan jadwal go-live proyek klien Q3. Mohon ajukan ulang pada minggu berikutnya.",
      cancellationReason: null,
      quotaDeducted: false,
      deductsAnnualQuota: true,
      timeline: [
        {
          stage: "Pengajuan Dibuat",
          actor: "Budi Santoso",
          role: "Karyawan",
          time: "14 Sep 2026, 13:10",
          state: "done",
          notes: "",
        },
        {
          stage: "Verifikasi Ketua Divisi",
          actor: "Andi Wijaya",
          role: "Ketua Divisi",
          time: "14 Sep 2026, 16:00",
          state: "rejected",
          notes:
            "Bertepatan dengan jadwal go-live proyek klien Q3. Mohon ajukan ulang pada minggu berikutnya.",
        },
      ],
    },
  ],
  "ketua-divisi": [
    {
      id: 501,
      leaveTypeId: 1,
      leaveTypeCode: "ANNUAL",
      leaveTypeName: "Cuti Tahunan",
      isHalfDay: true,
      submissionDate: "2026-11-18",
      startDate: "2026-11-27",
      endDate: "2026-11-27",
      totalDays: 0.5,
      reason: "Keperluan administrasi keluarga pada siang hari.",
      handoverUserId: 2,
      handoverUserName: "Budi Santoso",
      handoverNotes:
        "Pimpin sesi daily standup tim backend dan review PR integrasi modul notifikasi.",
      leaveAddress: "Jl. Kemang Raya No. 18, Mampang Prapatan, Jakarta Selatan",
      emergencyPhone: "0813-7788-2211",
      attachmentUrl: null,
      attachmentName: null,
      status: "Pending",
      rejectedByRole: null,
      rejectionReason: null,
      cancellationReason: null,
      quotaDeducted: true,
      deductsAnnualQuota: true,
      timeline: [
        {
          stage: "Pengajuan Dibuat",
          actor: "Andi Wijaya",
          role: "Ketua Divisi",
          time: "18 Nov 2026, 11:05",
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
      ],
    },
    {
      id: 488,
      leaveTypeId: 1,
      leaveTypeCode: "ANNUAL",
      leaveTypeName: "Cuti Tahunan",
      isHalfDay: false,
      submissionDate: "2026-10-01",
      startDate: "2026-10-12",
      endDate: "2026-10-12",
      totalDays: 1.0,
      reason: "Keperluan pribadi di luar kantor.",
      handoverUserId: 7,
      handoverUserName: "Hendra Wijaya",
      handoverNotes: "Koordinasi rilis sprint 14 bersama tim Product.",
      leaveAddress: "Jl. Kemang Raya No. 18, Mampang Prapatan, Jakarta Selatan",
      emergencyPhone: "0813-7788-2211",
      attachmentUrl: null,
      attachmentName: null,
      status: "Approved",
      rejectedByRole: null,
      rejectionReason: null,
      cancellationReason: null,
      quotaDeducted: true,
      deductsAnnualQuota: true,
      timeline: [
        {
          stage: "Pengajuan Dibuat",
          actor: "Andi Wijaya",
          role: "Ketua Divisi",
          time: "01 Okt 2026, 09:30",
          state: "done",
          notes: "",
        },
        {
          stage: "Persetujuan Final HRD",
          actor: "Nadia Putri",
          role: "HRD",
          time: "02 Okt 2026, 10:15",
          state: "done",
          notes: "Disetujui final oleh HRD.",
        },
      ],
    },
  ],
};

const STORAGE_PREFIX = "otium_leaves_preview_v1_";

export function loadLeavesPreviewState(roleKey, fallbackQuota) {
  const defaultRequests = INITIAL_LEAVE_REQUESTS_BY_ROLE[roleKey] || [];
  if (typeof window === "undefined") {
    return { requests: defaultRequests, remainingQuota: fallbackQuota };
  }
  try {
    const raw = window.sessionStorage.getItem(`${STORAGE_PREFIX}${roleKey}`);
    if (!raw) {
      return { requests: defaultRequests, remainingQuota: fallbackQuota };
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.requests) && typeof parsed.remainingQuota === "number") {
      return parsed;
    }
  } catch {
    // Fallback aman jika sessionStorage tidak tersedia
  }
  return { requests: defaultRequests, remainingQuota: fallbackQuota };
}

export function saveLeavesPreviewState(roleKey, state) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      `${STORAGE_PREFIX}${roleKey}`,
      JSON.stringify(state)
    );
  } catch {
    // Abaikan error quota storage
  }
}
