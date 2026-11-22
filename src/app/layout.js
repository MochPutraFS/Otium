import {
  Cormorant_Garamond,
  IBM_Plex_Mono,
  IBM_Plex_Sans,
} from "next/font/google";
import "./globals.css";

const cormorantGaramond = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-cormorant",
});

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-ibm-sans",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-ibm-mono",
});

export const metadata = {
  title: "Otium — Sistem Manajemen Cuti Karyawan",
  description:
    "Otium adalah portal Sistem Manajemen Cuti Karyawan terpadu untuk Admin, Karyawan, Ketua Divisi, dan HRD.",
};

export const viewport = {
  colorScheme: "light dark",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="id"
      className={`${cormorantGaramond.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable}`}
    >
      <body className="min-h-dvh bg-[var(--alabaster)] font-sans text-[var(--ink)] antialiased">
        {children}
      </body>
    </html>
  );
}
