import { ArrowRight } from "lucide-react";

const WORKFLOW_STEPS = [
  {
    step: "01",
    title: "Pengajuan & Handover",
    detail: "Dukungan cuti 0.5 hari kerja, bebas akhir pekan & libur nasional, serta pelimpahan tugas rekan satu divisi.",
  },
  {
    step: "02",
    title: "Verifikasi Ketua Divisi",
    detail: "Peninjauan beban kerja tim oleh atasan langsung lengkap dengan catatan verifikasi terstruktur.",
  },
  {
    step: "03",
    title: "Persetujuan Final HRD",
    detail: "Keputusan akhir terpusat dengan pemotongan saldo atomik serta auto-refund kuota bila ditolak atau dibatalkan.",
  },
];

const SYSTEM_ROLES = ["Admin", "Karyawan", "Ketua Divisi", "HRD"];

/**
 * Panel branding editorial sisi kiri (Opsi A — Warm Alabaster & Ink Editorial).
 * Menggantikan pola gradient gelap generik dengan grid arsitektural tenang dan diagram alur domain Otium.
 */
export default function LoginBrandPanel() {
  return (
    <aside
      aria-label="Informasi Portal Otium"
      className="otium-architectural-grid relative hidden flex-col justify-between border-r border-stone-300/80 p-10 text-slate-900 lg:col-span-5 lg:flex xl:p-14"
    >
      {/* Baris Identitas Brand */}
      <div className="flex items-center justify-between gap-4 border-b border-stone-300/80 pb-6">
        <div className="flex items-center gap-3">
          <img
            src="/images/otium-logo.png"
            alt="Logo Otium"
            className="h-9 w-9 shrink-0 object-contain"
          />
          <div>
            <span className="block text-lg font-bold leading-none tracking-tight text-slate-950">
              Otium
            </span>
            <span className="mt-1 block text-[11px] font-medium uppercase tracking-[0.14em] text-slate-600">
              Leave Management Portal
            </span>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-full border border-stone-300 bg-white/80 px-2.5 py-1 text-[11px] font-medium text-slate-700">
          <span
            className="h-1.5 w-1.5 rounded-full bg-emerald-600"
            aria-hidden="true"
          />
          Portal Internal
        </span>
      </div>

      {/* Pernyataan Editorial & Diagram Alur Persetujuan 2-Tahap */}
      <div className="my-10 space-y-8">
        <div className="max-w-md">
          <h2 className="text-[2rem] font-semibold leading-[1.16] tracking-[-0.025em] text-slate-950">
            Waktu istirahat yang terencana, alur kerja yang tetap terjaga.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-slate-600">
            Terinspirasi dari konsep Latin{" "}
            <em className="font-medium text-slate-800">otium</em> — ketenangan
            dan waktu luang yang bermakna — seluruh proses pengajuan,
            verifikasi, dan kuota cuti terhimpun dalam satu pintu.
          </p>
        </div>

        {/* Kartu Ledger Alur Persetujuan (Domain-Authentic, Swiss Hairline Grid) */}
        <div className="overflow-hidden rounded-xl border border-stone-300/90 bg-white/90">
          <div className="flex items-center justify-between border-b border-stone-200 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-700">
            <span>Alur Persetujuan Berjenjang</span>
            <span className="font-mono text-slate-600">2-STAGE</span>
          </div>

          <ol className="divide-y divide-stone-200/90">
            {WORKFLOW_STEPS.map((item) => (
              <li key={item.step} className="flex items-start gap-3.5 px-4 py-3.5">
                <span className="mt-0.5 font-mono text-xs font-semibold text-blue-700">
                  {item.step}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">
                    {item.title}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                    {item.detail}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* Colophon Footer: 4 Peran Otomatis & Copyright */}
      <div className="border-t border-stone-300/80 pt-5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-slate-700">
          <span className="text-slate-600">Deteksi peran otomatis</span>
          <ArrowRight className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
          {SYSTEM_ROLES.map((role, index) => (
            <span key={role} className="inline-flex items-center gap-2">
              <span>{role}</span>
              {index < SYSTEM_ROLES.length - 1 && (
                <span className="text-stone-500" aria-hidden="true">
                  /
                </span>
              )}
            </span>
          ))}
        </div>

        <p className="mt-3 text-xs text-slate-600">
          &copy; {new Date().getFullYear()} Otium &mdash; Sistem Manajemen Cuti
          Karyawan.
        </p>
      </div>
    </aside>
  );
}
