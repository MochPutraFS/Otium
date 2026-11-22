"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/actions/auth-actions";
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

/**
 * Sidebar navigasi editorial Warm Paper Light (#FAF9F6) — Opsi B (Swiss Editorial Minimalism).
 * Desktop: fixed collapsible rail dengan hairline border stone-300; Mobile: native modal <dialog>.
 */
export default function Sidebar({
  user,
  userRole = "Karyawan",
  pendingCount = 0,
  isCollapsed = false,
  onToggleCollapse,
  isOpenMobile = false,
  onCloseMobile,
}) {
  const pathname = usePathname();
  const mobileDialogRef = useRef(null);

  useEffect(() => {
    const dialog = mobileDialogRef.current;
    if (!dialog) return;

    if (isOpenMobile && !dialog.open) {
      dialog.showModal();
    } else if (!isOpenMobile && dialog.open) {
      dialog.close();
    }
  }, [isOpenMobile]);

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

  function renderAvatar(sizeClass = "h-8 w-8") {
    if (user?.avatarUrl) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={user.avatarUrl}
          alt=""
          className={`${sizeClass} shrink-0 rounded-lg border border-stone-200 object-cover`}
        />
      );
    }

    return (
      <div
        className={`flex ${sizeClass} shrink-0 items-center justify-center rounded-lg bg-[#0F172A] text-xs font-semibold tracking-tight text-white`}
      >
        {user?.initials || "OT"}
      </div>
    );
  }

  function renderSidebarInner(compact = false, isMobileDrawer = false) {
    return (
      <div className="flex h-full flex-col bg-[#FAF9F6] text-[#0F172A]">
        {/* Header Brand Otium */}
        <div
          className={`flex h-16 shrink-0 items-center border-b border-stone-200 ${
            compact ? "justify-center px-3" : "justify-between px-4"
          }`}
        >
          <Link
            href="/dashboard"
            onClick={onCloseMobile}
            aria-label="Otium — Kembali ke Dashboard"
            className="flex min-w-0 cursor-pointer items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F172A]"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-stone-200 bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/otium-logo.svg"
                alt=""
                className="h-6 w-6 object-contain"
              />
            </div>
            {!compact && (
              <div className="min-w-0 leading-tight">
                <span className="block truncate text-base font-bold tracking-tight text-[#0F172A]">
                  Otium
                </span>
                <span className="mt-0.5 block truncate text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500">
                  Leave Portal
                </span>
              </div>
            )}
          </Link>

          {/* Tombol ciutkan sidebar di desktop */}
          {!compact && !isMobileDrawer && (
            <button
              type="button"
              onClick={onToggleCollapse}
              title="Ciutkan Sidebar"
              aria-label="Ciutkan Sidebar"
              className="hidden h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-500 transition-colors duration-150 hover:bg-[#F4F2EC] hover:text-[#0F172A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F172A] lg:inline-flex"
            >
              <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
            </button>
          )}

          {/* Tombol tutup drawer di mobile */}
          {isMobileDrawer && (
            <button
              type="button"
              onClick={onCloseMobile}
              aria-label="Tutup menu navigasi"
              autoFocus
              className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-slate-600 transition-colors duration-150 hover:bg-[#F4F2EC] hover:text-[#0F172A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F172A] lg:hidden"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Tombol lebarkan sidebar saat sedang mode ikon */}
        {compact && !isMobileDrawer && (
          <div className="hidden justify-center border-b border-stone-200 py-2.5 lg:flex">
            <button
              type="button"
              onClick={onToggleCollapse}
              title="Lebarkan Sidebar"
              aria-label="Lebarkan Sidebar"
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-500 transition-colors duration-150 hover:bg-[#F4F2EC] hover:text-[#0F172A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F172A]"
            >
              <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Daftar Menu Navigasi RBAC */}
        <nav
          aria-label="Navigasi Utama"
          className={`flex-1 space-y-5 overflow-y-auto py-5 ${
            compact ? "px-2.5" : "px-3"
          }`}
        >
          {filteredGroups.map((group) => (
            <div key={group.section}>
              {!compact ? (
                <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {group.section}
                </p>
              ) : (
                <div
                  className="mx-auto mb-2 h-px w-6 bg-stone-300/80"
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
                        href={item.href}
                        onClick={onCloseMobile}
                        aria-current={active ? "page" : undefined}
                        title={compact ? item.label : undefined}
                        className={`group relative flex cursor-pointer items-center rounded-lg text-sm transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F172A] ${
                          compact
                            ? "justify-center p-2.5"
                            : "justify-between gap-2.5 px-3 py-2"
                        } ${
                          active
                            ? "bg-[#ECE9E0] font-semibold text-[#0F172A] before:absolute before:inset-y-1.5 before:left-0 before:w-[3px] before:rounded-r before:bg-[#0F172A]"
                            : "font-medium text-slate-700 hover:bg-[#F4F2EC] hover:text-[#0F172A]"
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
                                ? "text-[#0F172A]"
                                : "text-slate-500 group-hover:text-[#0F172A]"
                            }`}
                            aria-hidden="true"
                          />
                          {!compact && (
                            <span className="truncate">{item.label}</span>
                          )}
                        </span>

                        {showCounter && !compact && (
                          <span
                            className={`inline-flex min-w-[1.35rem] items-center justify-center rounded-full px-1.5 py-0.5 font-mono text-[11px] font-semibold tabular-nums ${
                              active
                                ? "bg-[#0F172A] text-white"
                                : "bg-rose-600 text-white"
                            }`}
                          >
                            {pendingCount}
                          </span>
                        )}

                        {showCounter && compact && (
                          <span
                            aria-label={`${pendingCount} menunggu tindakan`}
                            className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-600 ring-2 ring-[#FAF9F6]"
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

        {/* Footer Identitas Akun & Logout */}
        <div className="shrink-0 border-t border-stone-200 bg-[#F4F2EC]/60 p-3">
          {user && !compact && (
            <Link
              href="/profile"
              onClick={onCloseMobile}
              className="mb-2 flex cursor-pointer items-center gap-2.5 rounded-lg border border-stone-200 bg-white p-2.5 transition-colors duration-150 hover:border-stone-300 hover:bg-[#FAF9F6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F172A]"
            >
              {renderAvatar("h-8 w-8")}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-[#0F172A]">
                  {user.fullName}
                </p>
                <p className="truncate text-[11px] text-slate-600">
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
              aria-label={`Buka profil ${user.fullName}`}
              className="mx-auto mb-2 flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg transition-opacity duration-150 hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F172A]"
            >
              {renderAvatar("h-9 w-9")}
            </Link>
          )}

          <form action={logoutAction}>
            <button
              type="submit"
              onClick={onCloseMobile}
              title={compact ? "Keluar (Logout)" : undefined}
              className={`flex w-full cursor-pointer items-center rounded-lg text-sm font-medium text-rose-700 transition-colors duration-150 hover:bg-rose-50 hover:text-rose-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600 ${
                compact ? "justify-center p-2.5" : "gap-3 px-3 py-2"
              }`}
            >
              <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
              {!compact && <span>Keluar (Logout)</span>}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Sidebar Desktop */}
      <aside
        aria-label="Panel Navigasi Samping"
        className={`hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:flex-col lg:border-r lg:border-stone-300/90 lg:transition-[width] lg:duration-200 ${
          isCollapsed ? "lg:w-20" : "lg:w-64"
        }`}
      >
        {renderSidebarInner(isCollapsed, false)}
      </aside>

      {/* Drawer Mobile menggunakan native modal <dialog> */}
      <dialog
        id="mobile-navigation-drawer"
        ref={mobileDialogRef}
        aria-label="Menu navigasi mobile"
        onClose={onCloseMobile}
        onClick={(event) => {
          if (event.target === mobileDialogRef.current) {
            onCloseMobile();
          }
        }}
        className="otium-mobile-drawer lg:hidden"
      >
        <div className="flex h-full w-72 max-w-[85vw] flex-col border-r border-stone-300 shadow-2xl">
          {renderSidebarInner(false, true)}
        </div>
      </dialog>
    </>
  );
}
