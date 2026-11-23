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
  colorScheme: "light",
};

const THEME_INIT_SCRIPT = `
(function() {
  try {
    var saved = window.localStorage.getItem("otium-color-scheme");
    var root = document.documentElement;
    if (saved === "dark") {
      root.style.colorScheme = "dark";
      root.dataset.theme = "dark";
    } else if (saved === "system") {
      root.style.colorScheme = "light dark";
      root.dataset.theme = "system";
    } else {
      root.style.colorScheme = "light";
      root.dataset.theme = "light";
    }
  } catch (e) {
    document.documentElement.style.colorScheme = "light";
    document.documentElement.dataset.theme = "light";
  }
})();
`;

export default function RootLayout({ children }) {
  return (
    <html
      lang="id"
      suppressHydrationWarning
      className={`${cormorantGaramond.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-dvh bg-[var(--alabaster)] font-sans text-[var(--ink)] antialiased">
        {children}
      </body>
    </html>
  );
}
