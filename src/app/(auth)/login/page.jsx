import LoginBrandPanel from "@/components/auth/LoginBrandPanel";
import LoginFormCard from "@/components/auth/LoginFormCard";

export const metadata = {
  title: "Login — Otium | Sistem Manajemen Cuti Karyawan",
  description:
    "Halaman masuk terpusat Otium untuk Admin, Karyawan, Ketua Divisi, dan HRD.",
};

/**
 * Halaman Login terpusat (/login) pada Route Group (auth) — tanpa Sidebar/TopNavbar.
 * Layout responsif: Split-Screen 2 kolom pada Desktop (lg+) dan Single Centered Card di Mobile/Tablet.
 */
export default async function LoginPage({ searchParams }) {
  const params = (await searchParams) || {};
  const callbackUrl =
    typeof params.callbackUrl === "string" ? params.callbackUrl : "";
  const reason = typeof params.reason === "string" ? params.reason : "";

  return (
    <main className="grid min-h-screen grid-cols-1 bg-slate-50 lg:grid-cols-12">
      {/* Panel Branding Kiri (Tampil di Desktop lg+) */}
      <LoginBrandPanel />

      {/* Area Form Login Kanan (Centered di semua ukuran layar) */}
      <section className="flex flex-col items-center justify-center px-4 py-10 sm:px-6 lg:col-span-7 lg:px-10 xl:col-span-7">
        <LoginFormCard callbackUrl={callbackUrl} reason={reason} />

        {/* Footer ringkas untuk Mobile/Tablet (Desktop sudah tampil di LoginBrandPanel) */}
        <p className="mt-6 text-center text-xs text-slate-500 lg:hidden">
          &copy; {new Date().getFullYear()} Otium &mdash; Sistem Manajemen Cuti
          Karyawan
        </p>
      </section>
    </main>
  );
}
