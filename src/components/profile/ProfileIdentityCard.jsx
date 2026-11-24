"use client";

import { useRef, useState } from "react";
import {
  AlertCircle,
  AtSign,
  Building2,
  Camera,
  Loader2,
  Mail,
  Trash2,
  Upload,
  UserCheck,
} from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import UserAvatar from "@/components/ui/UserAvatar";

const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];

function computeInitials(fullName, fallbackInitials = "OT") {
  const parts = String(fullName || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return fallbackInitials;
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

/**
 * Kartu identitas pengguna (kolom kiri atas) + unggah/hapus avatar ke /api/upload & PostgreSQL.
 */
export default function ProfileIdentityCard({
  profile,
  isBusy = false,
  onAvatarChange,
  onAvatarRemove,
}) {
  const fileInputRef = useRef(null);
  const [avatarError, setAvatarError] = useState("");

  const initials = computeInitials(profile.fullName, profile.initials);
  const avatarUrl = profile.avatarUrl || null;

  function handleOpenFilePicker() {
    if (isBusy) return;
    setAvatarError("");
    fileInputRef.current?.click();
  }

  function handleFileSelected(event) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      setAvatarError("Format foto harus JPG, PNG, atau WEBP.");
      return;
    }

    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      setAvatarError("Ukuran foto maksimal 2 MB.");
      return;
    }

    setAvatarError("");
    onAvatarChange(file);
  }

  function handleRemoveClick() {
    if (isBusy) return;
    setAvatarError("");
    onAvatarRemove();
  }

  return (
    <section className="panel">
      <div className="panel-body">
        {/* Bagian Avatar Interaktif */}
        <div className="flex flex-col items-center text-center">
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            onChange={handleFileSelected}
            className="hidden"
            aria-label="Pilih foto profil"
            disabled={isBusy}
          />

          <button
            type="button"
            onClick={handleOpenFilePicker}
            disabled={isBusy}
            className="group relative h-24 w-24 cursor-pointer rounded-[6px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--spruce)] disabled:cursor-wait"
            title="Klik untuk mengganti foto profil"
            aria-label="Ganti foto profil"
          >
            <UserAvatar
              src={avatarUrl}
              alt={`Foto profil ${profile.fullName}`}
              initials={initials}
              imgClassName="h-24 w-24 rounded-[6px] border border-[var(--rule-strong)] object-cover"
              fallbackClassName="flex h-24 w-24 items-center justify-center rounded-[6px] border border-[var(--rule-strong)] bg-[var(--spruce-btn)] font-serif text-3xl font-semibold tracking-tight text-[var(--spruce-btn-ink)]"
            />

            {/* Overlay kamera saat hover atau loading */}
            <span
              className={`absolute inset-0 flex flex-col items-center justify-center rounded-[6px] bg-black/65 text-white transition-opacity duration-150 ${
                isBusy ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              }`}
            >
              {isBusy ? (
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              ) : (
                <>
                  <Camera className="h-5 w-5" aria-hidden="true" />
                  <span className="mt-1 font-mono text-[10px] uppercase tracking-[0.08em]">
                    Ubah Foto
                  </span>
                </>
              )}
            </span>
          </button>

          {/* Tombol Ganti / Hapus Foto */}
          <div className="mt-3.5 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={handleOpenFilePicker}
              disabled={isBusy}
              className="btn btn-sm"
            >
              <Upload className="h-3.5 w-3.5" aria-hidden="true" />
              {isBusy ? "Memproses..." : "Ganti Foto"}
            </button>

            {avatarUrl && (
              <button
                type="button"
                onClick={handleRemoveClick}
                disabled={isBusy}
                className="btn btn-sm btn-danger-ghost"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                Hapus
              </button>
            )}
          </div>

          <p className="mt-2 font-mono text-[10.5px] text-[var(--ink-muted)]">
            JPG, PNG, atau WEBP · Maks. 2 MB
          </p>

          {avatarError && (
            <div role="alert" className="notice notice-danger mt-2.5 text-left">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{avatarError}</span>
            </div>
          )}

          {/* Nama Lengkap & Badge Role/Status */}
          <h2 className="mt-4 font-serif text-[21px] font-semibold leading-snug tracking-tight text-[var(--ink)]">
            {profile.fullName}
          </h2>
          <div className="mt-1.5 flex flex-wrap items-center justify-center gap-1.5">
            <StatusBadge status={profile.role} />
            <StatusBadge status={profile.isActive ? "Aktif" : "Nonaktif"} />
          </div>
        </div>

        {/* Ringkasan Biodata */}
        <dl className="mt-5 space-y-2.5 border-t border-[var(--rule)] pt-4 text-[12px]">
          <div className="flex items-start justify-between gap-3">
            <dt className="flex items-center gap-1.5 text-[var(--ink-muted)]">
              <AtSign className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Username
            </dt>
            <dd className="truncate font-mono font-medium text-[var(--ink)]">
              @{profile.username}
            </dd>
          </div>

          <div className="flex items-start justify-between gap-3">
            <dt className="flex items-center gap-1.5 text-[var(--ink-muted)]">
              <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Email
            </dt>
            <dd className="truncate font-mono font-medium text-[var(--ink)]">
              {profile.email}
            </dd>
          </div>

          <div className="flex items-start justify-between gap-3">
            <dt className="flex items-center gap-1.5 text-[var(--ink-muted)]">
              <Building2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Divisi
            </dt>
            <dd className="text-right font-semibold text-[var(--ink)]">
              {profile.divisionName || "Belum ditentukan"}
            </dd>
          </div>

          {profile.leaderName && (
            <div className="flex items-start justify-between gap-3">
              <dt className="flex items-center gap-1.5 text-[var(--ink-muted)]">
                <UserCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                Ketua Divisi
              </dt>
              <dd className="text-right font-semibold text-[var(--ink)]">
                {profile.leaderName}
              </dd>
            </div>
          )}
        </dl>
      </div>
    </section>
  );
}
