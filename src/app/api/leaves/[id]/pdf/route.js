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

    const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Surat Cuti Resmi ${escapeHtml(docNumber)} — Otium</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 18mm;
    }
    * {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: 24px;
      background: #f4f2ec;
      color: #0f172a;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 13px;
      line-height: 1.55;
    }
    .toolbar {
      max-width: 780px;
      margin: 0 auto 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 12px 16px;
      background: #ffffff;
      border: 1px solid #e7e5e4;
      border-radius: 10px;
    }
    .toolbar-note {
      font-size: 12px;
      color: #475569;
    }
    .toolbar-actions {
      display: flex;
      gap: 8px;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      border: 1px solid #d6d3d1;
      background: #ffffff;
      color: #0f172a;
      text-decoration: none;
    }
    .btn-primary {
      background: #0f172a;
      border-color: #0f172a;
      color: #ffffff;
    }
    .sheet {
      max-width: 780px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #d6d3d1;
      padding: 36px 40px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .brand {
      font-size: 20px;
      font-weight: 800;
      letter-spacing: -0.02em;
      margin: 0;
    }
    .brand-sub {
      font-size: 11px;
      color: #64748b;
      margin-top: 2px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .doc-meta {
      text-align: right;
    }
    .doc-title {
      font-size: 15px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      margin: 0;
    }
    .doc-number {
      font-size: 12px;
      color: #475569;
      margin-top: 3px;
      font-variant-numeric: tabular-nums;
    }
    .status-pill {
      display: inline-block;
      margin-top: 6px;
      padding: 2px 10px;
      border-radius: 999px;
      border: 1px solid #a7f3d0;
      background: #ecfdf5;
      color: #065f46;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .section {
      margin-bottom: 20px;
    }
    .section-title {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #64748b;
      border-bottom: 1px solid #e7e5e4;
      padding-bottom: 5px;
      margin: 0 0 10px;
    }
    table.info-grid {
      width: 100%;
      border-collapse: collapse;
    }
    table.info-grid th {
      width: 32%;
      text-align: left;
      padding: 5px 8px 5px 0;
      font-weight: 600;
      color: #475569;
      vertical-align: top;
    }
    table.info-grid td {
      padding: 5px 0;
      color: #0f172a;
      vertical-align: top;
    }
    .box {
      border: 1px solid #e7e5e4;
      background: #faf9f6;
      padding: 12px 14px;
      border-radius: 6px;
    }
    .signatures {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      margin-top: 24px;
    }
    .sig-card {
      border: 1px solid #e7e5e4;
      padding: 14px;
      border-radius: 6px;
    }
    .sig-role {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #64748b;
    }
    .sig-name {
      margin-top: 8px;
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
    }
    .sig-time {
      margin-top: 2px;
      font-size: 11px;
      color: #475569;
      font-variant-numeric: tabular-nums;
    }
    .sig-notes {
      margin-top: 8px;
      font-size: 11px;
      font-style: italic;
      color: #334155;
      border-top: 1px dashed #d6d3d1;
      padding-top: 6px;
    }
    .footer-note {
      margin-top: 28px;
      padding-top: 12px;
      border-top: 1px solid #e7e5e4;
      font-size: 11px;
      color: #64748b;
      display: flex;
      justify-content: space-between;
    }
    @media print {
      body {
        background: #ffffff;
        padding: 0;
      }
      .toolbar {
        display: none !important;
      }
      .sheet {
        border: 0;
        padding: 0;
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
      <button type="button" class="btn btn-primary" onclick="window.print()">Cetak / Simpan PDF</button>
      <button type="button" class="btn" onclick="window.close()">Tutup</button>
    </div>
  </div>

  <main class="sheet">
    <header class="header">
      <div>
        <h1 class="brand">OTIUM</h1>
        <p class="brand-sub">Sistem Manajemen Cuti Karyawan</p>
      </div>
      <div class="doc-meta">
        <p class="doc-title">Surat Persetujuan Cuti Resmi</p>
        <p class="doc-number">No. ${escapeHtml(docNumber)}</p>
        <span class="status-pill">Disetujui Final (Approved)</span>
      </div>
    </header>

    <section class="section">
      <h2 class="section-title">1. Identitas Pemohon</h2>
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
          <td>${escapeHtml(leave.applicantEmail || "-")}${leave.applicantUsername ? ` (${escapeHtml(leave.applicantUsername)})` : ""}</td>
        </tr>
        <tr>
          <th>Jalur Persetujuan</th>
          <td>${escapeHtml(workflowLabel)}</td>
        </tr>
      </table>
    </section>

    <section class="section">
      <h2 class="section-title">2. Rincian Pengajuan Cuti</h2>
      <table class="info-grid">
        <tr>
          <th>Jenis Cuti</th>
          <td><strong>${escapeHtml(leave.leaveTypeName)}</strong> (${escapeHtml(leave.leaveTypeCode)})</td>
        </tr>
        <tr>
          <th>Periode Cuti</th>
          <td>${escapeHtml(periodLabel)}${leave.isHalfDay ? " (Setengah Hari)" : ""}</td>
        </tr>
        <tr>
          <th>Durasi Efektif</th>
          <td style="font-variant-numeric: tabular-nums;"><strong>${escapeHtml(Number(leave.totalDays).toFixed(1))} Hari Kerja</strong></td>
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
          <td>${escapeHtml(leave.emergencyPhone || "-")}</td>
        </tr>
      </table>
    </section>

    <section class="section">
      <h2 class="section-title">3. Serah Terima Tugas (Handover)</h2>
      <div class="box">
        <div><strong>Rekan Pengganti:</strong> ${escapeHtml(leave.handoverUserName || "-")}</div>
        <div style="margin-top: 6px;"><strong>Catatan Tugas:</strong> ${escapeHtml(leave.handoverNotes || "-")}</div>
      </div>
    </section>

    <section class="section">
      <h2 class="section-title">4. Jejak Persetujuan Digital</h2>
      <div class="signatures">
        <div class="sig-card">
          <div class="sig-role">Verifikasi Tahap 1 — Ketua Divisi</div>
          <div class="sig-name">${escapeHtml(leaderName)}</div>
          <div class="sig-time">${isLeaderApplicant ? "Bypass sesuai alur Ketua Divisi" : `Disetujui: ${escapeHtml(leaderTime)}`}</div>
          ${!isLeaderApplicant ? `<div class="sig-notes">Catatan: ${escapeHtml(leaderNotes)}</div>` : ""}
        </div>
        <div class="sig-card">
          <div class="sig-role">Persetujuan Final — HRD</div>
          <div class="sig-name">${escapeHtml(hrdName)}</div>
          <div class="sig-time">Disetujui: ${escapeHtml(hrdTime)}</div>
          <div class="sig-notes">Catatan: ${escapeHtml(hrdNotes)}</div>
        </div>
      </div>
    </section>

    <footer class="footer-note">
      <span>Dokumen diterbitkan secara elektronik oleh Otium dan sah tanpa tanda tangan basah.</span>
      <span>ID Transaksi #${escapeHtml(leave.id)}</span>
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
