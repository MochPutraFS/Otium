"use client";

import { useEffect, useState } from "react";

const THEME_MODES = [
  { id: "light", scheme: "light", icon: "☀", label: "Terang" },
  { id: "dark", scheme: "dark", icon: "☾", label: "Gelap" },
  { id: "system", scheme: "light dark", icon: "◐", label: "Sistem" },
];

const THEME_STORAGE_KEY = "otium-color-scheme";

/**
 * Tombol switch mode tema Swiss Archival (Terang / Gelap / Sistem).
 * Tersinkronisasi dengan `localStorage["otium-color-scheme"]`, `root.style.colorScheme`,
 * dan `root.dataset.theme` yang sama dengan TopNavbar.
 */
export default function ThemeToggleButton({ className = "" }) {
  const [themeIndex, setThemeIndex] = useState(0);

  useEffect(() => {
    function syncThemeFromClient() {
      try {
        const saved =
          document.documentElement.dataset.theme ||
          window.localStorage.getItem(THEME_STORAGE_KEY);
        const foundIdx = THEME_MODES.findIndex((m) => m.id === saved);
        const activeIdx = foundIdx >= 0 ? foundIdx : 0;
        setThemeIndex(activeIdx);
        document.documentElement.style.colorScheme =
          THEME_MODES[activeIdx].scheme;
        document.documentElement.dataset.theme = THEME_MODES[activeIdx].id;
      } catch {
        setThemeIndex(0);
        document.documentElement.style.colorScheme = "light";
        document.documentElement.dataset.theme = "light";
      } finally {
        document.documentElement.style.removeProperty("background-color");
      }
    }

    syncThemeFromClient();

    function handleStorage(event) {
      if (event.key === THEME_STORAGE_KEY) {
        const foundIdx = THEME_MODES.findIndex((m) => m.id === event.newValue);
        const activeIdx = foundIdx >= 0 ? foundIdx : 0;
        setThemeIndex(activeIdx);
        document.documentElement.style.colorScheme =
          THEME_MODES[activeIdx].scheme;
        document.documentElement.dataset.theme = THEME_MODES[activeIdx].id;
      }
    }

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  function handleCycleTheme() {
    const nextIdx = (themeIndex + 1) % THEME_MODES.length;
    const nextMode = THEME_MODES[nextIdx];
    setThemeIndex(nextIdx);
    document.documentElement.style.colorScheme = nextMode.scheme;
    document.documentElement.dataset.theme = nextMode.id;
    document.documentElement.style.removeProperty("background-color");
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextMode.id);
    } catch {
      // Abaikan jika localStorage diblokir
    }
  }

  const current = THEME_MODES[themeIndex];

  return (
    <button
      type="button"
      onClick={handleCycleTheme}
      title={`Mode tema: ${current.label} (klik untuk ganti)`}
      aria-label={`Ganti mode tema, saat ini ${current.label}`}
      className={`btn btn-sm !gap-1.5 font-mono text-[11px] ${className}`.trim()}
    >
      <span aria-hidden="true" className="text-[13px] leading-none">
        {current.icon}
      </span>
      <span>{current.label}</span>
    </button>
  );
}
