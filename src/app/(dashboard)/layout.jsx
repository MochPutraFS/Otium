import AppShellClient from "@/components/layout/AppShellClient";

// Layout utama untuk semua halaman yang memakai Sidebar & TopNavbar
export default function DashboardLayout({ children }) {
  return <AppShellClient>{children}</AppShellClient>;
}
