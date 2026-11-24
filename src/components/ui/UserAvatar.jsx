"use client";

import { useEffect, useState } from "react";

/**
 * Komponen avatar pengguna dengan fallback inisial aman jika gambar gagal dimuat (onError / 404).
 */
export default function UserAvatar({
  src = null,
  alt = "",
  initials = "OT",
  imgClassName = "h-7 w-7 shrink-0 rounded-[2px] border border-[var(--rule)] object-cover",
  fallbackClassName = "avatar-sq",
  ariaHiddenFallback = false,
}) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  if (src && !hasError) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        onError={() => setHasError(true)}
        className={imgClassName}
      />
    );
  }

  return (
    <span
      className={fallbackClassName}
      aria-hidden={ariaHiddenFallback ? "true" : undefined}
    >
      {initials}
    </span>
  );
}
