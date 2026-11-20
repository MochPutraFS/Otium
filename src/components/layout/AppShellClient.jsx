"use client";

import { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import TopNavbar from "@/components/layout/TopNavbar";
import { ROLE_PRESETS } from "@/lib/mock-dashboard-data";

function mapRoleToKey(role) {
  switch (role) {
    case "Admin":
      return "admin";
    case "Ketua Divisi":
      return "ketua-divisi";
    case "HRD":
      return "hrd";
    case "Karyawan":
    default:
      return "karyawan";
  }
}

export default function AppShellClient({ sessionUser, children }) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const roleKey = mapRoleToKey(sessionUser?.role);
  const fallbackPreset = ROLE_PRESETS[roleKey] || ROLE_PRESETS.karyawan;

  const activeUser = sessionUser
    ? {
        ...fallbackPreset,
        id: sessionUser.id,
        username: sessionUser.username,
        fullName: sessionUser.fullName,
        email: sessionUser.email,
        role: sessionUser.role,
        divisionId: sessionUser.divisionId,
        divisionName: sessionUser.divisionName,
        initials: sessionUser.initials,
        remainingLeaveQuota: sessionUser.remainingLeaveQuota,
        initialLeaveQuota: sessionUser.initialLeaveQuota,
      }
    : fallbackPreset;

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar
        user={activeUser}
        userRole={activeUser.role}
        pendingCount={activeUser.pendingBadgeCount}
        previewRoleKey={roleKey}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Konten utama, padding kiri ikut menyesuaikan lebar sidebar */}
      <div
        className={`flex min-h-screen flex-col transition-all duration-200 ${
          isSidebarCollapsed ? "lg:pl-20" : "lg:pl-64"
        }`}
      >
        <TopNavbar
          user={activeUser}
          previewRoleKey={roleKey}
          onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-6">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
