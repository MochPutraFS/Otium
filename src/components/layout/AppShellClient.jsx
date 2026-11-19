"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import TopNavbar from "@/components/layout/TopNavbar";
import PreviewRoleDock from "@/components/layout/PreviewRoleDock";
import {
  ROLE_PRESETS,
  resolvePreviewRole,
} from "@/lib/mock-dashboard-data";

function AppShellInner({ children }) {
  const searchParams = useSearchParams();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const previewRoleKey = resolvePreviewRole(searchParams.get("role"));
  const activeUser = ROLE_PRESETS[previewRoleKey] || ROLE_PRESETS.karyawan;

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar
        user={activeUser}
        userRole={activeUser.role}
        pendingCount={activeUser.pendingBadgeCount}
        previewRoleKey={previewRoleKey}
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
          previewRoleKey={previewRoleKey}
          onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
        />

        <main className="flex-1 p-4 pb-20 sm:p-6 sm:pb-20">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>

      {/* Tombol ganti role sementara untuk pratinjau UI */}
      <PreviewRoleDock previewRoleKey={previewRoleKey} />
    </div>
  );
}

// Dibungkus Suspense karena memakai useSearchParams di Next.js App Router.
// Nanti saat backend siap, data user bisa langsung dikirim dari Server Layout.
export default function AppShellClient({ children }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">
          Memuat ruang kerja Otium...
        </div>
      }
    >
      <AppShellInner>{children}</AppShellInner>
    </Suspense>
  );
}
