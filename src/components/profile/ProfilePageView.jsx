"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, KeyRound, UserPen, X } from "lucide-react";
import QuotaOverviewCard from "@/components/ui/QuotaOverviewCard";
import ProfileIdentityCard from "@/components/profile/ProfileIdentityCard";
import RoleAccessSummaryCard from "@/components/profile/RoleAccessSummaryCard";
import ProfileEditForm from "@/components/profile/ProfileEditForm";
import PasswordSecurityForm from "@/components/profile/PasswordSecurityForm";
import {
  changePasswordAction,
  updateAvatarAction,
  updateProfileAction,
} from "@/actions/profile-actions";

const PROFILE_TABS = [
  {
    key: "personal",
    id: "profile-tab-personal",
    panelId: "profile-panel-personal",
    label: "Informasi Pribadi",
    icon: UserPen,
  },
  {
    key: "security",
    id: "profile-tab-security",
    panelId: "profile-panel-security",
    label: "Keamanan Password",
    icon: KeyRound,
  },
];

/**
 * Kontainer utama Halaman Profil (2 Kolom + Tabbed Workspace, adaptif 4 Role RBAC).
 * Terhubung ke Server Actions (profile-actions.js) & Route Handler (/api/upload).
 */
export default function ProfilePageView({ initialProfile, divisions = [] }) {
  const router = useRouter();
  const [profile, setProfile] = useState(initialProfile);
  const [activeTab, setActiveTab] = useState("personal");
  const [banner, setBanner] = useState(null); // { type: "success" | "error", text: string }
  const [isAvatarBusy, setIsAvatarBusy] = useState(false);
  const tabRefs = useRef([]);

  useEffect(() => {
    setProfile(initialProfile);
  }, [initialProfile]);

  useEffect(() => {
    if (!banner || banner.type !== "success") return undefined;
    const timer = setTimeout(() => setBanner(null), 5000);
    return () => clearTimeout(timer);
  }, [banner]);

  const isAdmin = profile.role === "Admin";
  const hasLeaveQuotaAccess =
    profile.role === "Karyawan" || profile.role === "Ketua Divisi";

  function handleTabKeyDown(event, currentIndex) {
    let nextIndex = null;

    if (event.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % PROFILE_TABS.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + PROFILE_TABS.length) % PROFILE_TABS.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = PROFILE_TABS.length - 1;
    }

    if (nextIndex !== null) {
      event.preventDefault();
      setActiveTab(PROFILE_TABS[nextIndex].key);
      tabRefs.current[nextIndex]?.focus();
    }
  }

  async function handleAvatarUpload(file) {
    setIsAvatarBusy(true);
    setBanner(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "avatars");

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok || !uploadData.success || !uploadData.url) {
        setBanner({
          type: "error",
          text: uploadData.error || "Gagal mengunggah foto profil.",
        });
        return;
      }

      const saveRes = await updateAvatarAction(uploadData.url);
      if (!saveRes.ok) {
        setBanner({
          type: "error",
          text: saveRes.error || "Gagal menyimpan foto profil ke database.",
        });
        return;
      }

      setProfile((prev) => ({
        ...prev,
        avatarUrl: saveRes.avatarUrl,
      }));
      setBanner({
        type: "success",
        text: saveRes.message || "Foto profil berhasil diperbarui.",
      });
      router.refresh();
    } catch {
      setBanner({
        type: "error",
        text: "Terjadi kendala jaringan saat mengunggah foto profil.",
      });
    } finally {
      setIsAvatarBusy(false);
    }
  }

  async function handleAvatarRemove() {
    setIsAvatarBusy(true);
    setBanner(null);
    try {
      const saveRes = await updateAvatarAction(null);
      if (!saveRes.ok) {
        setBanner({
          type: "error",
          text: saveRes.error || "Gagal menghapus foto profil.",
        });
        return;
      }

      setProfile((prev) => ({
        ...prev,
        avatarUrl: null,
      }));
      setBanner({
        type: "success",
        text: saveRes.message || "Foto profil berhasil dihapus.",
      });
      router.refresh();
    } catch {
      setBanner({
        type: "error",
        text: "Terjadi kesalahan saat menghapus foto profil.",
      });
    } finally {
      setIsAvatarBusy(false);
    }
  }

  async function handleSaveProfile(payload) {
    setBanner(null);
    const result = await updateProfileAction(payload);

    if (!result.ok) {
      setBanner({
        type: "error",
        text: result.error || "Gagal menyimpan perubahan profil.",
      });
      return result;
    }

    if (result.profile) {
      setProfile(result.profile);
    }
    setBanner({
      type: "success",
      text: result.message || "Perubahan profil berhasil disimpan.",
    });
    router.refresh();
    return result;
  }

  async function handleChangePassword(payload) {
    setBanner(null);
    const result = await changePasswordAction(payload);

    if (!result.ok) {
      setBanner({
        type: "error",
        text: result.error || "Gagal memperbarui password akun.",
      });
      return result;
    }

    setBanner({
      type: "success",
      text: result.message || "Password akun Anda berhasil diperbarui.",
    });
    return result;
  }

  return (
    <div className="space-y-5">
      {/* Deskripsi Ringkas Halaman */}
      <div className="flex flex-col gap-1 border-b border-stone-300/80 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-[#0F172A]">
            Pengaturan Akun &amp; Identitas
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Kelola informasi pribadi, foto profil,{" "}
            {hasLeaveQuotaAccess
              ? "pantau sisa kuota cuti tahunan realtime, "
              : "tinjau ringkasan wewenang peran, "}
            dan perbarui keamanan password Anda.
          </p>
        </div>
      </div>

      {/* Status / Error Banner dengan aria-live */}
      {banner && (
        <div
          role={banner.type === "error" ? "alert" : "status"}
          aria-live={banner.type === "error" ? "assertive" : "polite"}
          className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${
            banner.type === "error"
              ? "border-rose-200 bg-rose-50 text-rose-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-900"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {banner.type === "error" ? (
              <AlertCircle
                className="h-4 w-4 shrink-0 text-rose-600"
                aria-hidden="true"
              />
            ) : (
              <CheckCircle2
                className="h-4 w-4 shrink-0 text-emerald-700"
                aria-hidden="true"
              />
            )}
            <span className="font-medium">{banner.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setBanner(null)}
            aria-label="Tutup pemberitahuan"
            className="cursor-pointer rounded-lg p-1 text-current opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F172A]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Grid 2 Kolom Responsif */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        {/* Kolom Kiri (Sticky di Desktop): Identitas + Kartu Adaptif Role */}
        <div className="space-y-5 lg:sticky lg:top-20 lg:col-span-4">
          <ProfileIdentityCard
            profile={profile}
            isBusy={isAvatarBusy}
            onAvatarChange={handleAvatarUpload}
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
        <section className="overflow-hidden rounded-xl border border-stone-200 bg-white lg:col-span-8">
          {/* Bar Navigasi Tab (WAI-ARIA Tablist + Keyboard Arrows) */}
          <div
            role="tablist"
            aria-label="Pengaturan profil"
            className="flex items-center gap-1 overflow-x-auto border-b border-stone-200 bg-[#F4F2EC]/40 px-4 pt-2 sm:px-6"
          >
            {PROFILE_TABS.map((tab, index) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;

              return (
                <button
                  key={tab.key}
                  ref={(el) => {
                    tabRefs.current[index] = el;
                  }}
                  id={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => setActiveTab(tab.key)}
                  onKeyDown={(e) => handleTabKeyDown(e, index)}
                  className={`otium-tab inline-flex shrink-0 cursor-pointer items-center gap-2 px-3.5 py-3 text-sm font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#0F172A] ${
                    isActive
                      ? "text-[#0F172A]"
                      : "text-slate-600 hover:text-[#0F172A]"
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Panel Tab 1: Informasi Pribadi */}
          <div
            id="profile-panel-personal"
            role="tabpanel"
            aria-labelledby="profile-tab-personal"
            hidden={activeTab !== "personal"}
          >
            <div className="p-5 sm:p-6">
              <ProfileEditForm
                profile={profile}
                isAdmin={isAdmin}
                divisions={divisions}
                onSaveProfile={handleSaveProfile}
              />
            </div>
          </div>

          {/* Panel Tab 2: Keamanan Password */}
          <div
            id="profile-panel-security"
            role="tabpanel"
            aria-labelledby="profile-tab-security"
            hidden={activeTab !== "security"}
          >
            <div className="p-5 sm:p-6">
              <PasswordSecurityForm onChangePassword={handleChangePassword} />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
