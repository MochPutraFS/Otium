import { redirect } from "next/navigation";
import LoginBrandPanel from "@/components/auth/LoginBrandPanel";
import LoginFormCard from "@/components/auth/LoginFormCard";
import ThemeToggleButton from "@/components/ui/ThemeToggleButton";
import { getCurrentUser } from "@/lib/auth";

export const metadata = {
  title: "Login — Otium | Sistem Manajemen Cuti Karyawan",
  description:
    "Halaman masuk terpusat Otium untuk Admin, Karyawan, Ketua Divisi, dan HRD.",
};

/**
 * Halaman Login terpusat (/login) pada Route Group (auth) — tanpa Sidebar/TopNavbar.
 * Layout Swiss Arch Atelier split-screen di Desktop (lg+) dan Centered Canvas di Mobile/Tablet.
 * Menerapkan Layer 2 Guard: jika pengguna sudah memiliki sesi aktif di PostgreSQL, arahkan ke /dashboard.
 */
export default async function LoginPage({ searchParams }) {
  const params = (await searchParams) || {};
  const callbackUrl =
    typeof params.callbackUrl === "string" ? params.callbackUrl : "";
  const reason = typeof params.reason === "string" ? params.reason : "";

  if (reason !== "inactive") {
    const activeUser = await getCurrentUser();
    if (activeUser) {
      redirect("/dashboard");
    }
  }

  return (
    <main className="grid min-h-dvh grid-cols-1 bg-[var(--alabaster)] text-[var(--ink)] lg:grid-cols-[1.08fr_1fr]">
      {/* Panel Editorial Split Archival Kiri (Desktop lg+) */}
      <LoginBrandPanel />

      {/* Area Form Login Kanan */}
      <section
        aria-label="Formulir Masuk Portal Otium"
        className="flex min-h-dvh flex-col justify-between bg-[var(--paper)] px-5 py-5 sm:px-8 sm:py-6 lg:min-h-0 lg:px-10 lg:py-8"
      >
        {/* Baris atas: Switch Mode Tema (Terang / Gelap / Sistem) in-flow agar tidak pernah menumpuk kartu */}
        <div className="flex w-full items-center justify-end">
          <ThemeToggleButton />
        </div>

        {/* Kartu Login terpusat dengan ruang napas aman di segala resolusi & zoom */}
        <div className="my-auto flex w-full flex-col items-center py-6">
          <LoginFormCard callbackUrl={callbackUrl} reason={reason} />

          {/* Footer ringkas khusus Mobile/Tablet */}
          <p className="mt-7 text-center font-mono text-[11px] text-[var(--ink-muted)] lg:hidden">
            &copy; {new Date().getFullYear()} OTIUM &bull; SISTEM MANAJEMEN CUTI
            KARYAWAN
          </p>
        </div>

        {/* Spacer penyeimbang desktop agar kartu tetap sejajar tengah secara optik */}
        <div className="hidden h-8 lg:block" aria-hidden="true" />
      </section>
    </main>
  );
}
