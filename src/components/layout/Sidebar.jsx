"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  CalendarPlus,
  CheckSquare,
  ClipboardCheck,
  FileClock,
  LayoutDashboard,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  SlidersHorizontal,
  UserCircle2,
  UserCog,
  Users,
  X,
} from "lucide-react";

const MENU_GROUPS = [
  {
    section: "Menu Utama",
    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        roles: ["Admin", "Karyawan", "Ketua Divisi", "HRD"],
      },
    ],
  },
  {
    section: "CMS Master Data",
    items: [
      {
        label: "Manajemen Pengguna",
        href: "/admin/users",
        icon: Users,
        roles: ["Admin"],
      },
      {
        label: "Manajemen Divisi",
        href: "/admin/divisions",
        icon: Building2,
        roles: ["Admin"],
      },
      {
        label: "Anggota Divisi",
        href: "/admin/division-members",
        icon: UserCog,
        roles: ["Admin"],
      },
      {
        label: "Jenis Cuti Dinamis",
        href: "/admin/leave-types",
        icon: SlidersHorizontal,
        roles: ["Admin"],
      },
    ],
  },
  {
    section: "Operasional Cuti",
    items: [
      {
        label: "Ajukan Cuti Baru",
        href: "/leaves/new",
        icon: CalendarPlus,
        roles: ["Karyawan", "Ketua Divisi"],
      },
      {
        label: "Riwayat Cuti Saya",
        href: "/leaves",
        icon: FileClock,
        roles: ["Karyawan", "Ketua Divisi"],
        exact: true,
      },
    ],
  },
  {
    section: "Verifikasi & Persetujuan",
    items: [
      {
        label: "Verifikasi Cuti Divisi",
        href: "/approvals/leader",
        icon: ClipboardCheck,
        roles: ["Ketua Divisi"],
        showBadge: true,
      },
      {
        label: "Persetujuan Final HRD",
        href: "/approvals/hrd",
        icon: CheckSquare,
        roles: ["HRD"],
        showBadge: true,
      },
    ],
  },
  {
    section: "Akun Saya",
    items: [
      {
        label: "Profil & Kuota Saya",
        href: "/profile",
        icon: UserCircle2,
        roles: ["Karyawan", "Ketua Divisi"],
      },
      {
        label: "Profil Saya",
        href: "/profile",
        icon: UserCircle2,
        roles: ["Admin", "HRD"],
      },
    ],
  },
];

// Menu samping dengan tema gelap (bisa diciutkan di desktop, jadi drawer di mobile)
export default function Sidebar({
  user,
  userRole = "Karyawan",
  pendingCount = 0,
  previewRoleKey = "karyawan",
  isCollapsed = false,
  onToggleCollapse,
  isOpenMobile = false,
  onCloseMobile,
}) {
  const pathname = usePathname();

  const filteredGroups = MENU_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.roles.includes(userRole)),
  })).filter((group) => group.items.length > 0);

  function isLinkActive(item) {
    if (item.exact) {
      return pathname === item.href;
    }
    if (item.href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }

  function buildHref(href) {
    if (previewRoleKey && href.startsWith("/") && !href.startsWith("/login")) {
      const separator = href.includes("?") ? "&" : "?";
      return `${href}${separator}role=${previewRoleKey}`;
    }
    return href;
  }

  function renderSidebarInner(compact = false) {
    return (
      <div className="relative flex h-full flex-col overflow-hidden bg-gradient-to-b from-slate-950 via-blue-950 to-slate-900 text-slate-100">
        {/* Efek glow tipis di sudut atas */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-sky-400/10 blur-3xl"
        />

        {/* Logo Otium dan tombol collapse/close */}
        <div
          className={`relative z-10 flex h-16 shrink-0 items-center border-b border-white/10 ${
            compact ? "justify-center px-3" : "justify-between px-4"
          }`}
        >
          <Link
            href={buildHref("/dashboard")}
            onClick={onCloseMobile}
            title="Otium — Sistem Manajemen Cuti"
            className="flex min-w-0 items-center gap-3"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
              <img
                src="/images/otium-logo.png"
                alt="Logo Otium"
                className="h-7 w-7 object-contain"
              />
            </div>
            {!compact && (
              <div className="min-w-0 leading-tight">
                <span className="block truncate text-base font-bold tracking-tight text-white">
                  Otium
                </span>
                <span className="block truncate text-[11px] font-medium text-sky-200/80">
                  Manajemen Cuti
                </span>
              </div>
            )}
          </Link>

          {/* Tombol ciutkan sidebar di desktop */}
          {!compact && (
            <button
              type="button"
              onClick={onToggleCollapse}
              title="Ciutkan Sidebar"
              aria-label="Ciutkan Sidebar"
              className="hidden rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white lg:inline-flex"
            >
              <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
            </button>
          )}

          {/* Tombol tutup drawer di mobile */}
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Tutup menu navigasi"
            className="rounded-lg p-1.5 text-slate-300 transition hover:bg-white/10 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Tombol lebarkan sidebar saat sedang mode ikon */}
        {compact && (
          <div className="relative z-10 hidden justify-center border-b border-white/10 py-2.5 lg:flex">
            <button
              type="button"
              onClick={onToggleCollapse}
              title="Lebarkan Sidebar"
              aria-label="Lebarkan Sidebar"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Menu navigasi sesuai role */}
        <nav
          aria-label="Navigasi Utama"
          className={`relative z-10 flex-1 space-y-5 overflow-y-auto py-5 ${
            compact ? "px-2.5" : "px-3.5"
          }`}
        >
          {filteredGroups.map((group) => (
            <div key={group.section}>
              {!compact ? (
                <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400/90">
                  {group.section}
                </p>
              ) : (
                <div
                  className="mx-auto mb-2 h-px w-6 bg-white/10"
                  aria-hidden="true"
                />
              )}

              <ul className="mt-2 space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isLinkActive(item);
                  const showCounter = item.showBadge && pendingCount > 0;

                  return (
                    <li key={item.href}>
                      <Link
                        href={buildHref(item.href)}
                        onClick={onCloseMobile}
                        title={compact ? item.label : undefined}
                        className={`group relative flex items-center rounded-xl text-sm font-medium transition ${
                          compact
                            ? "justify-center p-2.5"
                            : "justify-between gap-2.5 px-3 py-2.5"
                        } ${
                          active
                            ? "bg-blue-600 text-white shadow-md shadow-blue-950/50 ring-1 ring-sky-300/30"
                            : "text-slate-300 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        <span
                          className={`flex min-w-0 items-center ${
                            compact ? "justify-center" : "gap-3"
                          }`}
                        >
                          <Icon
                            className={`h-4 w-4 shrink-0 ${
                              active
                                ? "text-white"
                                : "text-slate-400 group-hover:text-sky-200"
                            }`}
                            aria-hidden="true"
                          />
                          {!compact && (
                            <span className="truncate">{item.label}</span>
                          )}
                        </span>

                        {showCounter && !compact && (
                          <span
                            className={`inline-flex min-w-[1.35rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-bold ${
                              active
                                ? "bg-white/20 text-white"
                                : "bg-rose-500 text-white"
                            }`}
                          >
                            {pendingCount}
                          </span>
                        )}

                        {showCounter && compact && (
                          <span
                            aria-label={`${pendingCount} menunggu tindakan`}
                            className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-slate-950"
                          />
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Info singkat akun dan tombol logout */}
        <div className="relative z-10 shrink-0 border-t border-white/10 bg-slate-950/40 p-3">
          {user && !compact && (
            <Link
              href="/profile"
              onClick={onCloseMobile}
              className="mb-2 flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 p-2.5 transition hover:bg-white/10"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-sky-400 to-blue-600 text-xs font-bold text-white">
                {user.initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-white">
                  {user.fullName}
                </p>
                <p className="truncate text-[11px] text-sky-200/80">
                  {user.role}
                  {user.divisionName ? ` · ${user.divisionName}` : ""}
                </p>
              </div>
            </Link>
          )}

          {user && compact && (
            <Link
              href="/profile"
              title={`${user.fullName} (${user.role})`}
              className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-sky-400 to-blue-600 text-xs font-bold text-white ring-1 ring-white/20 transition hover:opacity-90"
            >
              {user.initials}
            </Link>
          )}

          <Link
            href="/login?reason=logged_out"
            onClick={onCloseMobile}
            title={compact ? "Keluar (Logout)" : undefined}
            className={`flex w-full items-center rounded-xl text-sm font-medium text-rose-300 transition hover:bg-rose-500/15 hover:text-rose-200 ${
              compact ? "justify-center p-2.5" : "gap-3 px-3 py-2"
            }`}
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
            {!compact && <span>Keluar (Logout)</span>}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Sidebar desktop */}
      <aside
        className={`hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:flex-col lg:border-r lg:border-slate-800/80 lg:transition-all lg:duration-200 ${
          isCollapsed ? "lg:w-20" : "lg:w-64"
        }`}
      >
        {renderSidebarInner(isCollapsed)}
      </aside>

      {/* Drawer mobile */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Menu navigasi mobile"
        >
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="fixed inset-y-0 left-0 z-10 flex w-72 max-w-[85vw] flex-col shadow-2xl">
            {renderSidebarInner(false)}
          </aside>
        </div>
      )}
    </>
  );
}
