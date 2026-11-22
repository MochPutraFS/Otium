"use client";

import { useEffect, useState } from "react";

const WORKFLOW_CELLS = [
  {
    addr: "A1",
    col: 0,
    row: 0,
    step: "01 • PEMOHON",
    title: "Pengajuan & Simulasi Kuota",
    desc: "Validasi H-3, bebas akhir pekan & libur nasional, catatan handover",
    state: "PENDING",
    fx: 'fx = SUBMIT(Pemohon, "Tahunan", 2.0hr, H-3)',
  },
  {
    addr: "B1",
    col: 1,
    row: 0,
    step: "02 • KETUA DIVISI",
    title: "Paraf Atasan Langsung",
    desc: "Verifikasi serah terima tugas dan kesinambungan operasional divisi",
    state: "APPROVED BY LEADER",
    fx: 'fx = LEADER_PARAF(Atasan, handover="OK")',
  },
  {
    addr: "A2",
    col: 0,
    row: 1,
    step: "03 • HRD FINAL",
    title: "Otorisasi & Saldo Kuota",
    desc: "Persetujuan final atomik, multi-approve & audit riwayat cuti",
    state: "APPROVED",
    fx: 'fx = HRD_FINAL(HRD, transaksi="ATOMIC")',
  },
  {
    addr: "B2",
    col: 1,
    row: 1,
    step: "04 • ARSIP RESMI",
    title: "Surat Persetujuan PDF",
    desc: "Lembar edaran berparaf lengkap & cap stempel persetujuan resmi",
    state: "PDF READY",
    fx: 'fx = EXPORT_PDF("OTIUM/HRD/2026/ARSIP")',
  },
];

/**
 * Panel kiri Halaman Login bergaya Swiss Arch Atelier:
 * - Logo Otium asli (/images/otium-logo.svg) pada header dan bingkai lengkung arsitektural
 * - Interactive Workflow Formula Sheet (grid 2x2 dengan kursor sel aktif, formula bar, & Pause/Play)
 */
export default function LoginBrandPanel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [tickKey, setTickKey] = useState(0);

  // Hormati preferensi sistem prefers-reduced-motion saat mount
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setIsPlaying(false);
    }
  }, []);

  // Auto-cycle kursor formula sheet setiap 2.2 detik saat isPlaying aktif
  useEffect(() => {
    if (!isPlaying) return undefined;

    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % WORKFLOW_CELLS.length);
      setTickKey((prev) => prev + 1);
    }, 2200);

    return () => clearInterval(timer);
  }, [isPlaying]);

  const activeStep = WORKFLOW_CELLS[activeIndex];

  function handleSelectStep(idx) {
    setActiveIndex(idx);
    setTickKey((prev) => prev + 1);
  }

  return (
    <aside
      aria-label="Informasi Portal Otium"
      className="arch-grid-bg relative hidden flex-col justify-between gap-6 border-r border-[var(--rule-strong)] px-10 py-8 text-[var(--ink)] lg:flex xl:px-12"
    >
      {/* Baris Identitas Brand (Logo Otium Asli) */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[2px] border border-[var(--rule-strong)] bg-[var(--paper-pure)] p-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/otium-logo.svg"
              alt="Logo Otium"
              className="h-full w-full object-contain"
            />
          </div>
          <div>
            <div className="font-serif text-2xl font-bold leading-none tracking-[0.08em] text-[var(--ink)]">
              OTIUM
            </div>
            <div className="mt-0.5 font-mono text-[10px] tracking-[0.07em] text-[var(--ink-muted)]">
              LAT. ŌTIUM &bull; RESTORATIVE TIME
            </div>
          </div>
        </div>

        <span className="font-mono text-[11px] text-[var(--ink-muted)]">
          REG. {new Date().getFullYear()}
        </span>
      </div>

      {/* Swiss Arch Frame dengan Logo Otium Asli + Pernyataan Editorial */}
      <div className="flex items-center gap-6 border-b border-[var(--rule)] pb-6">
        <div className="arch-frame" aria-hidden="true">
          <div className="flex flex-col items-center gap-2 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/otium-logo.svg"
              alt=""
              className="h-14 w-14 object-contain"
            />
            <span className="h-px w-9 bg-[var(--rule-strong)]" />
            <span className="font-mono text-[9.5px] tracking-[0.14em] text-[var(--ink-muted)]">
              NO. {new Date().getFullYear()}
            </span>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.09em] text-[var(--spruce)]">
            Ōtium &mdash; Waktu Rehat Teratur
          </span>
          <h1 className="mt-1.5 mb-2 font-serif text-[34px] font-semibold leading-[1.06] text-[var(--ink)] xl:text-[38px]">
            Ketertiban Waktu &amp; Arsip Cuti.
          </h1>
          <p className="m-0 text-[13px] leading-relaxed text-[var(--ink-soft)]">
            Saldo kuota presisi <span className="mono font-medium">0.5</span>{" "}
            hari kerja, lembar edaran paraf berjenjang, dan arsip persetujuan
            cuti terpadu.
          </p>
        </div>
      </div>

      {/* Interactive Workflow Formula Sheet (Kursor Sel Aktif + Formula Bar) */}
      <div className="wf-sheet" aria-label="Simulasi Alur Kerja Cuti Otium">
        <div className="wf-formula-bar">
          <span className="wf-addr">{activeStep.addr}</span>
          <span key={tickKey} className="wf-fx tick-anim">
            {activeStep.fx}
          </span>
          <button
            type="button"
            className="wf-toggle"
            onClick={() => setIsPlaying((prev) => !prev)}
            aria-pressed={!isPlaying}
          >
            {isPlaying ? "Pause" : "Play"}
          </button>
        </div>

        <div className="wf-col-heads" aria-hidden="true">
          <div />
          <div>A</div>
          <div>B</div>
        </div>

        <div className="wf-body">
          <div className="wf-row-heads" aria-hidden="true">
            <div>01</div>
            <div>02</div>
          </div>

          <div className="wf-grid-wrap">
            <div
              className="wf-cursor"
              style={{
                "--col": activeStep.col,
                "--row": activeStep.row,
              }}
              aria-hidden="true"
            />
            {WORKFLOW_CELLS.map((cell, idx) => {
              const isActive = idx === activeIndex;
              return (
                <button
                  key={cell.addr}
                  type="button"
                  onClick={() => handleSelectStep(idx)}
                  aria-current={isActive ? "step" : undefined}
                  className={`wf-cell ${isActive ? "is-active" : ""}`}
                >
                  <div className="wf-cell-step">{cell.step}</div>
                  <div className="wf-cell-title">{cell.title}</div>
                  <div className="wf-cell-desc">{cell.desc}</div>
                  <div className="wf-cell-state">{cell.state}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Colophon Footer */}
      <div className="flex items-center justify-between border-t border-[var(--rule-strong)] pt-3 font-mono text-[11px] text-[var(--ink-muted)]">
        <span>ARSIP DIGITAL &bull; SISTEM CUTI</span>
        <span>4 LEVEL AKSES</span>
      </div>
    </aside>
  );
}
