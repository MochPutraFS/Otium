import {
  CalendarClock,
  CheckCircle2,
  ShieldCheck,
  Users,
} from "lucide-react";

const FEATURE_HIGHLIGHTS = [
  {
    icon: CalendarClock,
    title: "Kalkulasi Hari Kerja & Cuti 0.5 Hari",
    description:
      "Otomatis mengecualikan akhir pekan serta hari libur nasional dengan dukungan kuota desimal realtime.",
  },
  {
    icon: CheckCircle2,
    title: "Persetujuan Berjenjang 2 Tahap",
    description:
      "Alur verifikasi transparan dari Ketua Divisi ke HRD lengkap dengan catatan keputusan & auto-refund kuota.",
  },
  {
    icon: Users,
    title: "Serah Terima Rekan Pengganti",
    description:
      "Penunjukan rekan handover satu divisi beserta notifikasi internal otomatis agar pekerjaan tetap lancar.",
  },
];

const SYSTEM_ROLES = ["Admin", "Karyawan", "Ketua Divisi", "HRD"];

/**
 * Panel branding sisi kiri pada layout split-screen halaman Login (Desktop lg+).
 * Menampilkan logo Otium (Variasi 3C), filosofi singkat, keunggulan sistem, dan 4 peran otomatis.
 */
export default function LoginBrandPanel() {
  return (
    <section
      aria-label="Informasi Portal Otium"
      className="relative hidden overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-blue-800 p-10 text-white lg:col-span-5 lg:flex lg:flex-col lg:justify-between xl:col-span-5 xl:p-12"
    >
      {/* Aksen cahaya latar belakang yang lembut dan tenang */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-sky-400/15 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-28 -left-24 h-80 w-80 rounded-full bg-indigo-400/20 blur-3xl"
      />

      {/* Header Logo & Identitas Otium */}
      <div className="relative z-10">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center">
            <img
              src="/images/otium-logo.png"
              alt="Logo Otium"
              className="h-11 w-11 object-contain drop-shadow-sm"
            />
          </div>
          <div>
            <span className="block text-2xl font-bold tracking-tight text-white">
              Otium
            </span>
            <span className="block text-xs font-medium tracking-wide text-sky-200/90">
              Sistem Manajemen Cuti Karyawan
            </span>
          </div>
        </div>

        {/* Tagline & Deskripsi Filosofis */}
        <div className="mt-10">
          <p className="inline-flex items-center gap-1.5 rounded-full border border-sky-300/25 bg-sky-400/10 px-3 py-1 text-xs font-medium text-sky-200">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Portal Internal Perusahaan
          </p>
          <h2 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-white">
            Kelola waktu istirahat dengan tenang dan terukur.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">
            Terinspirasi dari istilah Latin <em>otium</em> — waktu luang dan
            ketenangan diri — portal ini menyederhanakan pengajuan, verifikasi,
            serta pemantauan kuota cuti seluruh divisi dalam satu pintu.
          </p>
        </div>

        {/* Daftar Keunggulan Sistem */}
        <ul className="mt-8 space-y-4">
          {FEATURE_HIGHLIGHTS.map((item) => {
            const Icon = item.icon;
            return (
              <li
                key={item.title}
                className="flex items-start gap-3.5 rounded-xl border border-white/10 bg-white/5 p-3.5 backdrop-blur-sm"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-400/15 text-sky-300">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    {item.title}
                  </h3>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-300">
                    {item.description}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Footer Panel: Badge 4 Role & Copyright */}
      <div className="relative z-10 mt-10 border-t border-white/10 pt-6">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
          Deteksi Akses Otomatis 4 Peran
        </p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {SYSTEM_ROLES.map((role) => (
            <span
              key={role}
              className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-slate-100"
            >
              {role}
            </span>
          ))}
        </div>
        <p className="mt-5 text-xs text-slate-400">
          &copy; {new Date().getFullYear()} Otium &mdash; Sistem Manajemen Cuti
          Karyawan.
        </p>
      </div>
    </section>
  );
}
