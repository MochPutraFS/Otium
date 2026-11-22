import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata = {
  title: "Otium — Sistem Manajemen Cuti Karyawan",
  description:
    "Otium adalah portal Sistem Manajemen Cuti Karyawan terpadu untuk Admin, Karyawan, Ketua Divisi, dan HRD.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id" className={inter.variable}>
      <body className="font-sans bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
