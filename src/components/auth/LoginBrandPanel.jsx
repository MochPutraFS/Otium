import { Check, FileCheck2, ShieldCheck } from "lucide-react";
import QuotaPrecisionRuler from "@/components/ui/QuotaPrecisionRuler";

const ROUTING_STEPS = [
  {
    code: "01",
    role: "Pemohon",
    status: "Diajukan",
    detail: "Validasi H-3, hari kerja & rekan pengganti",
    tone: "spruce",
  },
  {
    code: "02",
    role: "Ketua Divisi",
    status: "Paraf Tahap 1",
    detail: "Verifikasi operasional & serah terima tugas",
    tone: "spruce",
  },
  {
    code: "03",
    role: "HRD Final",
    status: "Disetujui",
    detail: "Otorisasi atomik & Surat Cuti PDF resmi",
    tone: "ochre",
  },
];

/**
 * Panel kiri Halaman Login — Opsi A (Editorial Split Archival).
 * Menampilkan identitas Otium tunggal (Logo Otium asli), pernyataan editorial,
 * dan Specimen Arsip nyata (12-Day Precision Ruler + Mini Routing Slip 3 Tahap)
 * yang selaras penuh dengan tampilan dashboard & persetujuan Otium.
 */
export default function LoginBrandPanel() {
  const year = new Date().getFullYear();

  return (
    <aside
      aria-label="Informasi Portal Otium"
      className="arch-grid-bg relative hidden flex-col justify-between gap-8 border-r border-[var(--rule-strong)] px-10 py-9 text-[var(--ink)] lg:flex xl:px-14"
    >
      {/* Header Identitas Tunggal (Logo Otium Asli) */}
      <div className="flex items-center justify-between gap-4 border-b border-[var(--rule)] pb-5">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[4px] border border-[var(--rule-strong)] bg-[var(--paper-pure)] p-2 shadow-[var(--shadow-sm)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/otium-logo.svg"
              alt="Logo Otium"
              className="h-full w-full object-contain"
            />
          </div>
          <div>
            <div className="font-serif text-[26px] font-bold leading-none tracking-[0.08em] text-[var(--ink)]">
              OTIUM
            </div>
            <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--ink-muted)]">
              LAT. ŌTIUM &bull; RESTORATIVE TIME
            </div>
          </div>
        </div>

        <span className="tag font-mono text-[10.5px]">ARSIP {year}</span>
      </div>

      {/* Konten Utama: Editorial Hero + Specimen Arsip */}
      <div className="my-auto space-y-7">
        {/* Pernyataan Editorial */}
        <div>
          <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--spruce)]">
            SISTEM MANAJEMEN CUTI KARYAWAN
          </p>
          <h1 className="mt-2 font-serif text-[38px] font-semibold leading-[1.06] tracking-[-0.015em] text-[var(--ink)] xl:text-[42px]">
            Ketertiban Waktu &amp; Arsip Cuti.
          </h1>
          <p className="mt-3 max-w-lg text-[13.5px] leading-relaxed text-[var(--ink-soft)]">
            Pencatatan kuota tahunan presisi{" "}
            <span className="font-mono font-semibold text-[var(--ink)]">
              0.5
            </span>{" "}
            hari kerja, lembar edaran paraf berjenjang, dan penerbitan surat
            persetujuan cuti terpadu dalam satu arsip.
          </p>
        </div>

        {/* Archival Specimen Card — Bahasa Visual Nyata Otium */}
        <div
          aria-label="Pratinjau arsip kuota dan lembar edaran paraf Otium"
          className="overflow-hidden rounded-[4px] border border-[var(--rule-strong)] bg-[var(--paper-pure)] shadow-[var(--shadow-sm)]"
        >
          {/* Kop Specimen */}
          <div className="flex items-center justify-between border-b border-[var(--rule)] bg-[var(--alabaster)] px-4 py-2.5">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-muted)]">
              SPESIMEN LEDGER &bull; SKALA KUOTA &amp; PARAF
            </span>
            <span className="font-mono text-[10px] font-semibold text-[var(--spruce)]">
              PRESISI 0.5 HR
            </span>
          </div>

          {/* Bagian 1: Mini 12-Day Precision Ruler */}
          <div className="border-b border-[var(--rule)] px-5 py-4">
            <div className="flex items-baseline justify-between gap-3">
              <div>
                <p className="text-[11.5px] font-semibold text-[var(--ink-soft)]">
                  Skala Kuota Tahunan (12 Hari Kerja)
                </p>
                <p className="mt-0.5 text-[11px] text-[var(--ink-muted)]">
                  Akhir pekan &amp; hari libur nasional otomatis dikecualikan
                </p>
              </div>
              <p className="font-serif text-[26px] font-semibold leading-none tabular-nums text-[var(--ink)]">
                7.5{" "}
                <span className="font-mono text-[11px] font-normal text-[var(--ink-muted)]">
                  / 12.0 hr
                </span>
              </p>
            </div>

            <div className="mt-3">
              <QuotaPrecisionRuler total={12} remaining={9} delta={1.5} />
            </div>

            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10px] text-[var(--ink-muted)]">
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="inline-block h-2 w-2 rounded-[1px] bg-[var(--spruce)]"
                  aria-hidden="true"
                />
                Saldo Tersedia (7.5 hr)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="inline-block h-2 w-2 rounded-[1px] border border-[var(--ochre)] bg-[var(--ochre-tint)]"
                  aria-hidden="true"
                />
                Simulasi Pengajuan (1.5 hr)
              </span>
            </div>
          </div>

          {/* Bagian 2: Mini Routing Slip 3 Tahap */}
          <div className="grid grid-cols-3 divide-x divide-[var(--rule)] bg-[var(--paper)]">
            {ROUTING_STEPS.map((step) => (
              <div key={step.code} className="p-3.5">
                <div className="flex items-center justify-between gap-1">
                  <span className="font-mono text-[10px] font-semibold text-[var(--ink-muted)]">
                    {step.code}
                  </span>
                  <span
                    className={`inline-flex h-4 w-4 items-center justify-center rounded-full border ${
                      step.tone === "spruce"
                        ? "border-[var(--spruce-border)] bg-[var(--spruce-tint)] text-[var(--spruce)]"
                        : "border-[var(--ochre-border)] bg-[var(--ochre-tint)] text-[var(--ochre)]"
                    }`}
                    aria-hidden="true"
                  >
                    <Check className="h-2.5 w-2.5" />
                  </span>
                </div>
                <p className="mt-1.5 text-[12px] font-semibold text-[var(--ink)]">
                  {step.role}
                </p>
                <p className="mt-0.5 text-[11px] leading-snug text-[var(--ink-muted)]">
                  {step.detail}
                </p>
                <p
                  className={`mt-2 font-mono text-[9.5px] font-semibold uppercase tracking-[0.06em] ${
                    step.tone === "spruce"
                      ? "text-[var(--spruce)]"
                      : "text-[var(--ochre)]"
                  }`}
                >
                  {step.status}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Colophon Footer */}
      <div className="flex items-center justify-between gap-4 border-t border-[var(--rule-strong)] pt-3.5 font-mono text-[10.5px] text-[var(--ink-muted)]">
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck
            className="h-3.5 w-3.5 text-[var(--spruce)]"
            aria-hidden="true"
          />
          TRANSAKSI KUOTA ATOMIK
        </span>
        <span className="inline-flex items-center gap-1.5">
          <FileCheck2
            className="h-3.5 w-3.5 text-[var(--spruce)]"
            aria-hidden="true"
          />
          SURAT CUTI PDF RESMI
        </span>
      </div>
    </aside>
  );
}
