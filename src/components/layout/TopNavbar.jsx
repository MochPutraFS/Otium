"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  ChevronDown,
  LogOut,
  Menu,
  UserCircle2,
} from "lucide-react";
import NotificationDropdown from "@/components/layout/NotificationDropdown";
import StatusBadge from "@/components/ui/StatusBadge";
import { logoutAction } from "@/actions/auth-actions";

const PAGE_TITLE_MAP = {
  "/dashboard": { title: "Dashboard", section: "Ringkasan" },
  "/profile": { title: "Profil & Saldo Kuota", section: "Akun Saya" },
  "/leaves": { title: "Riwayat Cuti Saya", section: "Operasional Cuti" },
  "/leaves/new": { title: "Pengajuan Cuti", section: "Operasional Cuti" },
  "/approvals/leader": {
    title: "Verifikasi Ketua Divisi",
    section: "Persetujuan Tahap 1",
  },
  "/approvals/hrd": {
    title: "Persetujuan Final HRD",
    section: "Persetujuan Tahap 2",
  },
  "/admin/users": { title: "Manajemen Pengguna", section: "CMS Master Data" },
  "/admin/divisions": { title: "Manajemen Divisi", section: "CMS Master Data" },
  "/admin/division-members": {
    title: "Anggota Divisi",
    section: "CMS Master Data",
  },
  "/admin/leave-types": {
    title: "Jenis Cuti Dinamis",
    section: "CMS Master Data",
  },
};

const THEME_MODES = [
  { id: "system", scheme: "light dark", icon: "◐", label: "Sistem" },
  { id: "light", scheme: "light", icon: "☀", label: "Terang" },
  { id: "dark", scheme: "dark", icon: "☾", label: "Gelap" },
];

const THEME_STORAGE_KEY = "otium-color-scheme";

/**
 * TopNavbar Swiss Archival:
 * - Breadcrumb role + judul halaman Cormorant Garamond
 * - Pill tanggal & hari libur terdekat realtime dari PostgreSQL
 * - Theme Switcher (Sistem / Terang / Gelap) berbasis color-scheme
 * - NotificationDropdown & menu akun pengguna
 */
export default function TopNavbar({
  user,
  todayLabel = "",
  upcomingHoliday = null,
  initialNotifications = [],
  initialUnreadCount = 0,
  isMobileMenuOpen = false,
  onOpenMobileMenu,
}) {
  const pathname = usePathname();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [themeIndex, setThemeIndex] = useState(0);
  const userMenuRef = useRef(null);

  const pageMeta = PAGE_TITLE_MAP[pathname] || {
    title: "Portal Otium",
    section: "Workspace",
  };

  // Sinkronkan preferensi tema tersimpan saat mount
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
      const foundIdx = THEME_MODES.findIndex((m) => m.id === saved);
      if (foundIdx >= 0) {
        setThemeIndex(foundIdx);
        document.documentElement.style.colorScheme =
          THEME_MODES[foundIdx].scheme;
      }
    } catch {
      // Abaikan jika localStorage tidak tersedia
    }
  }, []);

  function handleCycleTheme() {
    const nextIdx = (themeIndex + 1) % THEME_MODES.length;
    const nextMode = THEME_MODES[nextIdx];
    setThemeIndex(nextIdx);
    document.documentElement.style.colorScheme = nextMode.scheme;
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextMode.id);
    } catch {
      // Abaikan jika localStorage diblokir
    }
  }

  useEffect(() => {
    if (!isUserMenuOpen) return undefined;

    function handleOutsideClick(event) {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target)
      ) {
        setIsUserMenuOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsUserMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isUserMenuOpen]);

  const hasQuotaLabel =
    user.role === "Karyawan" || user.role === "Ketua Divisi";
  const currentTheme = THEME_MODES[themeIndex];

  return (
    <header className="sticky top-0 z-20 flex h-[60px] shrink-0 items-center justify-between gap-3 border-b border-[var(--rule-strong)] bg-[color-mix(in_oklab,var(--paper)_94%,transparent)] px-4 backdrop-blur-md sm:px-6">
      {/* Bagian kiri: tombol drawer mobile, breadcrumb role, & judul halaman serif */}
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Buka menu navigasi"
          aria-controls="mobile-navigation-drawer"
          aria-expanded={isMobileMenuOpen}
          className="btn btn-icon lg:hidden"
        >
          <Menu className="h-4 w-4" aria-hidden="true" />
        </button>

        <div className="flex min-w-0 items-baseline gap-2.5">
          <span className="hidden shrink-0 text-[12.5px] text-[var(--ink-muted)] sm:inline">
            {user.role}
          </span>
          <span
            className="hidden shrink-0 text-[var(--rule-strong)] sm:inline"
            aria-hidden="true"
          >
            /
          </span>
          <h1 className="m-0 truncate font-serif text-[22px] font-semibold leading-none tracking-[-0.01em] text-[var(--ink)] sm:text-[26px]">
            {pageMeta.title}
          </h1>
        </div>
      </div>

      {/* Bagian kanan: tanggal/libur realtime, switcher tema, notifikasi, & panel akun */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {todayLabel && (
          <div
            className="hidden items-center gap-2.5 rounded-[2px] border border-[var(--rule)] bg-[var(--alabaster)] px-2.5 py-1 text-xs md:flex"
            title={
              upcomingHoliday
                ? `Hari libur terdekat: ${upcomingHoliday.name} (${upcomingHoliday.dateLabel})`
                : `Hari ini: ${todayLabel}`
            }
          >
            <span className="mono inline-flex items-center gap-1.5 text-[11px] font-medium text-[var(--ink-soft)]">
              <CalendarDays
                className="h-3.5 w-3.5 text-[var(--spruce)]"
                aria-hidden="true"
              />
              {todayLabel}
            </span>

            {upcomingHoliday && (
              <>
                <span
                  className="hidden h-3.5 w-px bg-[var(--rule-strong)] xl:inline-block"
                  aria-hidden="true"
                />
                <span className="hidden items-center gap-1.5 text-[11.5px] text-[var(--ink-soft)] xl:inline-flex">
                  <span
                    className="h-1.5 w-1.5 bg-[var(--ochre)]"
                    aria-hidden="true"
                  />
                  <span>
                    Libur:{" "}
                    <strong className="font-semibold text-[var(--ink)]">
                      {upcomingHoliday.name}
                    </strong>{" "}
                    <span className="mono text-[11px] text-[var(--ink-muted)]">
                      ({upcomingHoliday.dateLabel})
                    </span>
                  </span>
                </span>
              </>
            )}
          </div>
        )}

        {/* Switcher Tema (Sistem / Terang / Gelap) */}
        <button
          type="button"
          onClick={handleCycleTheme}
          aria-label={`Ganti tema tampilan (saat ini: ${currentTheme.label})`}
          title={`Tema: ${currentTheme.label} — klik untuk mengganti (Sistem / Terang / Gelap)`}
          className="btn btn-sm"
        >
          <span aria-hidden="true">{currentTheme.icon}</span>
          <span className="hidden sm:inline">Tema: {currentTheme.label}</span>
        </button>

        {/* Dropdown Notifikasi Realtime */}
        <NotificationDropdown
          initialNotifications={initialNotifications}
          initialUnreadCount={initialUnreadCount}
        />

        {/* Panel Menu Akun (.user-cell) */}
        <div className="relative" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => setIsUserMenuOpen((prev) => !prev)}
            aria-expanded={isUserMenuOpen}
            aria-controls="user-account-panel"
            aria-label={`Menu akun ${user.fullName}`}
            className="flex h-9 cursor-pointer items-center gap-2.5 rounded-[2px] border border-[var(--rule-strong)] bg-[var(--paper-pure)] pl-1 pr-2.5 text-left transition-colors duration-150 hover:border-[var(--ink)] hover:bg-[var(--alabaster)]"
          >
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatarUrl}
                alt=""
                className="h-7 w-7 shrink-0 rounded-[2px] border border-[var(--rule)] object-cover"
              />
            ) : (
              <span className="avatar-sq">{user.initials}</span>
            )}

            <div className="hidden min-w-0 sm:block">
              <p className="max-w-[136px] truncate text-[12.5px] font-semibold leading-tight text-[var(--ink)]">
                {user.fullName}
              </p>
              <p className="mono max-w-[136px] truncate text-[10px] leading-tight text-[var(--ink-muted)]">
                {user.role}
                {user.divisionName ? ` • ${user.divisionName}` : ""}
              </p>
            </div>
            <ChevronDown
              className={`hidden h-3.5 w-3.5 text-[var(--ink-muted)] transition-transform duration-150 sm:block ${
                isUserMenuOpen ? "rotate-180" : ""
              }`}
              aria-hidden="true"
            />
          </button>

          {isUserMenuOpen && (
            <div
              id="user-account-panel"
              className="absolute right-0 z-40 mt-2 w-64 overflow-hidden rounded-[2px] border border-[var(--ink)] bg-[var(--paper-pure)] shadow-[0_14px_32px_rgba(25,24,22,0.16)]"
            >
              <div className="border-b border-[var(--rule)] bg-[var(--paper)] px-4 py-3">
                <p className="truncate text-sm font-semibold text-[var(--ink)]">
                  {user.fullName}
                </p>
                <p className="mono truncate text-[11px] text-[var(--ink-muted)]">
                  {user.email}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <StatusBadge status={user.role} />
                  {user.divisionName && (
                    <span className="truncate text-[11px] font-medium text-[var(--ink-soft)]">
                      {user.divisionName}
                    </span>
                  )}
                </div>
              </div>

              <div className="p-1.5">
                <Link
                  href="/profile"
                  onClick={() => setIsUserMenuOpen(false)}
                  className="flex cursor-pointer items-center gap-2.5 rounded-[2px] px-3 py-2 text-xs font-medium text-[var(--ink-soft)] transition-colors duration-150 hover:bg-[var(--alabaster)] hover:text-[var(--ink)]"
                >
                  <UserCircle2
                    className="h-4 w-4 text-[var(--ink-muted)]"
                    aria-hidden="true"
                  />
                  {hasQuotaLabel ? "Profil & Kuota Saya" : "Profil Saya"}
                </Link>

                <form action={logoutAction}>
                  <button
                    type="submit"
                    className="flex w-full cursor-pointer items-center gap-2.5 rounded-[2px] px-3 py-2 text-xs font-medium text-[var(--terracotta)] transition-colors duration-150 hover:bg-[var(--terracotta-tint)]"
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    Keluar (Logout)
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
