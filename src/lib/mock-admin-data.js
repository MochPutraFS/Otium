// Unified mock data store (1:1 dengan skema tabel PostgreSQL: users, divisions, leave_types)
// untuk pratinjau UI 4 Modul CMS Master Data Admin sebelum integrasi backend Raw SQL.

export const ADMIN_CMS_STORAGE_KEY = "otium_admin_cms_preview_v1";
export const ADMIN_WORKSPACE_TODAY_ISO = "2026-11-19";

export const INITIAL_ADMIN_DIVISIONS = [
  {
    id: 1,
    name: "Engineering",
    description: "Pengembangan aplikasi web, API, arsitektur sistem, dan QA.",
    leaderId: 3,
    createdAt: "2024-01-10",
  },
  {
    id: 2,
    name: "Product & Design",
    description: "Riset produk, UI/UX design system, dan manajemen roadmap.",
    leaderId: 9,
    createdAt: "2024-02-15",
  },
  {
    id: 3,
    name: "Marketing & Growth",
    description: "Strategi akuisisi pengguna, branding, dan komunikasi korporat.",
    leaderId: 11,
    createdAt: "2024-04-02",
  },
  {
    id: 4,
    name: "Human Resources",
    description: "Pengelolaan SDM, payroll, rekrutmen, dan kebijakan cuti.",
    leaderId: null,
    createdAt: "2023-01-05",
  },
];

export const INITIAL_ADMIN_USERS = [
  {
    id: 1,
    username: "admin",
    email: "admin@otium.id",
    fullName: "Admin Utama",
    role: "Admin",
    divisionId: null,
    initialLeaveQuota: 12.0,
    remainingLeaveQuota: 12.0,
    joinDate: "2023-01-05",
    isActive: true,
    phone: "0811-1000-0001",
  },
  {
    id: 4,
    username: "dian.hrd",
    email: "dian.hrd@otium.id",
    fullName: "Dian Kusuma",
    role: "HRD",
    divisionId: 4,
    initialLeaveQuota: 12.0,
    remainingLeaveQuota: 12.0,
    joinDate: "2023-03-12",
    isActive: true,
    phone: "0811-1000-0004",
  },
  {
    id: 3,
    username: "andi.w",
    email: "andi.wijaya@otium.id",
    fullName: "Andi Wijaya",
    role: "Ketua Divisi",
    divisionId: 1,
    initialLeaveQuota: 12.0,
    remainingLeaveQuota: 10.5,
    joinDate: "2024-02-12",
    isActive: true,
    phone: "0812-2200-0003",
  },
  {
    id: 9,
    username: "nadia.p",
    email: "nadia.putri@otium.id",
    fullName: "Nadia Putri",
    role: "Ketua Divisi",
    divisionId: 2,
    initialLeaveQuota: 12.0,
    remainingLeaveQuota: 9.0,
    joinDate: "2024-02-20",
    isActive: true,
    phone: "0812-2200-0009",
  },
  {
    id: 11,
    username: "fajar.n",
    email: "fajar.nugroho@otium.id",
    fullName: "Fajar Nugroho",
    role: "Ketua Divisi",
    divisionId: 3,
    initialLeaveQuota: 12.0,
    remainingLeaveQuota: 11.0,
    joinDate: "2024-04-05",
    isActive: true,
    phone: "0812-2200-0011",
  },
  {
    id: 14,
    username: "reza.mahendra",
    email: "reza.mahendra@otium.id",
    fullName: "Reza Mahendra",
    role: "Ketua Divisi",
    divisionId: null,
    initialLeaveQuota: 12.0,
    remainingLeaveQuota: 12.0,
    joinDate: "2024-09-01",
    isActive: true,
    phone: "0812-2200-0014",
  },
  {
    id: 2,
    username: "budi.s",
    email: "budi.santoso@otium.id",
    fullName: "Budi Santoso",
    role: "Karyawan",
    divisionId: 1,
    initialLeaveQuota: 12.0,
    remainingLeaveQuota: 11.5,
    joinDate: "2024-05-01",
    isActive: true,
    phone: "0812-3456-7890",
  },
  {
    id: 5,
    username: "siti.a",
    email: "siti.aminah@otium.id",
    fullName: "Siti Aminah",
    role: "Karyawan",
    divisionId: 1,
    initialLeaveQuota: 12.0,
    remainingLeaveQuota: 9.0,
    joinDate: "2024-06-15",
    isActive: true,
    phone: "0813-4567-8901",
  },
  {
    id: 6,
    username: "rina.p",
    email: "rina.permata@otium.id",
    fullName: "Rina Permata",
    role: "Karyawan",
    divisionId: 1,
    initialLeaveQuota: 12.0,
    remainingLeaveQuota: 12.0,
    joinDate: "2026-05-15",
    isActive: true,
    phone: "0813-8899-0011",
  },
  {
    id: 7,
    username: "hendra.w",
    email: "hendra.wijaya@otium.id",
    fullName: "Hendra Wijaya",
    role: "Karyawan",
    divisionId: 1,
    initialLeaveQuota: 12.0,
    remainingLeaveQuota: 8.5,
    joinDate: "2025-01-10",
    isActive: true,
    phone: "0815-1122-3344",
  },
  {
    id: 10,
    username: "tara.l",
    email: "tara.larasati@otium.id",
    fullName: "Tara Larasati",
    role: "Karyawan",
    divisionId: 2,
    initialLeaveQuota: 12.0,
    remainingLeaveQuota: 12.0,
    joinDate: "2026-08-01",
    isActive: true,
    phone: "0815-7788-9900",
  },
  {
    id: 12,
    username: "dimas.a",
    email: "dimas.anggara@otium.id",
    fullName: "Dimas Anggara",
    role: "Karyawan",
    divisionId: 3,
    initialLeaveQuota: 12.0,
    remainingLeaveQuota: 10.0,
    joinDate: "2025-03-18",
    isActive: true,
    phone: "0816-2345-6789",
  },
  {
    id: 15,
    username: "alya.k",
    email: "alya.kirana@otium.id",
    fullName: "Alya Kirana",
    role: "Karyawan",
    divisionId: null,
    initialLeaveQuota: 12.0,
    remainingLeaveQuota: 12.0,
    joinDate: "2026-09-10",
    isActive: true,
    phone: "0817-9900-1122",
  },
  {
    id: 16,
    username: "kevin.p",
    email: "kevin.pratama@otium.id",
    fullName: "Kevin Pratama",
    role: "Karyawan",
    divisionId: null,
    initialLeaveQuota: 12.0,
    remainingLeaveQuota: 11.0,
    joinDate: "2025-07-04",
    isActive: true,
    phone: "0818-4455-6677",
  },
  {
    id: 17,
    username: "doni.r",
    email: "doni.ramadhan@otium.id",
    fullName: "Doni Ramadhan",
    role: "Karyawan",
    divisionId: 3,
    initialLeaveQuota: 12.0,
    remainingLeaveQuota: 6.0,
    joinDate: "2024-03-22",
    isActive: false,
    phone: "0819-0011-2233",
  },
];

export const INITIAL_ADMIN_LEAVE_TYPES = [
  {
    id: 1,
    code: "ANNUAL",
    name: "Cuti Tahunan",
    maxQuota: 12.0,
    minSubmissionDays: 3,
    requiresAttachment: false,
    deductsAnnualQuota: true,
    requiresMinOneYearTenure: true,
    description:
      "Cuti tahunan reguler (12 hari kerja/tahun). Wajib diajukan minimal H-3 untuk karyawan dengan masa kerja >= 1 tahun.",
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
    description:
      "Wajib melampirkan surat keterangan dokter. Dapat diajukan mulai hari pertama sakit (H-0) hingga maksimal H+3.",
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
    description:
      "Cuti khusus pernikahan karyawan. Melampirkan undangan atau surat keterangan resmi minimal H-7.",
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
    description:
      "Cuti kedukaan keluarga inti. Dapat diajukan mendadak pada hari yang sama (H-0) tanpa memotong kuota tahunan.",
    isActive: true,
  },
  {
    id: 5,
    code: "MATERNITY",
    name: "Cuti Melahirkan",
    maxQuota: 90.0,
    minSubmissionDays: 14,
    requiresAttachment: true,
    deductsAnnualQuota: false,
    requiresMinOneYearTenure: false,
    description:
      "Cuti melahirkan bagi karyawati sesuai regulasi ketenagakerjaan dengan surat keterangan dokter kandungan.",
    isActive: true,
  },
];

export const PROTECTED_USER_ROLES = ["Admin", "HRD"];

export function getInitialAdminCmsState() {
  return {
    users: INITIAL_ADMIN_USERS.map((u) => ({ ...u })),
    divisions: INITIAL_ADMIN_DIVISIONS.map((d) => ({ ...d })),
    leaveTypes: INITIAL_ADMIN_LEAVE_TYPES.map((lt) => ({ ...lt })),
  };
}

export function loadAdminCmsPreviewState() {
  const fallback = getInitialAdminCmsState();
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(ADMIN_CMS_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (
      !parsed ||
      !Array.isArray(parsed.users) ||
      !Array.isArray(parsed.divisions) ||
      !Array.isArray(parsed.leaveTypes)
    ) {
      return fallback;
    }
    return parsed;
  } catch {
    return fallback;
  }
}

export function saveAdminCmsPreviewState(state) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ADMIN_CMS_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Abaikan error storage quota pada mode pratinjau
  }
}

export function resetAdminCmsPreviewState() {
  const initial = getInitialAdminCmsState();
  saveAdminCmsPreviewState(initial);
  return initial;
}

// Hitung masa kerja relatif terhadap tanggal acuan workspace (join_date + 1 year <= today)
export function calculateTenureMeta(
  joinDateIso,
  todayIso = ADMIN_WORKSPACE_TODAY_ISO
) {
  if (!joinDateIso) {
    return {
      isEligible: false,
      yearsDecimal: 0,
      label: "-",
      statusLabel: "Belum Eligible",
    };
  }

  const [jy, jm, jd] = joinDateIso.split("-").map(Number);
  const [ty, tm, td] = todayIso.split("-").map(Number);

  const joinDate = new Date(Date.UTC(jy, jm - 1, jd));
  const todayDate = new Date(Date.UTC(ty, tm - 1, td));
  const anniversaryDate = new Date(Date.UTC(jy + 1, jm - 1, jd));

  const diffDays = Math.max(
    0,
    Math.floor((todayDate.getTime() - joinDate.getTime()) / 86400000)
  );
  const yearsDecimal = Number((diffDays / 365.25).toFixed(1));
  const isEligible = todayDate.getTime() >= anniversaryDate.getTime();

  let label = `${yearsDecimal.toFixed(1)} Thn`;
  if (!isEligible) {
    const months = Math.max(0, Math.floor(diffDays / 30));
    label = months < 1 ? "< 1 Bln" : `${months} Bln (< 1 Thn)`;
  }

  return {
    isEligible,
    yearsDecimal,
    label,
    statusLabel: isEligible ? "Eligible" : "Belum Eligible",
  };
}

// Format tanggal YYYY-MM-DD ke label singkat Indonesia (contoh: 15 Mei 2026)
export function formatShortIndonesianDate(isoDate) {
  if (!isoDate) return "-";
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "Mei",
    "Jun",
    "Jul",
    "Agu",
    "Sep",
    "Okt",
    "Nov",
    "Des",
  ];
  const parts = isoDate.split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return isoDate;
  const [y, m, d] = parts;
  return `${String(d).padStart(2, "0")} ${months[m - 1] || ""} ${y}`;
}

// Format batas pengajuan integer menjadi label human-readable
export function formatSubmissionLeadTime(minSubmissionDays) {
  const n = Number(minSubmissionDays);
  if (Number.isNaN(n) || n === 0) return "Bisa H-0";
  if (n > 0) return `Min. H-${n}`;
  return `Maks. H+${Math.abs(n)}`;
}

// Format ringkasan aturan bisnis jenis cuti
export function buildLeaveTypeRuleSummary(lt) {
  const parts = [formatSubmissionLeadTime(lt.minSubmissionDays)];
  parts.push(lt.requiresAttachment ? "Wajib Lampiran" : "Tanpa Lampiran");
  parts.push(lt.deductsAnnualQuota ? "Potong Kuota Tahunan" : "Non-Kuota Tahunan");
  if (lt.requiresMinOneYearTenure) {
    parts.push("Masa Kerja >= 1 Thn");
  }
  return parts.join(" • ");
}
