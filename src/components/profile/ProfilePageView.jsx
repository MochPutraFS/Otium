"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, KeyRound, UserPen, X } from "lucide-react";
import QuotaOverviewCard from "@/components/ui/QuotaOverviewCard";
import ProfileIdentityCard from "@/components/profile/ProfileIdentityCard";
import RoleAccessSummaryCard from "@/components/profile/RoleAccessSummaryCard";
import ProfileEditForm from "@/components/profile/ProfileEditForm";
import PasswordSecurityForm from "@/components/profile/PasswordSecurityForm";

const PROFILE_TABS = [
  {
    key: "personal",
    label: "Informasi Pribadi",
    icon: UserPen,
  },
  {
    key: "security",
    label: "Keamanan Password",
    icon: KeyRound,
  },
];

// Kontainer utama Halaman Profil (2 Kolom + Tab di Kanan, adaptif 4 Role RBAC)
export default function ProfilePageView({ initialUser, roleKey }) {
  const [profile, setProfile] = useState(initialUser);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState(
    initialUser.avatarUrl || null
  );
  const [activeTab, setActiveTab] = useState("personal");
  const [toastMessage, setToastMessage] = useState("");

  // Reset state profil lokal saat role diganti lewat PreviewRoleDock
  useEffect(() => {
    setProfile(initialUser);
    setAvatarPreviewUrl((prev) => {
      if (prev && prev.startsWith("blob:")) {
        URL.revokeObjectURL(prev);
      }
      return initialUser.avatarUrl || null;
    });
    setActiveTab("personal");
    setToastMessage("");
  }, [initialUser, roleKey]);

  // Bersihkan blob URL saat unmount agar tidak terjadi memory leak
  useEffect(() => {
    return () => {
      if (avatarPreviewUrl && avatarPreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
    };
  }, [avatarPreviewUrl]);

  // Sembunyikan toast otomatis setelah 4 detik
  useEffect(() => {
    if (!toastMessage) return undefined;
    const timer = setTimeout(() => setToastMessage(""), 4000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const isAdmin = profile.role === "Admin";
  const hasLeaveQuotaAccess =
    profile.role === "Karyawan" || profile.role === "Ketua Divisi";

  function handleAvatarChange(file) {
    const objectUrl = URL.createObjectURL(file);
    setAvatarPreviewUrl((prev) => {
      if (prev && prev.startsWith("blob:")) {
        URL.revokeObjectURL(prev);
      }
      return objectUrl;
    });
    setToastMessage(
      `Pratinjau foto profil "${file.name}" berhasil diterapkan.`
    );
  }

  function handleAvatarRemove() {
    setAvatarPreviewUrl((prev) => {
      if (prev && prev.startsWith("blob:")) {
        URL.revokeObjectURL(prev);
      }
      return null;
    });
    setToastMessage("Foto profil dihapus dan dikembalikan ke avatar inisial.");
  }

  function handleSaveProfile(updatedFields) {
    setProfile((prev) => ({
      ...prev,
      ...updatedFields,
    }));
    setToastMessage(
      "Perubahan profil berhasil disimpan pada pratinjau lokal."
    );
  }

  function handlePasswordSaved() {
    setToastMessage("Password akun Anda berhasil diperbarui.");
  }

  return (
    <div className="space-y-5">
      {/* Header Halaman */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Profil &amp; Pengaturan Akun
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Kelola informasi pribadi, foto profil,{" "}
            {hasLeaveQuotaAccess
              ? "pantau sisa kuota cuti tahunan realtime, "
              : "tinjau ringkasan wewenang peran, "}
            dan perbarui keamanan password Anda.
          </p>
        </div>
      </div>

      {/* Toast / Banner Notifikasi Sukses */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 shadow-sm"
        >
          <div className="flex items-center gap-2.5">
            <CheckCircle2
              className="h-4 w-4 shrink-0 text-emerald-600"
              aria-hidden="true"
            />
            <span className="font-medium">{toastMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage("")}
            aria-label="Tutup notifikasi"
            className="rounded-lg p-1 text-emerald-600 transition hover:bg-emerald-100 hover:text-emerald-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Grid 2 Kolom Responsif */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        {/* Kolom Kiri (Sticky di Desktop): Identitas + Kartu Adaptif Role */}
        <div className="space-y-5 lg:sticky lg:top-20 lg:col-span-4">
          <ProfileIdentityCard
            profile={profile}
            avatarPreviewUrl={avatarPreviewUrl}
            onAvatarChange={handleAvatarChange}
            onAvatarRemove={handleAvatarRemove}
          />

          {hasLeaveQuotaAccess ? (
            <QuotaOverviewCard
              joinDate={profile.joinDate}
              tenureLabel={profile.tenureLabel}
              isEligibleAnnualLeave={profile.isEligibleAnnualLeave}
              initialQuota={profile.initialLeaveQuota}
              remainingQuota={profile.remainingLeaveQuota}
            />
          ) : (
            <RoleAccessSummaryCard
              role={profile.role}
              joinDate={profile.joinDate}
              tenureLabel={profile.tenureLabel}
              isActive={profile.isActive}
            />
          )}
        </div>

        {/* Kolom Kanan: Tabbed Workspace */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm lg:col-span-8">
          {/* Bar Navigasi Tab */}
          <div
            role="tablist"
            aria-label="Pengaturan profil"
            className="flex items-center gap-1 border-b border-slate-200 px-4 pt-3 sm:px-6"
          >
            {PROFILE_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(tab.key)}
                  className={`inline-flex items-center gap-2 border-b-2 px-3.5 py-3 text-sm font-semibold transition ${
                    isActive
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Konten Tab Aktif */}
          <div className="p-5 sm:p-6">
            {activeTab === "personal" ? (
              <ProfileEditForm
                profile={profile}
                isAdmin={isAdmin}
                onSaveProfile={handleSaveProfile}
              />
            ) : (
              <PasswordSecurityForm onPasswordSaved={handlePasswordSaved} />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
