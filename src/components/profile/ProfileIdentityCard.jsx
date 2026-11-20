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
    <section className="rounded-xl border border-stone-200 bg-white p-5">
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
          className="group relative h-24 w-24 cursor-pointer rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F172A] disabled:cursor-wait"
          title="Klik untuk mengganti foto profil"
          aria-label="Ganti foto profil"
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt={`Foto profil ${profile.fullName}`}
              className="h-24 w-24 rounded-full border border-stone-300 object-cover"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full border border-stone-300 bg-[#0F172A] text-2xl font-semibold tracking-tight text-white">
              {initials}
            </div>
          )}

          {/* Overlay kamera saat hover atau loading */}
          <span
            className={`absolute inset-0 flex flex-col items-center justify-center rounded-full bg-[#0F172A]/65 text-white transition-opacity duration-150 ${
              isBusy ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            }`}
          >
            {isBusy ? (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            ) : (
              <>
                <Camera className="h-5 w-5" aria-hidden="true" />
                <span className="mt-1 text-[10px] font-medium">Ubah Foto</span>
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
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-[#0F172A] transition-colors duration-150 hover:bg-[#F4F2EC] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F172A] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Upload className="h-3.5 w-3.5 text-slate-600" aria-hidden="true" />
            {isBusy ? "Memproses..." : "Ganti Foto"}
          </button>

          {avatarUrl && (
            <button
              type="button"
              onClick={handleRemoveClick}
              disabled={isBusy}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 transition-colors duration-150 hover:bg-rose-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              Hapus
            </button>
          )}
        </div>

        <p className="mt-2 text-[11px] text-slate-500">
          JPG, PNG, atau WEBP &bull; Maks. 2 MB
        </p>

        {avatarError && (
          <div
            role="alert"
            className="mt-2.5 flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs text-rose-700"
          >
            <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{avatarError}</span>
          </div>
        )}

        {/* Nama Lengkap & Badge Role/Status */}
        <h3 className="mt-4 text-lg font-semibold tracking-tight text-[#0F172A]">
          {profile.fullName}
        </h3>
        <div className="mt-1.5 flex flex-wrap items-center justify-center gap-1.5">
          <StatusBadge status={profile.role} />
          <StatusBadge status={profile.isActive ? "Aktif" : "Nonaktif"} />
        </div>
      </div>

      {/* Ringkasan Biodata */}
      <dl className="mt-5 space-y-2.5 border-t border-stone-200 pt-4 text-xs">
        <div className="flex items-start justify-between gap-3">
          <dt className="flex items-center gap-1.5 text-slate-600">
            <AtSign
              className="h-3.5 w-3.5 shrink-0 text-slate-500"
              aria-hidden="true"
            />
            Username
          </dt>
          <dd className="truncate font-semibold text-[#0F172A]">
            {profile.username}
          </dd>
        </div>

        <div className="flex items-start justify-between gap-3">
          <dt className="flex items-center gap-1.5 text-slate-600">
            <Mail
              className="h-3.5 w-3.5 shrink-0 text-slate-500"
              aria-hidden="true"
            />
            Email
          </dt>
          <dd className="truncate font-semibold text-[#0F172A]">
            {profile.email}
          </dd>
        </div>

        <div className="flex items-start justify-between gap-3">
          <dt className="flex items-center gap-1.5 text-slate-600">
            <Building2
              className="h-3.5 w-3.5 shrink-0 text-slate-500"
              aria-hidden="true"
            />
            Divisi
          </dt>
          <dd className="text-right font-semibold text-[#0F172A]">
            {profile.divisionName || "Belum ditentukan"}
          </dd>
        </div>

        {profile.leaderName && (
          <div className="flex items-start justify-between gap-3">
            <dt className="flex items-center gap-1.5 text-slate-600">
              <UserCheck
                className="h-3.5 w-3.5 shrink-0 text-slate-500"
                aria-hidden="true"
              />
              Ketua Divisi
            </dt>
            <dd className="text-right font-semibold text-[#0F172A]">
              {profile.leaderName}
            </dd>
          </div>
        )}
      </dl>
    </section>
  );
}
