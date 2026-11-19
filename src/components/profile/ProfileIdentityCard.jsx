"use client";

import { useRef, useState } from "react";
import {
  AlertCircle,
  AtSign,
  Building2,
  Camera,
  Mail,
  Phone,
  Trash2,
  Upload,
  UserCheck,
} from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";

const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];

const ROLE_AVATAR_TONE = {
  Admin: "bg-purple-100 text-purple-700 ring-purple-200",
  Karyawan: "bg-blue-100 text-blue-700 ring-blue-200",
  "Ketua Divisi": "bg-sky-100 text-sky-700 ring-sky-200",
  HRD: "bg-indigo-100 text-indigo-700 ring-indigo-200",
};

function computeInitials(fullName, fallbackInitials = "US") {
  const parts = String(fullName || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return fallbackInitials;
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

// Kartu identitas pengguna (kolom kiri atas) + pratinjau unggah avatar lokal
export default function ProfileIdentityCard({
  profile,
  avatarPreviewUrl,
  onAvatarChange,
  onAvatarRemove,
}) {
  const fileInputRef = useRef(null);
  const [avatarError, setAvatarError] = useState("");

  const initials = computeInitials(profile.fullName, profile.initials);
  const avatarToneClass =
    ROLE_AVATAR_TONE[profile.role] || "bg-slate-100 text-slate-700 ring-slate-200";

  function handleOpenFilePicker() {
    setAvatarError("");
    fileInputRef.current?.click();
  }

  function handleFileSelected(event) {
    const file = event.target.files?.[0];
    // Reset value agar file yang sama tetap bisa dipilih ulang setelah dihapus
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
    setAvatarError("");
    onAvatarRemove();
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      {/* Bagian Avatar Interaktif */}
      <div className="flex flex-col items-center text-center">
        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
          onChange={handleFileSelected}
          className="hidden"
          aria-label="Pilih foto profil"
        />

        <button
          type="button"
          onClick={handleOpenFilePicker}
          className="group relative h-24 w-24 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          title="Klik untuk mengganti foto profil"
        >
          {avatarPreviewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarPreviewUrl}
              alt={`Foto profil ${profile.fullName}`}
              className="h-24 w-24 rounded-full object-cover ring-4 ring-slate-100"
            />
          ) : (
            <div
              className={`flex h-24 w-24 items-center justify-center rounded-full text-2xl font-bold tracking-tight ring-4 ${avatarToneClass}`}
            >
              {initials}
            </div>
          )}

          {/* Hover overlay kamera */}
          <span className="absolute inset-0 flex flex-col items-center justify-center rounded-full bg-slate-900/55 text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <Camera className="h-5 w-5" aria-hidden="true" />
            <span className="mt-1 text-[10px] font-medium">Ubah Foto</span>
          </span>
        </button>

        {/* Tombol Ganti / Hapus Foto */}
        <div className="mt-3 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={handleOpenFilePicker}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
          >
            <Upload className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
            Ganti Foto
          </button>

          {avatarPreviewUrl && (
            <button
              type="button"
              onClick={handleRemoveClick}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50/70 px-2.5 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-100"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              Hapus
            </button>
          )}
        </div>

        <p className="mt-2 text-[11px] text-slate-400">
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
        <h2 className="mt-4 text-lg font-bold tracking-tight text-slate-900">
          {profile.fullName}
        </h2>
        <div className="mt-1.5 flex flex-wrap items-center justify-center gap-1.5">
          <StatusBadge status={profile.role} />
          <StatusBadge status={profile.isActive ? "Aktif" : "Nonaktif"} />
        </div>
      </div>

      {/* Ringkasan Biodata */}
      <dl className="mt-5 space-y-2.5 border-t border-slate-100 pt-4 text-xs">
        <div className="flex items-start justify-between gap-3">
          <dt className="flex items-center gap-1.5 text-slate-500">
            <AtSign className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
            Username
          </dt>
          <dd className="truncate font-semibold text-slate-800">
            {profile.username}
          </dd>
        </div>

        <div className="flex items-start justify-between gap-3">
          <dt className="flex items-center gap-1.5 text-slate-500">
            <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
            Email
          </dt>
          <dd className="truncate font-semibold text-slate-800">
            {profile.email}
          </dd>
        </div>

        <div className="flex items-start justify-between gap-3">
          <dt className="flex items-center gap-1.5 text-slate-500">
            <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
            Divisi
          </dt>
          <dd className="text-right font-semibold text-slate-800">
            {profile.divisionName || "Belum ditentukan"}
          </dd>
        </div>

        {profile.leaderName && (
          <div className="flex items-start justify-between gap-3">
            <dt className="flex items-center gap-1.5 text-slate-500">
              <UserCheck className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
              Ketua Divisi
            </dt>
            <dd className="text-right font-semibold text-slate-800">
              {profile.leaderName}
            </dd>
          </div>
        )}

        <div className="flex items-start justify-between gap-3">
          <dt className="flex items-center gap-1.5 text-slate-500">
            <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
            Telepon
          </dt>
          <dd className="text-right font-semibold text-slate-800">
            {profile.phone || "—"}
          </dd>
        </div>
      </dl>
    </section>
  );
}
