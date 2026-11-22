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
 * Sidebar navigasi Swiss Archival:
 * - Logo Otium asli (/images/otium-logo.svg) pada desktop & mobile drawer
 * - Collapse/expand rail di desktop, native modal <dialog> di mobile (via React state)
 * - Quota Summary Footer untuk Karyawan & Ketua Divisi
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

  const showQuotaFooter =
    user && (userRole === "Karyawan" || userRole === "Ketua Divisi");
  const quotaTotal = Math.max(1, Number(user?.initialLeaveQuota ?? 12));
  const quotaRemaining = Math.max(0, Number(user?.remainingLeaveQuota ?? 0));
  const quotaUsed = Math.max(0, quotaTotal - quotaRemaining);
  const quotaPct = Math.max(0, Math.min(100, (quotaRemaining / quotaTotal) * 100));

  function isLinkActive(item) {
    if (item.exact) {
      return pathname === item.href;
    }
    if (item.href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }

  function renderSidebarInner(compact = false, isMobileDrawer = false) {
    return (
      <div className="flex h-full flex-col bg-[var(--paper)] text-[var(--ink)]">
        {/* Header Brand Otium (Logo Asli) */}
        <div
          className={`flex h-[60px] shrink-0 items-center border-b border-[var(--rule)] ${
            compact ? "justify-center px-2" : "justify-between px-4"
          }`}
        >
          <Link
            href="/dashboard"
            onClick={onCloseMobile}
            aria-label="Otium — Kembali ke Dashboard"
            className="flex min-w-0 cursor-pointer items-center gap-2.5 rounded-[2px]"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[2px] border border-[var(--rule-strong)] bg-[var(--paper-pure)] p-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/otium-logo.svg"
                alt=""
                className="h-full w-full object-contain"
              />
            </div>
            {!compact && (
              <div className="min-w-0 leading-tight">
                <span className="block truncate font-serif text-xl font-bold leading-none tracking-[0.08em] text-[var(--ink)]">
                  OTIUM
                </span>
                <span className="mt-0.5 block truncate font-mono text-[9.5px] uppercase tracking-[0.07em] text-[var(--ink-muted)]">
                  ARSIP CUTI {new Date().getFullYear()}
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
              className="hidden h-8 w-8 cursor-pointer items-center justify-center rounded-[2px] border border-transparent text-[var(--ink-muted)] transition-colors duration-150 hover:border-[var(--rule-strong)] hover:bg-[var(--alabaster)] hover:text-[var(--ink)] lg:inline-flex"
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
              className="btn btn-sm lg:hidden"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Tutup</span>
            </button>
          )}
        </div>

        {/* Tombol lebarkan sidebar saat sedang mode ikon (collapsed) */}
        {compact && !isMobileDrawer && (
          <div className="hidden justify-center border-b border-[var(--rule)] py-2.5 lg:flex">
            <button
              type="button"
              onClick={onToggleCollapse}
              title="Lebarkan Sidebar"
              aria-label="Lebarkan Sidebar"
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-[2px] border border-transparent text-[var(--ink-muted)] transition-colors duration-150 hover:border-[var(--rule-strong)] hover:bg-[var(--alabaster)] hover:text-[var(--ink)]"
            >
              <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Daftar Menu Navigasi RBAC */}
        <nav aria-label="Navigasi Utama" className="flex-1 overflow-y-auto">
          {filteredGroups.map((group) => (
            <div
              key={group.section}
              className="border-b border-[var(--rule)] py-3.5 last:border-b-0"
            >
              {!compact ? (
                <p className="px-5 pb-2 font-mono text-[10.5px] uppercase tracking-[0.08em] text-[var(--ink-muted)]">
                  {group.section}
                </p>
              ) : (
                <div
                  className="mx-auto mb-2 h-px w-6 bg-[var(--rule-strong)]/60"
                  aria-hidden="true"
                />
              )}

              <ul className="m-0 list-none p-0">
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
                        className={`group relative flex w-full cursor-pointer items-center border-l-[3px] text-[13.5px] transition-colors duration-150 ${
                          compact
                            ? "justify-center px-0 py-2.5"
                            : "justify-between gap-2.5 px-5 py-2.5"
                        } ${
                          active
                            ? "border-[var(--spruce)] bg-[var(--paper-pure)] font-semibold text-[var(--spruce)] shadow-[inset_0_1px_0_var(--rule),inset_0_-1px_0_var(--rule)]"
                            : "border-transparent font-medium text-[var(--ink-soft)] hover:bg-[var(--alabaster)] hover:text-[var(--ink)]"
                        }`}
                      >
                        <span
                          className={`flex min-w-0 items-center ${
                            compact ? "justify-center" : "gap-2.5"
                          }`}
                        >
                          <Icon
                            className={`h-4 w-4 shrink-0 ${
                              active
                                ? "text-[var(--spruce)]"
                                : "text-[var(--ink-muted)] group-hover:text-[var(--ink)]"
                            }`}
                            aria-hidden="true"
                          />
                          {!compact && (
                            <span className="truncate">{item.label}</span>
                          )}
                        </span>

                        {showCounter && !compact && (
                          <span className="mono inline-flex min-w-[1.35rem] items-center justify-center border border-[var(--spruce-border)] bg-[var(--spruce-tint)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--spruce)]">
                            {pendingCount}
                          </span>
                        )}

                        {showCounter && compact && (
                          <span
                            aria-label={`${pendingCount} menunggu tindakan`}
                            className="absolute right-2.5 top-2 h-2 w-2 bg-[var(--terracotta)] ring-2 ring-[var(--paper)]"
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

        {/* Quota Summary Footer (Khusus Karyawan & Ketua Divisi) */}
        {showQuotaFooter && (
          <div className="shrink-0 border-t border-[var(--rule)] bg-[var(--alabaster)] px-4 py-3.5">
            {!compact ? (
              <div>
                <div className="mb-1.5 flex items-baseline justify-between gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-[0.05em] text-[var(--ink-muted)]">
                    KUOTA TAHUNAN
                  </span>
                  <span className="mono text-[12.5px] font-semibold text-[var(--spruce)]">
                    {quotaRemaining.toFixed(1)} / {quotaTotal.toFixed(1)}
                  </span>
                </div>
                <div
                  className="meter"
                  role="progressbar"
                  aria-label="Sisa kuota cuti tahunan"
                  aria-valuenow={quotaRemaining}
                  aria-valuemin={0}
                  aria-valuemax={quotaTotal}
                >
                  <div
                    className="meter-fill"
                    style={{ width: `${quotaPct.toFixed(1)}%` }}
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-[var(--ink-muted)]">
                  Terpakai{" "}
                  <span className="mono font-medium text-[var(--ink-soft)]">
                    {quotaUsed.toFixed(1)}
                  </span>{" "}
                  hari kerja
                </p>
              </div>
            ) : (
              <div
                title={`Sisa kuota tahunan: ${quotaRemaining.toFixed(1)} / ${quotaTotal.toFixed(1)} hari kerja`}
                className="flex flex-col items-center gap-1"
              >
                <span className="mono text-[11px] font-semibold text-[var(--spruce)]">
                  {quotaRemaining.toFixed(1)}
                </span>
                <div className="meter w-10">
                  <div
                    className="meter-fill"
                    style={{ width: `${quotaPct.toFixed(1)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer Logout */}
        <div className="shrink-0 border-t border-[var(--rule)] bg-[var(--paper)] p-3">
          <form action={logoutAction}>
            <button
              type="submit"
              onClick={onCloseMobile}
              title={compact ? "Keluar (Logout)" : undefined}
              className={`btn btn-danger-ghost w-full ${
                compact ? "!px-0" : "!justify-start"
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
        className={`hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:flex-col lg:border-r lg:border-[var(--rule-strong)] lg:transition-[width] lg:duration-200 ${
          isCollapsed ? "lg:w-[76px]" : "lg:w-[256px]"
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
        <div className="flex h-full w-[276px] max-w-[84vw] flex-col border-r border-[var(--ink)] shadow-2xl">
          {renderSidebarInner(false, true)}
        </div>
      </dialog>
    </>
  );
}
