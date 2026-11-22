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
  "/profile": { title: "Profil & Pengaturan Akun", section: "Akun Saya" },
  "/leaves": { title: "Riwayat Cuti Saya", section: "Operasional Cuti" },
  "/leaves/new": { title: "Ajukan Cuti Baru", section: "Operasional Cuti" },
  "/approvals/leader": {
    title: "Verifikasi Cuti Divisi",
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

/**
 * TopNavbar editorial: judul halaman, tanggal & libur terdekat realtime dari PostgreSQL,
 * lonceng notifikasi, dan panel menu akun.
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
  const userMenuRef = useRef(null);

  const pageMeta = PAGE_TITLE_MAP[pathname] || {
    title: "Portal Otium",
    section: "Workspace",
  };

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

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-stone-200 bg-white px-4 sm:px-6">
      {/* Bagian kiri: tombol drawer mobile & judul halaman */}
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Buka menu navigasi"
          aria-controls="mobile-navigation-drawer"
          aria-expanded={isMobileMenuOpen}
          className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-stone-200 bg-white text-slate-700 transition-colors duration-150 hover:bg-[#F4F2EC] hover:text-[#0F172A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F172A] lg:hidden"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="min-w-0">
          <p className="hidden text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 sm:block">
            {pageMeta.section}
          </p>
          <h1 className="truncate text-base font-semibold tracking-tight text-[#0F172A] sm:text-lg">
            {pageMeta.title}
          </h1>
        </div>
      </div>

      {/* Bagian kanan: tanggal/libur realtime, notifikasi, & panel akun */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {todayLabel && (
          <div
            className="hidden items-center gap-2.5 rounded-lg border border-stone-200 bg-[#F4F2EC]/80 px-3 py-1.5 text-xs md:flex"
            title={
              upcomingHoliday
                ? `Hari libur terdekat: ${upcomingHoliday.name} (${upcomingHoliday.dateLabel})`
                : `Hari ini: ${todayLabel}`
            }
          >
            <span className="inline-flex items-center gap-1.5 font-medium text-slate-700 tabular-nums">
              <CalendarDays
                className="h-3.5 w-3.5 text-[#1D4ED8]"
                aria-hidden="true"
              />
              {todayLabel}
            </span>

            {upcomingHoliday && (
              <>
                <span
                  className="hidden h-3.5 w-px bg-stone-300 xl:inline-block"
                  aria-hidden="true"
                />
                <span className="hidden items-center gap-1.5 text-slate-600 xl:inline-flex">
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-amber-600"
                    aria-hidden="true"
                  />
                  <span>
                    Libur:{" "}
                    <strong className="font-semibold text-[#0F172A]">
                      {upcomingHoliday.name}
                    </strong>{" "}
                    <span className="tabular-nums">
                      ({upcomingHoliday.dateLabel})
                    </span>
                  </span>
                </span>
              </>
            )}
          </div>
        )}

        {/* Dropdown Notifikasi Realtime */}
        <NotificationDropdown
          initialNotifications={initialNotifications}
          initialUnreadCount={initialUnreadCount}
        />

        {/* Panel Menu Akun */}
        <div className="relative" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => setIsUserMenuOpen((prev) => !prev)}
            aria-expanded={isUserMenuOpen}
            aria-controls="user-account-panel"
            aria-label={`Menu akun ${user.fullName}`}
            className="flex h-10 cursor-pointer items-center gap-2.5 rounded-lg border border-stone-200 bg-white pl-1.5 pr-2.5 text-left transition-colors duration-150 hover:border-stone-300 hover:bg-[#F4F2EC]/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F172A]"
          >
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatarUrl}
                alt=""
                className="h-7 w-7 shrink-0 rounded-md border border-stone-200 object-cover"
              />
            ) : (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#0F172A] text-[11px] font-semibold text-white">
                {user.initials}
              </div>
            )}

            <div className="hidden min-w-0 sm:block">
              <p className="max-w-[130px] truncate text-xs font-semibold leading-tight text-[#0F172A]">
                {user.fullName}
              </p>
              <p className="text-[11px] leading-tight text-slate-500">
                {user.role}
              </p>
            </div>
            <ChevronDown
              className={`hidden h-3.5 w-3.5 text-slate-500 transition-transform duration-150 sm:block ${
                isUserMenuOpen ? "rotate-180" : ""
              }`}
              aria-hidden="true"
            />
          </button>

          {isUserMenuOpen && (
            <div
              id="user-account-panel"
              className="absolute right-0 z-40 mt-2 w-64 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-lg"
            >
              <div className="border-b border-stone-200 bg-[#F4F2EC]/50 px-4 py-3">
                <p className="truncate text-sm font-semibold text-[#0F172A]">
                  {user.fullName}
                </p>
                <p className="truncate text-xs text-slate-600">{user.email}</p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <StatusBadge status={user.role} />
                  {user.divisionName && (
                    <span className="truncate text-[11px] font-medium text-slate-600">
                      {user.divisionName}
                    </span>
                  )}
                </div>
              </div>

              <div className="p-1.5">
                <Link
                  href="/profile"
                  onClick={() => setIsUserMenuOpen(false)}
                  className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 transition-colors duration-150 hover:bg-[#F4F2EC] hover:text-[#0F172A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F172A]"
                >
                  <UserCircle2
                    className="h-4 w-4 text-slate-500"
                    aria-hidden="true"
                  />
                  {hasQuotaLabel ? "Profil & Kuota Saya" : "Profil Saya"}
                </Link>

                <form action={logoutAction}>
                  <button
                    type="submit"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-rose-700 transition-colors duration-150 hover:bg-rose-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600"
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
