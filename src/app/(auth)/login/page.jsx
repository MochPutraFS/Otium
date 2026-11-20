import LoginBrandPanel from "@/components/auth/LoginBrandPanel";
import LoginFormCard from "@/components/auth/LoginFormCard";

export const metadata = {
  title: "Login — Otium | Sistem Manajemen Cuti Karyawan",
  description:
    "Halaman masuk terpusat Otium untuk Admin, Karyawan, Ketua Divisi, dan HRD.",
};

/**
 * Halaman Login terpusat (/login) pada Route Group (auth) — tanpa Sidebar/TopNavbar.
 * Layout responsif: Editorial Split-Screen 12-kolom di Desktop (lg+) dan Centered Canvas di Mobile/Tablet.
 */
export default async function LoginPage({ searchParams }) {
  const params = (await searchParams) || {};
  const callbackUrl =
    typeof params.callbackUrl === "string" ? params.callbackUrl : "";
  const reason = typeof params.reason === "string" ? params.reason : "";

  return (
    <main className="grid min-h-screen grid-cols-1 bg-[#F4F2EC] lg:grid-cols-12 lg:bg-white">
      {/* Panel Editorial Kiri (Desktop lg+) */}
      <LoginBrandPanel />

      {/* Area Form Login Kanan (Bersih & Fokus Tunggal) */}
      <section
        aria-label="Formulir Masuk Portal Otium"
        className="flex flex-col items-center justify-center px-4 py-10 sm:px-6 lg:col-span-7 lg:bg-white lg:px-12 xl:px-16"
      >
        <LoginFormCard callbackUrl={callbackUrl} reason={reason} />

        {/* Footer ringkas khusus Mobile/Tablet */}
        <p className="mt-6 text-center text-xs text-slate-500 lg:hidden">
          &copy; {new Date().getFullYear()} Otium &mdash; Sistem Manajemen Cuti
          Karyawan
        </p>
      </section>
    </main>
  );
}
