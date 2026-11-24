"use client";

import { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import TopNavbar from "@/components/layout/TopNavbar";

/**
 * Kontainer App Shell sisi klien bergaya Swiss Archival untuk seluruh rute terproteksi (/(dashboard)/*).
 * Mengelola state collapse sidebar desktop, drawer mobile native <dialog>,
 * dan meneruskan data realtime dari PostgreSQL ke Sidebar & TopNavbar.
 */
export default function AppShellClient({ sessionUser, shellData, children }) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const pendingCount = shellData?.pendingCount ?? 0;
  const initialNotifications = shellData?.notifications ?? [];
  const initialUnreadCount = shellData?.unreadNotificationCount ?? 0;
  const todayLabel = shellData?.todayLabel || "";
  const upcomingHoliday = shellData?.upcomingHoliday || null;

  return (
    <div className="min-h-dvh bg-[var(--alabaster)] text-[var(--ink)]">
      {/* Skip Link untuk pengguna keyboard & pembaca layar */}
      <a
        href="#main-content"
        className="visually-hidden fixed left-4 top-4 z-50 rounded-[2px] border border-[var(--spruce-btn)] bg-[var(--spruce-btn)] px-4 py-2 font-mono text-xs font-semibold text-[var(--spruce-btn-ink)] shadow-md"
      >
        Langsung ke konten utama
      </a>

      <Sidebar
        user={sessionUser}
        userRole={sessionUser.role}
        pendingCount={pendingCount}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Kolom workspace utama dengan kanvas polos Swiss Archival (--alabaster) */}
      <div
        className={`flex min-h-dvh flex-col bg-[var(--alabaster)] transition-[padding] duration-200 ${
          isSidebarCollapsed ? "lg:pl-[76px]" : "lg:pl-[256px]"
        }`}
      >
        <TopNavbar
          user={sessionUser}
          todayLabel={todayLabel}
          upcomingHoliday={upcomingHoliday}
          initialNotifications={initialNotifications}
          initialUnreadCount={initialUnreadCount}
          isMobileMenuOpen={isMobileSidebarOpen}
          onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
        />

        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 px-4 py-5 outline-none sm:px-6 sm:py-6"
        >
          <div className="mx-auto max-w-[1380px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
