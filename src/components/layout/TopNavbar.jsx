"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  ChevronDown,
  LogOut,
  Menu,
  Sparkles,
  UserCircle2,
} from "lucide-react";
import NotificationDropdown from "@/components/layout/NotificationDropdown";
import StatusBadge from "@/components/ui/StatusBadge";
import { WORKSPACE_DATE_META } from "@/lib/mock-dashboard-data";

const PAGE_TITLE_MAP = {
  "/dashboard": { title: "Dashboard", section: "Ringkasan" },
  "/profile": { title: "Profil & Kuota Saya", section: "Akun Saya" },
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

// Navbar atas: judul halaman, info tanggal/libur terdekat, notifikasi, dan menu profil
export default function TopNavbar({
  user,
  previewRoleKey = "karyawan",
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
  }, []);

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-slate-200/90 bg-white/95 px-4 backdrop-blur sm:px-6">
      {/* Bagian kiri: tombol menu mobile & judul halaman */}
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Buka menu navigasi"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 lg:hidden"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="min-w-0">
          <p className="hidden text-[11px] font-medium uppercase tracking-wider text-slate-400 sm:block">
            {pageMeta.section}
          </p>
          <h1 className="truncate text-base font-bold tracking-tight text-slate-900 sm:text-lg">
            {pageMeta.title}
          </h1>
        </div>
      </div>

      {/* Bagian kanan: info tanggal/libur, notifikasi, dan profil */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Info tanggal hari ini & libur nasional berikutnya */}
        <div
          className="hidden items-center gap-3 rounded-xl border border-slate-200/90 bg-slate-50/90 px-3 py-1.5 text-xs md:flex"
          title={`Hari libur nasional berikutnya: ${WORKSPACE_DATE_META.upcomingHoliday.name} (${WORKSPACE_DATE_META.upcomingHoliday.dateLabel})`}
        >
          <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
            <CalendarDays
              className="h-3.5 w-3.5 text-blue-600"
              aria-hidden="true"
            />
            {WORKSPACE_DATE_META.todayLabel}
          </span>
          <span
            className="hidden h-3.5 w-px bg-slate-200 xl:inline-block"
            aria-hidden="true"
          />
          <span className="hidden items-center gap-1.5 text-slate-500 xl:inline-flex">
            <Sparkles
              className="h-3.5 w-3.5 text-amber-500"
              aria-hidden="true"
            />
            <span>
              Libur:{" "}
              <strong className="font-semibold text-slate-700">
                {WORKSPACE_DATE_META.upcomingHoliday.name}
              </strong>{" "}
              ({WORKSPACE_DATE_META.upcomingHoliday.dateLabel})
            </span>
          </span>
        </div>

        {/* Tombol notifikasi */}
        <NotificationDropdown
          initialNotifications={user.notifications}
          roleKey={previewRoleKey}
        />

        {/* Menu profil akun */}
        <div className="relative" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => setIsUserMenuOpen((prev) => !prev)}
            aria-expanded={isUserMenuOpen}
            className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white py-1.5 pl-1.5 pr-2.5 text-left transition hover:bg-slate-50"
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 text-xs font-bold text-white">
              {user.initials}
            </div>
            <div className="hidden min-w-0 sm:block">
              <p className="max-w-[125px] truncate text-xs font-semibold text-slate-900">
                {user.fullName}
              </p>
              <p className="text-[11px] text-slate-500">{user.role}</p>
            </div>
            <ChevronDown
              className="hidden h-3.5 w-3.5 text-slate-400 sm:block"
              aria-hidden="true"
            />
          </button>

          {isUserMenuOpen && (
            <div className="absolute right-0 z-40 mt-2 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
              <div className="border-b border-slate-100 px-4 py-3">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {user.fullName}
                </p>
                <p className="truncate text-xs text-slate-500">{user.email}</p>
                <div className="mt-2 flex items-center gap-2">
                  <StatusBadge status={user.role} />
                  {user.divisionName && (
                    <span className="truncate text-[11px] font-medium text-slate-500">
                      {user.divisionName}
                    </span>
                  )}
                </div>
              </div>

              <div className="p-1.5">
                <Link
                  href="/profile"
                  onClick={() => setIsUserMenuOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                >
                  <UserCircle2
                    className="h-4 w-4 text-slate-400"
                    aria-hidden="true"
                  />
                  Profil &amp; Kuota Saya
                </Link>
                <Link
                  href="/login?reason=logged_out"
                  onClick={() => setIsUserMenuOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-rose-600 transition hover:bg-rose-50"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  Keluar (Logout)
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
