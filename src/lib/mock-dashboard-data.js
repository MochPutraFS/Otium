// Data dummy sementara untuk tampilan App Shell & Dashboard sebelum backend/DB siap.
// Bentuk datanya dibuat mirip hasil query PostgreSQL supaya nanti tinggal ganti sumber datanya saja.

export const WORKSPACE_DATE_META = {
  todayLabel: "Kamis, 19 Nov 2026",
  upcomingHoliday: {
    name: "Hari Raya Natal",
    dateLabel: "25 Des 2026",
    daysAway: 36,
  },
};

export const PREVIEW_ROLE_OPTIONS = [
  { key: "admin", label: "Admin", role: "Admin" },
  { key: "karyawan", label: "Karyawan", role: "Karyawan" },
  { key: "ketua-divisi", label: "Ketua Divisi", role: "Ketua Divisi" },
  { key: "hrd", label: "HRD", role: "HRD" },
];

export const ROLE_PRESETS = {
  admin: {
    key: "admin",
    id: 1,
    username: "admin.otium",
    email: "admin@otium.co.id",
    fullName: "Dewi Kusuma",
    initials: "DK",
    role: "Admin",
    divisionName: "IT & Sistem Internal",
    leaderName: null,
    joinDate: "05 Jan 2022",
    tenureLabel: "4 Tahun 10 Bulan",
    isEligibleAnnualLeave: true,
    initialLeaveQuota: 12.0,
    remainingLeaveQuota: 12.0,
    pendingBadgeCount: 0,
    notifications: [
      {
        id: "adm-1",
        title: "Karyawan Baru Belum Eligible",
        message:
          "Dimas Anggara (Marketing) bergabung 01 Agu 2026 — otomatis diblokir dari Cuti Tahunan hingga 1 tahun masa kerja.",
        createdAt: "15 menit lalu",
        isRead: false,
        type: "system",
      },
      {
        id: "adm-2",
        title: "Pengajuan Menunggu Finalisasi",
        message:
          "Terdapat 5 pengajuan cuti lintas divisi yang masih dalam proses verifikasi bulan ini.",
        createdAt: "2 jam lalu",
        isRead: true,
        type: "info",
      },
    ],
  },
  karyawan: {
    key: "karyawan",
    id: 2,
    username: "budi.santoso",
    email: "budi@otium.co.id",
    fullName: "Budi Santoso",
    initials: "BS",
    role: "Karyawan",
    divisionName: "Engineering",
    leaderName: "Andi Wijaya",
    joinDate: "10 Jan 2024",
    tenureLabel: "2 Tahun 10 Bulan",
    isEligibleAnnualLeave: true,
    initialLeaveQuota: 12.0,
    remainingLeaveQuota: 11.5,
    pendingBadgeCount: 0,
    notifications: [
      {
        id: "emp-1",
        title: "Penunjukan Rekan Pengganti (Handover)",
        message:
          "Siti Aminah menunjuk Anda sebagai rekan pengganti pada 24 Nov – 25 Nov 2026 (2.0 Hari): Monitor deployment API v2.",
        createdAt: "10 menit lalu",
        isRead: false,
        type: "handover",
      },
      {
        id: "emp-2",
        title: "Cuti Sakit Disetujui Final",
        message:
          "Pengajuan Cuti Sakit Anda (02 Nov – 03 Nov 2026) telah disetujui oleh HRD.",
        createdAt: "2 hari lalu",
        isRead: false,
        type: "approval",
      },
      {
        id: "emp-3",
        title: "Pengajuan Cuti Tahunan Terkirim",
        message:
          "Pengajuan Cuti Tahunan 0.5 Hari (26 Nov 2026) sedang menunggu verifikasi Ketua Divisi Engineering.",
        createdAt: "3 hari lalu",
        isRead: true,
        type: "info",
      },
    ],
  },
  "ketua-divisi": {
    key: "ketua-divisi",
    id: 3,
    username: "andi.wijaya",
    email: "andi.wijaya@otium.co.id",
    fullName: "Andi Wijaya",
    initials: "AW",
    role: "Ketua Divisi",
    divisionName: "Engineering",
    leaderName: null,
    joinDate: "12 Mar 2021",
    tenureLabel: "5 Tahun 8 Bulan",
    isEligibleAnnualLeave: true,
    initialLeaveQuota: 12.0,
    remainingLeaveQuota: 10.5,
    pendingBadgeCount: 3,
    notifications: [
      {
        id: "ldr-1",
        title: "Permintaan Verifikasi Tahap 1",
        message:
          "Budi Santoso mengajukan Cuti Tahunan (0.5 Hari) pada 26 Nov 2026. Menunggu keputusan Anda.",
        createdAt: "25 menit lalu",
        isRead: false,
        type: "approval",
      },
      {
        id: "ldr-2",
        title: "Permintaan Verifikasi Tahap 1",
        message:
          "Rina Permata mengajukan Cuti Sakit (1.0 Hari) dengan lampiran surat keterangan dokter.",
        createdAt: "1 jam lalu",
        isRead: false,
        type: "approval",
      },
      {
        id: "ldr-3",
        title: "Cuti Pribadi Diteruskan ke HRD",
        message:
          "Pengajuan Cuti Tahunan pribadi Anda (27 Nov 2026, 0.5 Hari) langsung masuk antrean Final HRD.",
        createdAt: "1 hari lalu",
        isRead: true,
        type: "info",
      },
    ],
  },
  hrd: {
    key: "hrd",
    id: 4,
    username: "nadia.hrd",
    email: "nadia.hrd@otium.co.id",
    fullName: "Nadia Putri",
    initials: "NP",
    role: "HRD",
    divisionName: "Human Resources",
    leaderName: null,
    joinDate: "01 Feb 2020",
    tenureLabel: "6 Tahun 9 Bulan",
    isEligibleAnnualLeave: true,
    initialLeaveQuota: 12.0,
    remainingLeaveQuota: 10.0,
    pendingBadgeCount: 4,
    notifications: [
      {
        id: "hrd-1",
        title: "Antrean Final Approval (Tahap 2)",
        message:
          "Siti Aminah (Engineering) telah diverifikasi Ketua Divisi Andi Wijaya dan menunggu persetujuan final HRD.",
        createdAt: "12 menit lalu",
        isRead: false,
        type: "approval",
      },
      {
        id: "hrd-2",
        title: "Pengajuan Cuti Ketua Divisi",
        message:
          "Andi Wijaya (Ketua Divisi Engineering) mengajukan Cuti Tahunan 0.5 Hari pada 27 Nov 2026.",
        createdAt: "45 menit lalu",
        isRead: false,
        type: "approval",
      },
      {
        id: "hrd-3",
        title: "Rekap Cuti Bulan Berjalan",
        message:
          "7 karyawan tercatat memiliki jadwal cuti berstatus Approved pada bulan November 2026.",
        createdAt: "Kemarin",
        isRead: true,
        type: "info",
      },
    ],
  },
};

// Ambil key role dari query ?role= di URL, default ke 'karyawan' kalau kosong/tidak dikenal
export function resolvePreviewRole(roleParam) {
  if (!roleParam || typeof roleParam !== "string") {
    return "karyawan";
  }

  const normalized = roleParam.trim().toLowerCase();
  if (ROLE_PRESETS[normalized]) {
    return normalized;
  }

  if (normalized === "leader" || normalized === "ketua_divisi") {
    return "ketua-divisi";
  }

  return "karyawan";
}

export const ADMIN_DASHBOARD_MOCK = {
  periodLabel: "Nov 2026",
  stats: {
    activeUsers: 24,
    inactiveUsers: 2,
    monthlyRequests: 18,
    pendingApprovals: 5,
    totalDivisions: 4,
  },
  ineligibleEmployees: [
    {
      id: 101,
      fullName: "Rina Permata",
      email: "rina.permata@otium.co.id",
      role: "Karyawan",
      divisionName: "Engineering",
      joinDate: "15 Mei 2026",
      tenureLabel: "6 Bulan 4 Hari",
      tenureMonths: 6.1,
      tenureProgressPercent: 51,
      status: "Belum Eligible",
    },
    {
      id: 102,
      fullName: "Dimas Anggara",
      email: "dimas.anggara@otium.co.id",
      role: "Karyawan",
      divisionName: "Marketing",
      joinDate: "01 Agu 2026",
      tenureLabel: "3 Bulan 18 Hari",
      tenureMonths: 3.6,
      tenureProgressPercent: 30,
      status: "Belum Eligible",
    },
    {
      id: 103,
      fullName: "Aulia Rahma",
      email: "aulia.rahma@otium.co.id",
      role: "Karyawan",
      divisionName: "Product & Design",
      joinDate: "10 Sep 2026",
      tenureLabel: "2 Bulan 9 Hari",
      tenureMonths: 2.3,
      tenureProgressPercent: 19,
      status: "Belum Eligible",
    },
    {
      id: 104,
      fullName: "Fajar Nugroho",
      email: "fajar.nugroho@otium.co.id",
      role: "Karyawan",
      divisionName: "Finance & Ops",
      joinDate: "05 Okt 2026",
      tenureLabel: "1 Bulan 14 Hari",
      tenureMonths: 1.5,
      tenureProgressPercent: 12,
      status: "Belum Eligible",
    },
  ],
};

export const EMPLOYEE_DASHBOARD_MOCK = {
  user: ROLE_PRESETS.karyawan,
  stats: {
    remainingQuota: 11.5,
    initialQuota: 12.0,
    usedQuota: 0.5,
    sickLeaveCount: 1,
    sickLeaveDays: 2.0,
    totalRequests: 5,
    approvedCount: 2,
    approvedByLeaderCount: 1,
    pendingCount: 1,
    rejectedCount: 1,
  },
  handoverInbox: [
    {
      id: "ho-1",
      requesterName: "Siti Aminah",
      divisionName: "Engineering",
      leaveTypeName: "Cuti Tahunan",
      periodLabel: "24 Nov – 25 Nov 2026",
      totalDays: 2.0,
      handoverNotes:
        "Monitor deployment API v2, cek error log staging harian, dan teruskan tiket mendesak ke Andi Wijaya.",
      status: "Approved by Leader",
    },
    {
      id: "ho-2",
      requesterName: "Andi Wijaya",
      divisionName: "Engineering",
      leaveTypeName: "Cuti Tahunan (0.5 Hari)",
      periodLabel: "27 Nov 2026 (Siang)",
      totalDays: 0.5,
      handoverNotes:
        "Pimpin sesi daily standup tim backend dan review PR integrasi modul notifikasi.",
      status: "Pending",
    },
  ],
  recentRequests: [
    {
      id: "req-401",
      leaveTypeName: "Cuti Tahunan",
      periodLabel: "26 Nov 2026 (0.5 Hari)",
      isHalfDay: true,
      totalDays: 0.5,
      handoverName: "Siti Aminah",
      status: "Pending",
      rejectedByRole: null,
    },
    {
      id: "req-399",
      leaveTypeName: "Cuti Tahunan",
      periodLabel: "08 Des – 09 Des 2026",
      isHalfDay: false,
      totalDays: 2.0,
      handoverName: "Hendra Wijaya",
      status: "Approved by Leader",
      rejectedByRole: null,
    },
    {
      id: "req-398",
      leaveTypeName: "Cuti Sakit",
      periodLabel: "02 Nov – 03 Nov 2026",
      isHalfDay: false,
      totalDays: 2.0,
      handoverName: "Rina Permata",
      status: "Approved",
      rejectedByRole: null,
    },
    {
      id: "req-382",
      leaveTypeName: "Cuti Tahunan",
      periodLabel: "14 Okt 2026 (0.5 Hari)",
      isHalfDay: true,
      totalDays: 0.5,
      handoverName: "Hendra Wijaya",
      status: "Approved",
      rejectedByRole: null,
    },
    {
      id: "req-365",
      leaveTypeName: "Cuti Tahunan",
      periodLabel: "21 Sep – 23 Sep 2026",
      isHalfDay: false,
      totalDays: 3.0,
      handoverName: "Siti Aminah",
      status: "Rejected",
      rejectedByRole: "Ketua Divisi",
    },
  ],
};

export const LEADER_DASHBOARD_MOCK = {
  user: ROLE_PRESETS["ketua-divisi"],
  weekRangeLabel: "16 Nov – 20 Nov 2026",
  stats: {
    totalDivisionRequests: 14,
    pendingVerificationCount: 3,
    membersOnLeaveThisWeek: 2,
    personalRemainingQuota: 10.5,
    personalInitialQuota: 12.0,
  },
  weeklyScheduleStrip: [
    {
      dayShort: "Sen",
      dateNum: "16",
      isToday: false,
      onLeave: [],
    },
    {
      dayShort: "Sel",
      dateNum: "17",
      isToday: false,
      onLeave: [],
    },
    {
      dayShort: "Rab",
      dateNum: "18",
      isToday: false,
      onLeave: [{ name: "Siti A.", type: "Tahunan" }],
    },
    {
      dayShort: "Kam",
      dateNum: "19",
      isToday: true,
      onLeave: [
        { name: "Siti A.", type: "Tahunan" },
        { name: "Hendra W.", type: "Sakit" },
      ],
    },
    {
      dayShort: "Jum",
      dateNum: "20",
      isToday: false,
      onLeave: [{ name: "Siti A.", type: "Tahunan" }],
    },
  ],
  weeklyLeaves: [
    {
      id: "wl-1",
      employeeName: "Siti Aminah",
      leaveTypeName: "Cuti Tahunan",
      periodLabel: "18 Nov – 20 Nov 2026",
      totalDays: 3.0,
      handoverName: "Budi Santoso",
      status: "Approved",
    },
    {
      id: "wl-2",
      employeeName: "Hendra Wijaya",
      leaveTypeName: "Cuti Sakit",
      periodLabel: "19 Nov 2026",
      totalDays: 1.0,
      handoverName: "Rina Permata",
      status: "Approved",
    },
  ],
  divisionMembers: [
    {
      id: 2,
      fullName: "Budi Santoso",
      email: "budi@otium.co.id",
      tenureLabel: "2.8 Tahun",
      remainingQuota: 11.5,
      isEligibleAnnualLeave: true,
      accountStatus: "Aktif",
    },
    {
      id: 5,
      fullName: "Siti Aminah",
      email: "siti.aminah@otium.co.id",
      tenureLabel: "1.5 Tahun",
      remainingQuota: 9.0,
      isEligibleAnnualLeave: true,
      accountStatus: "Aktif",
    },
    {
      id: 6,
      fullName: "Rina Permata",
      email: "rina.permata@otium.co.id",
      tenureLabel: "6 Bulan",
      remainingQuota: 12.0,
      isEligibleAnnualLeave: false,
      accountStatus: "Aktif",
    },
    {
      id: 7,
      fullName: "Hendra Wijaya",
      email: "hendra.wijaya@otium.co.id",
      tenureLabel: "3.1 Tahun",
      remainingQuota: 8.5,
      isEligibleAnnualLeave: true,
      accountStatus: "Aktif",
    },
    {
      id: 8,
      fullName: "Bagas Pratama",
      email: "bagas.pratama@otium.co.id",
      tenureLabel: "1.9 Tahun",
      remainingQuota: 10.0,
      isEligibleAnnualLeave: true,
      accountStatus: "Aktif",
    },
    {
      id: 9,
      fullName: "Nisa Kartika",
      email: "nisa.kartika@otium.co.id",
      tenureLabel: "2.2 Tahun",
      remainingQuota: 11.0,
      isEligibleAnnualLeave: true,
      accountStatus: "Aktif",
    },
  ],
};

export const HRD_DASHBOARD_MOCK = {
  user: ROLE_PRESETS.hrd,
  periodLabel: "November 2026",
  stats: {
    monthlyCompanyRequests: 18,
    pendingFinalApproval: 4,
    employeesOnLeaveThisMonth: 7,
    activeDivisions: 4,
    activeEmployees: 24,
  },
  monthlyApprovedLeaves: [
    {
      id: "hl-1",
      employeeName: "Siti Aminah",
      role: "Karyawan",
      divisionName: "Engineering",
      leaveTypeName: "Cuti Tahunan",
      periodLabel: "18 Nov – 20 Nov 2026",
      totalDays: 3.0,
      handoverName: "Budi Santoso",
    },
    {
      id: "hl-2",
      employeeName: "Andi Wijaya",
      role: "Ketua Divisi",
      divisionName: "Engineering",
      leaveTypeName: "Cuti Tahunan (0.5 Hari)",
      periodLabel: "27 Nov 2026 (0.5 Hr)",
      totalDays: 0.5,
      handoverName: "Budi Santoso",
    },
    {
      id: "hl-3",
      employeeName: "Hendra Wijaya",
      role: "Karyawan",
      divisionName: "Engineering",
      leaveTypeName: "Cuti Sakit",
      periodLabel: "19 Nov 2026",
      totalDays: 1.0,
      handoverName: "Rina Permata",
    },
    {
      id: "hl-4",
      employeeName: "Clara Wijaya",
      role: "Karyawan",
      divisionName: "Product & Design",
      leaveTypeName: "Cuti Menikah",
      periodLabel: "23 Nov – 25 Nov 2026",
      totalDays: 3.0,
      handoverName: "Aulia Rahma",
    },
    {
      id: "hl-5",
      employeeName: "Taufik Hidayat",
      role: "Karyawan",
      divisionName: "Finance & Ops",
      leaveTypeName: "Cuti Tahunan",
      periodLabel: "25 Nov – 26 Nov 2026",
      totalDays: 2.0,
      handoverName: "Fajar Nugroho",
    },
  ],
  divisionsSummary: [
    {
      id: 1,
      name: "Engineering",
      leaderName: "Andi Wijaya",
      activeMembers: 6,
      monthlyLeaveCount: 3,
      currentlyOnLeave: 2,
    },
    {
      id: 2,
      name: "Product & Design",
      leaderName: "Maya Lestari",
      activeMembers: 5,
      monthlyLeaveCount: 2,
      currentlyOnLeave: 1,
    },
    {
      id: 3,
      name: "Finance & Ops",
      leaderName: "Reza Pratama",
      activeMembers: 4,
      monthlyLeaveCount: 1,
      currentlyOnLeave: 1,
    },
    {
      id: 4,
      name: "Marketing",
      leaderName: "Dina Kartika",
      activeMembers: 5,
      monthlyLeaveCount: 1,
      currentlyOnLeave: 0,
    },
  ],
};
