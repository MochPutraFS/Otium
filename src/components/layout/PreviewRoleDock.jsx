"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, Eye } from "lucide-react";
import { PREVIEW_ROLE_OPTIONS } from "@/lib/mock-dashboard-data";

// Panel kecil mengambang di pojok kanan bawah untuk ganti-ganti role saat cek UI.
// Nanti dihapus setelah login backend aktif.
export default function PreviewRoleDock({ previewRoleKey = "karyawan" }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMinimized, setIsMinimized] = useState(false);

  const activeOption =
    PREVIEW_ROLE_OPTIONS.find((opt) => opt.key === previewRoleKey) ||
    PREVIEW_ROLE_OPTIONS[1];

  function handleSelectRole(nextRoleKey) {
    router.replace(`${pathname}?role=${nextRoleKey}`);
  }

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-40">
        <button
          type="button"
          onClick={() => setIsMinimized(false)}
          title="Buka Pratinjau Role UI"
          className="flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-900/95 px-3.5 py-2 text-xs font-semibold text-white shadow-lg shadow-slate-950/30 backdrop-blur transition hover:bg-slate-800"
        >
          <Eye className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />
          <span>UI: {activeOption.label}</span>
        </button>
      </div>
    );
  }

  return (
    <aside
      aria-label="Mode Pratinjau Role UI"
      className="fixed bottom-4 right-4 z-40 max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-700/80 bg-slate-900/95 p-2.5 text-white shadow-2xl shadow-slate-950/40 backdrop-blur"
    >
      <div className="flex items-center justify-between gap-4 px-1 pb-2">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-sky-300">
          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Pratinjau Role UI</span>
        </div>
        <button
          type="button"
          onClick={() => setIsMinimized(true)}
          aria-label="Sembunyikan dock pratinjau"
          title="Minimize"
          className="rounded-md p-1 text-slate-400 transition hover:bg-white/10 hover:text-white"
        >
          <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-1">
        {PREVIEW_ROLE_OPTIONS.map((option) => {
          const active = option.key === previewRoleKey;
          return (
            <button
              key={option.key}
              type="button"
              onClick={() => handleSelectRole(option.key)}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                active
                  ? "bg-blue-600 text-white shadow-sm ring-1 ring-sky-300/30"
                  : "bg-white/5 text-slate-300 hover:bg-white/15 hover:text-white"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </aside>
  );
}
