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
        className="relative flex flex-col items-center justify-center bg-[var(--paper)] px-5 pb-10 pt-16 sm:px-8 lg:px-12 lg:py-10"
      >
        {/* Switch Mode Tema (Terang / Gelap / Sistem) */}
        <div className="absolute right-5 top-5 sm:right-8 lg:right-10 lg:top-8">
          <ThemeToggleButton />
        </div>

        <LoginFormCard callbackUrl={callbackUrl} reason={reason} />

        {/* Footer ringkas khusus Mobile/Tablet */}
        <p className="mt-7 text-center font-mono text-[11px] text-[var(--ink-muted)] lg:hidden">
          &copy; {new Date().getFullYear()} OTIUM &bull; SISTEM MANAJEMEN CUTI
          KARYAWAN
        </p>
      </section>
    </main>
  );
}
