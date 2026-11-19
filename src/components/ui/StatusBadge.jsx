const STATUS_STYLES = {
  // Status pengajuan cuti
  Pending: "bg-amber-50 text-amber-700 border-amber-200",
  "Approved by Leader": "bg-sky-50 text-sky-700 border-sky-200",
  Approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Rejected: "bg-rose-50 text-rose-700 border-rose-200",
  Cancelled: "bg-slate-100 text-slate-600 border-slate-300",

  // Status akun & masa kerja
  Aktif: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Nonaktif: "bg-rose-50 text-rose-700 border-rose-200",
  Eligible: "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Belum Eligible": "bg-amber-50 text-amber-800 border-amber-300",

  // Role pengguna
  Admin: "bg-purple-50 text-purple-700 border-purple-200",
  Karyawan: "bg-slate-100 text-slate-700 border-slate-200",
  "Ketua Divisi": "bg-blue-50 text-blue-700 border-blue-200",
  HRD: "bg-indigo-50 text-indigo-700 border-indigo-200",
};

// Badge warna untuk status cuti, status akun, kelayakan masa kerja, dan role
export default function StatusBadge({ status, rejectedByRole, className = "" }) {
  const toneClass = STATUS_STYLES[status] || STATUS_STYLES.Cancelled;

  const displayLabel =
    status === "Rejected" && rejectedByRole
      ? `Ditolak (${rejectedByRole})`
      : status;

  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium ${toneClass} ${className}`}
    >
      {displayLabel}
    </span>
  );
}
