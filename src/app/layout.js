import "./globals.css";

export const metadata = {
  title: "Sistem Manajemen Cuti Karyawan",
  description: "Individual Project 7 — Tugas Final Praktikum Pemrograman Web 2026",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body className="bg-slate-50 text-slate-900 antialiased">{children}</body>
    </html>
  );
}
