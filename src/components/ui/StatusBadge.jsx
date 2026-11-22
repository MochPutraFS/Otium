function renderStatusIcon(status) {
  switch (status) {
    case "Pending":
    case "Belum Eligible":
      return (
        <svg
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          aria-hidden="true"
        >
          <circle cx="8" cy="8" r="5.5" />
          <path d="M8 5v3.2l2.2 1.3" />
        </svg>
      );
    case "Approved by Leader":
      return (
        <svg
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          aria-hidden="true"
        >
          <circle cx="8" cy="8" r="5.5" />
          <path
            d="M8 2.5A5.5 5.5 0 0 1 8 13.5Z"
            fill="currentColor"
            stroke="none"
          />
        </svg>
      );
    case "Approved":
    case "Aktif":
    case "Eligible":
      return (
        <svg
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <path d="M3 8.5l3.2 3.2L13 4.8" />
        </svg>
      );
    case "Rejected":
    case "Nonaktif":
      return (
        <svg
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <path d="M4 4l8 8M12 4l-8 8" />
        </svg>
      );
    case "Cancelled":
      return (
        <svg
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          aria-hidden="true"
        >
          <path d="M3.5 6.5h7a3 3 0 1 1 0 6H7M6 4L3.5 6.5 6 9" />
        </svg>
      );
    default:
      return null;
  }
}

const STATUS_TAG_CLASSES = {
  // 5 Status Pengajuan Cuti Resmi
  Pending: "tag-pending",
  "Approved by Leader": "tag-leader",
  Approved: "tag-approved",
  Rejected: "tag-rejected",
  Cancelled: "tag-cancelled",

  // Status Akun & Masa Kerja
  Aktif: "tag-approved",
  Nonaktif: "tag-rejected",
  Eligible: "tag-approved",
  "Belum Eligible": "tag-pending",

  // 4 Role Resmi Pengguna
  Admin: "tag-rejected",
  Karyawan: "tag-approved",
  "Ketua Divisi": "tag-leader",
  HRD: "tag-pending",
};

/**
 * StatusBadge — Tag bergaya Swiss Archival (.tag) dengan ikon + bentuk + label (WCAG 1.4.1).
 * Mendukung 5 status cuti resmi, status akun/kelayakan, dan 4 role pengguna.
 */
export default function StatusBadge({
  status,
  rejectedByRole,
  className = "",
}) {
  const toneClass = STATUS_TAG_CLASSES[status] || "tag-cancelled";
  const icon = renderStatusIcon(status);

  const displayLabel =
    status === "Rejected" && rejectedByRole
      ? `Ditolak (${rejectedByRole})`
      : status;

  return (
    <span className={`tag ${toneClass} ${className}`.trim()}>
      {icon}
      <span>{displayLabel}</span>
    </span>
  );
}
