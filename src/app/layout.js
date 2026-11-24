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

const THEME_INIT_SCRIPT = `
(function() {
  var root = document.documentElement;
  try {
    var saved = window.localStorage.getItem("otium-color-scheme");
    var prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (saved === "dark") {
      root.style.colorScheme = "dark";
      root.dataset.theme = "dark";
      root.style.backgroundColor = "#141311";
    } else if (saved === "system") {
      root.style.colorScheme = "light dark";
      root.dataset.theme = "system";
      root.style.backgroundColor = prefersDark ? "#141311" : "#F4F1EA";
    } else {
      root.style.colorScheme = "light";
      root.dataset.theme = "light";
      root.style.backgroundColor = "#F4F1EA";
    }
  } catch (e) {
    root.style.colorScheme = "light";
    root.dataset.theme = "light";
    root.style.backgroundColor = "#F4F1EA";
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
