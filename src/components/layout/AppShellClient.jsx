"use client";

import { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import TopNavbar from "@/components/layout/TopNavbar";

/**
 * Kontainer App Shell sisi klien untuk seluruh rute terproteksi (/(dashboard)/*).
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
    <div className="min-h-screen bg-[#F4F2EC] text-[#0F172A]">
      {/* Skip Link untuk pengguna keyboard & pembaca layar */}
      <a
        href="#main-content"
        className="visually-hidden fixed left-4 top-4 z-50 rounded-lg border border-stone-300 bg-[#0F172A] px-4 py-2 text-xs font-semibold text-white shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8]"
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

      {/* Konten utama: offset kiri mengikuti lebar sidebar desktop */}
      <div
        className={`flex min-h-screen flex-col transition-[padding] duration-200 ${
          isSidebarCollapsed ? "lg:pl-20" : "lg:pl-64"
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
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
