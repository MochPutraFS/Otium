import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getLeaveRequestDetailById } from "@/lib/leave-request-data";
import {
  formatIndonesianDate,
  formatIndonesianDateRange,
} from "@/lib/date-utils";
import { isPositiveInt } from "@/lib/validators";

/**
 * Escaping HTML dasar agar seluruh data dari PostgreSQL aman dari injeksi HTML/XSS
 * saat dirender ke dokumen cetak Surat Cuti Resmi.
 * @param {string|number|null|undefined} value
 */
function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * GET /api/leaves/[id]/pdf
 * Menghasilkan Surat Cuti Resmi berformat cetak A4 (HTML-to-Print / Save as PDF).
 * Hanya dapat diakses oleh pemilik pengajuan atau HRD, dan khusus status `Approved`.
 */
export async function GET(_request, context) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        {
          ok: false,
          status: 401,
          error: "Sesi tidak valid. Silakan login kembali.",
        },
        { status: 401 }
      );
    }

    const resolvedParams = await context.params;
    const rawId = resolvedParams?.id;
    if (!isPositiveInt(rawId)) {
      return NextResponse.json(
        { ok: false, status: 400, error: "ID pengajuan cuti tidak valid." },
        { status: 400 }
      );
    }

    const result = await getLeaveRequestDetailById(Number(rawId), currentUser);
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, status: result.status, error: result.error },
        { status: result.status }
      );
    }

    const leave = result.request;
    const isOwner = Number(leave.userId) === Number(currentUser.id);
    const isHrd = currentUser.role === "HRD";

    if (!isOwner && !isHrd) {
      return NextResponse.json(
        {
          ok: false,
          status: 403,
          error:
            "Surat Cuti Resmi hanya dapat diunduh oleh pemohon terkait atau HRD.",
        },
        { status: 403 }
      );
    }

    if (leave.status !== "Approved") {
      return NextResponse.json(
        {
          ok: false,
          status: 400,
          error:
            "Surat Cuti Resmi hanya tersedia untuk pengajuan yang telah disetujui final (Approved).",
        },
        { status: 400 }
      );
    }

    const docYear = String(leave.submissionDate || "").slice(0, 4) || String(new Date().getFullYear());
    const docNumber = `OTM/CUTI/${docYear}/${String(leave.id).padStart(4, "0")}`;
    const periodLabel = formatIndonesianDateRange(
      leave.startDate,
      leave.endDate,
      leave.isHalfDay
    );
    const submissionDateLabel = formatIndonesianDate(leave.submissionDate);
    const isLeaderApplicant = leave.applicantRole === "Ketua Divisi";
    const workflowLabel = isLeaderApplicant
      ? "Jalur 2 — Langsung Ketua Divisi ke HRD"
      : "Jalur 1 — Berjenjang 2 Tahap (Ketua Divisi → HRD)";

    const stage1 = leave.approvals.find((a) => a.stage === 1);
    const stage2 = leave.approvals.find((a) => a.stage === 2);

    const leaderName =
      stage1?.approverName ||
      leave.leaderApproverName ||
      (isLeaderApplicant ? "Langsung ke HRD (Jalur Ketua Divisi)" : "-");
    const leaderTime = stage1?.actedAt || leave.leaderApprovedAt || "-";
    const leaderNotes = stage1?.notes || leave.leaderNotes || "-";

    const hrdName = stage2?.approverName || leave.hrdApproverName || "Tim HRD";
    const hrdTime = stage2?.actedAt || leave.hrdApprovedAt || "-";
    const hrdNotes = stage2?.notes || leave.hrdNotes || "-";

    const backHref = isHrd ? "/approvals/hrd" : "/leaves";
    const backTitle = isHrd
      ? "Kembali ke Persetujuan Final HRD"
      : "Kembali ke Riwayat Cuti";
    const issuedDateLabel = formatIndonesianDate(
      new Date().toISOString().slice(0, 10)
    );

    const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Surat Cuti Resmi ${escapeHtml(docNumber)} — Otium</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 16mm;
    }
    * {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: 24px;
      background: #F4F1EA;
      color: #191816;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 13px;
      line-height: 1.55;
      -webkit-font-smoothing: antialiased;
    }
    .mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-variant-numeric: tabular-nums;
    }
    .toolbar {
      max-width: 780px;
      margin: 0 auto 16px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 12px 16px;
      background: #FDFCFA;
      border: 1px solid #8F877A;
      border-radius: 2px;
    }
    .toolbar-note {
      font-size: 12px;
      color: #49453E;
    }
    .toolbar-actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      border-radius: 2px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      border: 1px solid #8F877A;
      background: #FDFCFA;
      color: #191816;
      text-decoration: none;
      white-space: nowrap;
      transition: background-color 140ms ease, border-color 140ms ease;
    }
    .btn:hover {
      background: #EAE4D8;
      border-color: #191816;
    }
    .btn-primary {
      background: #1A3A2F;
      border-color: #1A3A2F;
      color: #FDFCFA;
    }
    .btn-primary:hover {
      background: #122A22;
      border-color: #122A22;
    }
    .sheet {
      max-width: 780px;
      margin: 0 auto;
      background: #FDFCFA;
      border: 1px solid #8F877A;
      border-top: 3px solid #1A3A2F;
      padding: 34px 40px 30px;
      box-shadow: 0 8px 24px rgba(25, 24, 22, 0.06);
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 20px;
      border-bottom: 2px solid #1A3A2F;
      padding-bottom: 16px;
      margin-bottom: 22px;
    }
    .brand-lockup {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .brand-seal {
      width: 44px;
      height: 44px;
      flex-shrink: 0;
      display: block;
    }
    .brand {
      font-family: Georgia, "Times New Roman", serif;
      font-size: 22px;
      font-weight: 700;
      letter-spacing: 0.1em;
      line-height: 1.05;
      color: #191816;
      margin: 0;
    }
    .brand-sub {
      font-size: 10.5px;
      color: #655F56;
      margin: 3px 0 0;
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }
    .doc-meta {
      text-align: right;
    }
    .doc-title {
      font-family: Georgia, "Times New Roman", serif;
      font-size: 15.5px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: #191816;
      margin: 0;
    }
    .doc-number {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 11.5px;
      color: #49453E;
      margin: 4px 0 0;
      font-variant-numeric: tabular-nums;
    }
    .status-pill {
      display: inline-block;
      margin-top: 7px;
      padding: 3px 10px;
      border-radius: 2px;
      border: 1px solid #9CB9AE;
      background: #EBF3EF;
      color: #1A3A2F;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 10.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .section {
      margin-bottom: 18px;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .section-title {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.11em;
      color: #1A3A2F;
      border-bottom: 1px solid #D6D0C4;
      padding-bottom: 5px;
      margin: 0 0 10px;
    }
    table.info-grid {
      width: 100%;
      border-collapse: collapse;
    }
    table.info-grid th {
      width: 31%;
      text-align: left;
      padding: 5px 10px 5px 0;
      font-weight: 600;
      color: #49453E;
      vertical-align: top;
    }
    table.info-grid td {
      padding: 5px 0;
      color: #191816;
      vertical-align: top;
      word-break: break-word;
    }
    .box {
      border: 1px solid #D6D0C4;
      border-left: 3px solid #9A6B26;
      background: #FAF8F4;
      padding: 12px 14px;
      border-radius: 2px;
      break-inside: avoid;
      page-break-inside: avoid;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .signatures {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 14px;
      margin-top: 10px;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .sig-card {
      position: relative;
      border: 1px solid #D6D0C4;
      background: #FAF8F4;
      padding: 14px;
      border-radius: 2px;
      break-inside: avoid;
      page-break-inside: avoid;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .sig-card--final {
      border-color: #9CB9AE;
      background: #FDFCFA;
    }
    .sig-role {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #655F56;
    }
    .sig-name {
      margin-top: 8px;
      font-size: 13.5px;
      font-weight: 700;
      color: #191816;
    }
    .sig-time {
      margin-top: 2px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 10.5px;
      color: #49453E;
      font-variant-numeric: tabular-nums;
    }
    .sig-notes {
      margin-top: 8px;
      font-size: 11px;
      font-style: italic;
      color: #49453E;
      border-top: 1px dashed #D6D0C4;
      padding-top: 6px;
      word-break: break-word;
    }
    .ink-stamp {
      display: inline-flex;
      flex-direction: column;
      align-items: center;
      margin-top: 10px;
      padding: 4px 9px;
      border: 1.5px solid #1A3A2F;
      outline: 1px solid #1A3A2F;
      outline-offset: 2px;
      border-radius: 1px;
      color: #1A3A2F;
      background: #EBF3EF;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 9.5px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      line-height: 1.25;
      transform: rotate(-2.5deg);
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .ink-stamp small {
      font-size: 8px;
      font-weight: 600;
      letter-spacing: 0.06em;
      opacity: 0.85;
    }
    .footer-note {
      margin-top: 24px;
      padding-top: 12px;
      border-top: 1px solid #D6D0C4;
      font-size: 10.5px;
      color: #655F56;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
    }
    .footer-meta {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      white-space: nowrap;
      font-variant-numeric: tabular-nums;
    }
    @media screen and (max-width: 600px) {
      body {
        padding: 12px;
      }
      .toolbar {
        padding: 10px 12px;
      }
      .sheet {
        padding: 20px 16px;
      }
      .header {
        flex-direction: column;
        gap: 12px;
      }
      .doc-meta {
        text-align: left;
      }
      table.info-grid th {
        width: 40%;
        font-size: 12px;
      }
      table.info-grid td {
        font-size: 12.5px;
      }
      .signatures {
        grid-template-columns: 1fr;
      }
      .footer-note {
        flex-direction: column;
        align-items: flex-start;
        gap: 6px;
      }
      .footer-meta {
        white-space: normal;
      }
    }
    @media print {
      body {
        background: #FFFFFF;
        padding: 0;
      }
      .toolbar {
        display: none !important;
      }
      .sheet {
        border: 0;
        border-top: 3px solid #1A3A2F;
        box-shadow: none;
        padding: 16px 0 0;
        max-width: none;
      }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <div class="toolbar-note">
      Dokumen resmi siap cetak A4. Gunakan tombol di kanan untuk mencetak atau menyimpan sebagai PDF.
    </div>
    <div class="toolbar-actions">
      <a href="${backHref}" class="btn" title="${escapeHtml(backTitle)}">&larr; Kembali</a>
      <button type="button" class="btn btn-primary" onclick="window.print()">Cetak / Simpan PDF</button>
      <button type="button" class="btn" onclick="window.close()">Tutup</button>
    </div>
  </div>

  <main class="sheet">
    <header class="header">
      <div class="brand-lockup">
        <svg class="brand-seal" viewBox="0 0 64 64" width="44" height="44" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Logo Otium">
          <rect x="4" y="4" width="56" height="56" rx="5" fill="#FDFCFA" stroke="#1A3A2F" stroke-width="2.6" />
          <rect x="9.5" y="9.5" width="45" height="45" rx="2" stroke="#8F877A" stroke-opacity="0.45" stroke-width="1" />
          <path d="M46.5 32C46.5 40.0081 40.0081 46.5 32 46.5C23.9919 46.5 17.5 40.0081 17.5 32C17.5 23.9919 23.9919 17.5 32 17.5" stroke="#1A3A2F" stroke-width="5.4" stroke-linecap="butt" />
          <rect x="35.5" y="15" width="13.5" height="13.5" rx="1.5" fill="#9A6B26" />
          <line x1="25" y1="32" x2="39" y2="32" stroke="#1A3A2F" stroke-width="2.2" />
          <line x1="32" y1="25" x2="32" y2="39" stroke="#1A3A2F" stroke-width="2.2" />
        </svg>
        <div>
          <h1 class="brand">OTIUM</h1>
          <p class="brand-sub">Sistem Manajemen Cuti Karyawan</p>
        </div>
      </div>
      <div class="doc-meta">
        <p class="doc-title">Surat Persetujuan Cuti Resmi</p>
        <p class="doc-number">No. ${escapeHtml(docNumber)}</p>
        <span class="status-pill">Disetujui Final (Approved)</span>
      </div>
    </header>

    <section class="section">
      <h2 class="section-title">01 &bull; Identitas Pemohon</h2>
      <table class="info-grid">
        <tr>
          <th>Nama Lengkap</th>
          <td><strong>${escapeHtml(leave.applicantName)}</strong></td>
        </tr>
        <tr>
          <th>Peran / Jabatan</th>
          <td>${escapeHtml(leave.applicantRole)}</td>
        </tr>
        <tr>
          <th>Divisi</th>
          <td>${escapeHtml(leave.divisionName || "-")}</td>
        </tr>
        <tr>
          <th>Email / Username</th>
          <td class="mono">${escapeHtml(leave.applicantEmail || "-")}${leave.applicantUsername ? ` (${escapeHtml(leave.applicantUsername)})` : ""}</td>
        </tr>
        <tr>
          <th>Jalur Persetujuan</th>
          <td>${escapeHtml(workflowLabel)}</td>
        </tr>
      </table>
    </section>

    <section class="section">
      <h2 class="section-title">02 &bull; Rincian Pengajuan Cuti</h2>
      <table class="info-grid">
        <tr>
          <th>Jenis Cuti</th>
          <td><strong>${escapeHtml(leave.leaveTypeName)}</strong> <span class="mono">(${escapeHtml(leave.leaveTypeCode)})</span></td>
        </tr>
        <tr>
          <th>Periode Cuti</th>
          <td>${escapeHtml(periodLabel)}${leave.isHalfDay ? " (Setengah Hari)" : ""}</td>
        </tr>
        <tr>
          <th>Durasi Efektif</th>
          <td class="mono"><strong>${escapeHtml(Number(leave.totalDays).toFixed(1))} Hari Kerja</strong></td>
        </tr>
        <tr>
          <th>Tanggal Pengajuan</th>
          <td>${escapeHtml(submissionDateLabel)}</td>
        </tr>
        <tr>
          <th>Alasan Cuti</th>
          <td>${escapeHtml(leave.reason)}</td>
        </tr>
        <tr>
          <th>Alamat Selama Cuti</th>
          <td>${escapeHtml(leave.leaveAddress || "-")}</td>
        </tr>
        <tr>
          <th>Nomor Darurat</th>
          <td class="mono">${escapeHtml(leave.emergencyPhone || "-")}</td>
        </tr>
      </table>
    </section>

    <section class="section">
      <h2 class="section-title">03 &bull; Serah Terima Tugas (Handover)</h2>
      <div class="box">
        <div><strong>Rekan Pengganti:</strong> ${escapeHtml(leave.handoverUserName || "-")}</div>
        <div style="margin-top: 6px;"><strong>Catatan Tugas:</strong> ${escapeHtml(leave.handoverNotes || "-")}</div>
      </div>
    </section>

    <section class="section">
      <h2 class="section-title">04 &bull; Jejak Persetujuan Digital</h2>
      <div class="signatures">
        <div class="sig-card">
          <div class="sig-role">Verifikasi Tahap 1 — Ketua Divisi</div>
          <div class="sig-name">${escapeHtml(leaderName)}</div>
          <div class="sig-time">${isLeaderApplicant ? "Bypass sesuai alur Ketua Divisi" : `Disetujui: ${escapeHtml(leaderTime)}`}</div>
          ${!isLeaderApplicant ? `<div class="sig-notes">Catatan: ${escapeHtml(leaderNotes)}</div>` : ""}
        </div>
        <div class="sig-card sig-card--final">
          <div class="sig-role">Persetujuan Final — HRD</div>
          <div class="sig-name">${escapeHtml(hrdName)}</div>
          <div class="sig-time">Disetujui: ${escapeHtml(hrdTime)}</div>
          <div class="sig-notes">Catatan: ${escapeHtml(hrdNotes)}</div>
          <div class="ink-stamp" aria-label="Stempel digital disetujui final oleh HRD">
            <span>DISETUJUI FINAL</span>
            <small>VERIFIED &bull; OTIUM HRD</small>
          </div>
        </div>
      </div>
    </section>

    <footer class="footer-note">
      <span>Dokumen diterbitkan secara elektronik oleh Otium dan sah tanpa tanda tangan basah.</span>
      <span class="footer-meta">Terbit: ${escapeHtml(issuedDateLabel)} &bull; ID #${escapeHtml(leave.id)}</span>
    </footer>
  </main>
</body>
</html>`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("GET /api/leaves/[id]/pdf error:", error);
    return NextResponse.json(
      {
        ok: false,
        status: 500,
        error: "Gagal menghasilkan Surat Cuti Resmi.",
      },
      { status: 500 }
    );
  }
}
