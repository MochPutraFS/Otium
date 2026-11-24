"use client";

import { useEffect, useState } from "react";

const SIZE_STYLES = {
  sm: {
    img: "h-7 w-7 shrink-0 rounded-[2px] border border-[var(--rule)] object-cover",
    fallback: "avatar-sq",
  },
  md: {
    img: "h-8 w-8 shrink-0 rounded-[2px] border border-[var(--rule)] object-cover",
    fallback: "avatar-sq !h-8 !w-8",
  },
  lg: {
    img: "h-9 w-9 shrink-0 rounded-[2px] border border-[var(--rule-strong)] bg-[var(--paper-pure)] object-cover",
    fallback: "avatar-sq !h-9 !w-9 !text-xs",
  },
  xl: {
    img: "h-24 w-24 shrink-0 rounded-[6px] border border-[var(--rule-strong)] object-cover",
    fallback:
      "flex h-24 w-24 shrink-0 items-center justify-center rounded-[6px] border border-[var(--rule-strong)] bg-[var(--spruce-btn)] font-serif text-3xl font-semibold tracking-tight text-[var(--spruce-btn-ink)]",
  },
};

function deriveInitials(fullName, explicitInitials) {
  if (explicitInitials && String(explicitInitials).trim()) {
    return String(explicitInitials).trim().toUpperCase().slice(0, 2);
  }
  const parts = String(fullName || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "OT";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

/**
 * Komponen avatar pengguna reusable dengan fallback inisial aman (.avatar-sq)
 * jika gambar gagal dimuat (onError / 404).
 */
export default function UserAvatar({
  src = null,
  fullName = "",
  alt,
  initials = "",
  size = "sm",
  className = "",
  imgClassName,
  fallbackClassName,
  ariaHiddenFallback = false,
}) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  const preset = SIZE_STYLES[size] || SIZE_STYLES.sm;
  const resolvedInitials = deriveInitials(fullName, initials);
  const resolvedAlt =
    alt !== undefined
      ? alt
      : fullName
        ? `Foto profil ${fullName}`
        : "";

  if (src && !hasError) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={resolvedAlt}
        onError={() => setHasError(true)}
        className={`${imgClassName || preset.img} ${className}`.trim()}
      />
    );
  }

  return (
    <span
      className={`${fallbackClassName || preset.fallback} ${className}`.trim()}
      aria-hidden={ariaHiddenFallback ? "true" : undefined}
    >
      {resolvedInitials}
    </span>
  );
}
