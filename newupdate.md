# Panduan & Prompt Migrasi UI Baru (Swiss Archival — Otium)

Dokumen ini berisi panduan keamanan Git branch serta **5 prompt siap pakai (Tahap 1 s.d. Tahap 5)** untuk menerapkan desain UI terbaru dari `docs/index.html` ke aplikasi Next.js eksisting secara bertahap, terukur, dan **100% hanya mengubah lapisan UI (tanpa menyentuh backend, Server Actions, Route Handlers, maupun SQL/database)**.

---

## Tahap 0 — Persiapan Git Branch (Wajib Sebelum Mulai)

Jalankan perintah berikut di terminal sebelum memulai sesi baru agar **UI lama tetap 100% aman** di branch utama (`main`):

```bash
# 1. Pastikan seluruh perubahan UI lama sudah ter-commit di main
git status
git add .
git commit -m "chore: snapshot ui lama sebelum migrasi swiss archival"

# 2. Buat tag penanda titik aman permanen
git tag v1-ui-lama

# 3. Buat dan pindah ke branch khusus redesain UI
git checkout -b feat/newUI
```

> **Cara kembali ke UI lama kapan saja:**
> ```bash
> git checkout main
> ```
> Karena migrasi ini **100% UI-only** dan tidak menyentuh backend maupun database PostgreSQL, perpindahan antar branch `main` (UI lama) dan `feat/newUI` (UI baru) dijamin aman tanpa risiko regresi data.

---

## Ringkasan Batasan Mutlak (Berlaku di Semua Tahap)

1. **100% HANYA UI (Zero Backend / SQL Changes):**
   - **DILARANG KERAS** mengubah, menambah, atau menghapus file di `src/actions/*`, `src/app/api/*`, `src/lib/*`, `src/middleware.js`, maupun `database/*`.
   - Seluruh perubahan **hanya boleh** menyentuh komponen tampilan (`src/components/**/*.jsx`), layout/style (`src/app/layout.js`, `src/app/globals.css`, `tailwind.config.js`), dan markup presentasi pada halaman (`src/app/**/page.jsx`) tanpa mengubah kontrak props, payload form, maupun query data.
   - Jika ada elemen di `docs/index.html` yang membutuhkan data yang belum tersedia di props eksisting, olah/agregasikan murni di sisi komponen UI dari props yang sudah ada atau sesuaikan tampilannya tanpa menyentuh backend/SQL.
2. **Patuh `AGENTS.md`:** Next.js App Router **JavaScript murni (`.js`/`.jsx`)**, Tailwind CSS, tanpa TypeScript, tanpa ORM.
3. **Logo Asli Dipertahankan:** Tetap gunakan `/images/otium-logo.svg` dan `src/app/icon.svg` di Login, Sidebar, Mobile Drawer, dan Kop Surat Cuti (jangan pakai monogram teks generik).
4. **Tanpa Jam Pasir, Tanpa Blackout, Tanpa `.sheet-bar`:** Gunakan **12-Day Precision Ruler** (dari versi terbaru `docs/index.html`), tanpa fitur Periode Blackout, dan tanpa Top Prototype Role Switcher Bar di produksi.
5. **Kompatibilitas Browser:** Konversi atribut eksperimental `commandfor`/`command` dari `docs/index.html` menjadi React state & event handler (`onClick`) standar.
6. **Selalu Buat Plan dengan Skill/Mode `/plan` & Simpan Walkthrough:**
   - **Sebelum coding:** Jalankan sesi dengan slash command **`/plan`** (atau instruksikan agen menggunakan skill `planning-and-task-breakdown`) untuk menyusun dokumen **`implementation_plan.md`** yang terstruktur dan **tunggu persetujuan pengguna** sebelum mengeksekusi perubahan kode.
   - **Setelah selesai & lulus `npm run build`:** Selalu simpan file walkthrough dokumentasi di `docs/study-guides/` mengikuti format penamaan yang sudah ada (`<Prefix> - <Judul> (<slug>).md`).

---

## Prompt Tahap 1 — Fondasi Design System, Login, & App Shell

Salin dan tempel prompt di bawah ini di sesi baru (pastikan sudah berada di branch `feat/newUI`):

```markdown
Kita sedang mengerjakan migrasi UI bertahap ke desain Swiss Archival / Editorial Ledger berdasarkan `docs/index.html` (versi terbaru) pada branch `feat/newUI`.

### Fokus: TAHAP 1 — Fondasi Design System, Login, & App Shell

### Aturan Mutlak
1. **HANYA UBAH UI (100% UI-Only):**
   - **DILARANG KERAS** mengubah file backend, Server Actions (`src/actions/*`), Route Handlers (`src/app/api/*`), helper/query data (`src/lib/*`), `src/middleware.js`, maupun `database/*`.
   - Pertahankan seluruh kontrak props, alur submit form, dan autentikasi eksisting.
2. Patuhi penuh `AGENTS.md`: Next.js App Router JavaScript murni (`.js`/`.jsx`), Tailwind CSS, tanpa TypeScript.
3. **Logo Asli Wajib Dipertahankan:** Gunakan `/images/otium-logo.svg` dan `src/app/icon.svg` di Halaman Login (menggantikan Swiss Arch Typographic Crest generik), Sidebar, dan Mobile Drawer.
4. **Tanpa Jam Pasir, Tanpa Blackout, Tanpa `.sheet-bar`:** Ikuti versi terbaru `docs/index.html` yang memakai **12-Day Precision Ruler**; jangan tampilkan Top Prototype Role Switcher Bar di produksi.
5. Konversi interaksi `commandfor`/`command` dari `docs/index.html` ke React state & `onClick` standar, serta pertahankan fitur collapse sidebar yang sudah ada.

### Ruang Lingkup Pekerjaan Tahap 1
1. **Tipografi & Token Desain:**
   - Muat font `Cormorant Garamond`, `IBM Plex Sans`, dan `IBM Plex Mono` melalui `next/font/google` di `src/app/layout.js`.
   - Konfigurasikan token warna Swiss Archival (Alabaster, Paper, Spruce, Ochre, Terracotta, Slate Blue — Light & Dark via `light-dark()` dan `color-mix()`), pola `.arch-grid-bg`, styling dasar `.panel`, `.btn`, `.tag`, `.ledger`, `.slip`, `forced-colors`, `prefers-reduced-motion`, dan `@media print` di `src/app/globals.css` serta `tailwind.config.js`.
2. **Komponen Reusable Inti:**
   - Buat `src/components/ui/QuotaPrecisionRuler.jsx` (mengadopsi `renderQuotaRuler` 12-segmen dengan presisi `0.5` hari + arsiran proyeksi *ochre* + label aksesibel).
   - Perbarui `src/components/ui/StatusBadge.jsx` mengadopsi gaya `.tag` (ikon + bentuk + label resmi 5 status cuti: `Pending`, `Approved by Leader`, `Approved`, `Rejected`, `Cancelled`).
3. **Halaman Login & App Shell:**
   - Redesain `src/components/auth/LoginBrandPanel.jsx` & `src/components/auth/LoginFormCard.jsx` (gaya Swiss Arch Atelier + **Logo Otium asli** + *Interactive Workflow Formula Sheet* dengan kursor sel aktif).
   - Redesain `src/components/layout/AppShellClient.jsx`, `Sidebar.jsx` (dengan **Logo Otium asli**, Quota Summary Footer untuk Karyawan/Ketua Divisi, dan tombol collapse sidebar), `TopNavbar.jsx`, serta `NotificationDropdown.jsx`.

### Protokol Wajib (Plan via `/plan` + Build + Walkthrough)
1. **WAJIB buat Plan terlebih dahulu menggunakan mode `/plan` & skill `planning-and-task-breakdown`:** Susun artifact `implementation_plan.md` (berisi daftar file UI yang akan dibuat/dimodifikasi, pemetaan komponen, dan langkah verifikasi) dengan permintaan konfirmasi, lalu **tunggu persetujuan saya** sebelum menulis/mengedit kode.
2. Setelah eksekusi, jalankan `npm run build` untuk memastikan nol error.
3. Simpan dokumentasi walkthrough (alur logika UI, komponen yang diubah, dan panduan studi) ke file baru di `docs/study-guides/` dengan format penamaan resmi proyek:
   `docs/study-guides/Redesain UI Tahap 1 - Fondasi Design System, Login, & App Shell (ui-foundation-shell).md`
```

---

## Prompt Tahap 2 — Dashboard 4 Role (Quota Ledger Hero & Editorial Ledger)

Jalankan prompt ini setelah Tahap 1 selesai dan sudah di-commit:

```markdown
Kita melanjutkan migrasi UI Swiss Archival dari `docs/index.html` pada branch `feat/newUI`. Tahap 1 (Fondasi Design System, Login, & App Shell) sudah selesai.

### Fokus: TAHAP 2 — Dashboard 4 Role (100% UI-Only)

### Aturan Mutlak
1. **HANYA UBAH UI (100% UI-Only):**
   - **DILARANG KERAS** mengubah `src/lib/dashboard-data.js`, `src/actions/*`, `src/app/api/*`, maupun query SQL/database apa pun.
   - Seluruh tampilan dashboard wajib memanfaatkan data/props yang **sudah tersedia** dari server component eksisting. Jika ingin menampilkan ringkasan/matriks jadwal cuti, olah murni di sisi komponen `.jsx` dari array data yang sudah diterima via props.
2. Patuhi penuh `AGENTS.md`: JavaScript murni (`.js`/`.jsx`), Tailwind CSS, tanpa TypeScript.
3. Gunakan token Swiss Archival serta komponen `QuotaPrecisionRuler.jsx` dan `StatusBadge.jsx` dari Tahap 1.
4. **Hilangkan elemen Blackout** dari seluruh tampilan dashboard.

### Ruang Lingkup Pekerjaan Tahap 2
1. **Redesain 4 Tampilan Dashboard:**
   - `src/components/dashboard/EmployeeDashboardView.jsx`: Terapkan **Quota Ledger Hero & 12-Day Precision Ruler**, **Metric Strip**, panel pengajuan aktif, dan tabel riwayat terbaru bergaya Swiss Ledger.
   - `src/components/dashboard/LeaderDashboardView.jsx`: Terapkan **Quota Ledger Hero** pribadi, **Metric Strip** divisi, antrean ringkas verifikasi divisi, dan tampilan jadwal/riwayat anggota divisi bergaya arsip.
   - `src/components/dashboard/HrdDashboardView.jsx`: Terapkan **Metric Strip**, tampilan ledger/kapasitas cuti dari data props eksisting, dan ringkasan antrean persetujuan final HRD.
   - `src/components/dashboard/AdminDashboardView.jsx`: Terapkan **Metric Strip** master data (User, Divisi, Jenis Cuti, Hari Libur) dan ringkasan operasional bergaya Swiss Archival.
2. **Komponen UI Pendukung:**
   - Perbarui `src/components/ui/StatsCard.jsx`, `QuotaOverviewCard.jsx`, dan `EmptyState.jsx` agar konsisten dengan gaya Swiss Archival.

### Protokol Wajib (Plan via `/plan` + Build + Walkthrough)
1. **WAJIB buat Plan terlebih dahulu menggunakan mode `/plan` & skill `planning-and-task-breakdown`:** Susun artifact `implementation_plan.md` (berisi daftar file UI yang akan diubah, pemetaan komponen, dan langkah verifikasi) dengan permintaan konfirmasi, lalu **tunggu persetujuan saya** sebelum menulis/mengedit kode.
2. Setelah eksekusi, jalankan `npm run build` untuk memastikan nol error.
3. Simpan dokumentasi walkthrough ke file baru di `docs/study-guides/` dengan format penamaan resmi proyek:
   `docs/study-guides/Redesain UI Tahap 2 - Dashboard 4 Role Swiss Archival (ui-dashboard).md`
```

---

## Prompt Tahap 3 — Modul Cuti (`/leaves/new` & `/leaves`)

Jalankan prompt ini setelah Tahap 2 selesai dan sudah di-commit:

```markdown
Kita melanjutkan migrasi UI Swiss Archival dari `docs/index.html` pada branch `feat/newUI`. Tahap 1 dan Tahap 2 sudah selesai.

### Fokus: TAHAP 3 — Modul Pengajuan Cuti Baru (`/leaves/new`) & Riwayat Cuti (`/leaves`) (100% UI-Only)

### Aturan Mutlak
1. **HANYA UBAH UI (100% UI-Only):**
   - **DILARANG KERAS** mengubah `src/actions/leave-request-actions.js`, `src/app/api/leaves/**`, `src/app/api/upload/route.js`, `src/lib/*`, maupun `database/*`.
   - Pertahankan seluruh field form, mekanisme pemanggilan `/api/leaves/check-availability`, upload lampiran lokal, dan Server Action pembatalan cuti persis seperti sebelumnya.
2. Patuhi penuh `AGENTS.md`: JavaScript murni (`.js`/`.jsx`), Tailwind CSS, tanpa TypeScript.
3. **Hilangkan penanda Blackout** di kalender interaktif; tampilkan hanya Hari Dipilih, Akhir Pekan (Sabtu–Minggu), dan Hari Libur/Cuti Bersama yang sudah tersedia dari props/API eksisting.
4. Tetap gunakan **Logo Otium asli** (`/images/otium-logo.svg`) pada preview/cetak Surat Cuti A4.

### Ruang Lingkup Pekerjaan Tahap 3
1. **Form Pengajuan Cuti (`/leaves/new`):**
   - Redesain `src/components/leaves/LeaveRequestForm.jsx` dengan gaya Swiss Archival (form grid, inline validation, file preview chip, validasi rekan pengganti & lampiran wajib Cuti Sakit).
   - Redesain `src/components/leaves/WhatIfQuotaWidget.jsx` menjadi **What-If Projection Ruler** (menggunakan `QuotaPrecisionRuler.jsx` dengan simulasi arsiran *ochre* real-time) + **Kalender Interaktif Multi-Bulan** (klik langsung tanggal mulai & selesai, sinkron dua arah dengan input tanggal).
2. **Riwayat & Pembatalan Cuti (`/leaves`):**
   - Redesain `src/components/leaves/LeaveHistoryClient.jsx` menjadi **Sortable Swiss Ledger Table** (sorting via React state, bukan `commandfor`) + **Mobile Ledger Cards** untuk viewport sempit + filter status & toolbar arsip.
   - Redesain `src/components/leaves/LeaveDetailDrawer.jsx` dan `src/components/ui/CancelLeaveModal.jsx` untuk menampilkan detail bergaya **Routing Slip + Stempel Tinta** (`DISETUJUI` / `DITOLAK` / `DIBATALKAN`).
   - Perbarui `src/components/leaves/LeaveRoleGuardNotice.jsx` sesuai tema baru.

### Protokol Wajib (Plan via `/plan` + Build + Walkthrough)
1. **WAJIB buat Plan terlebih dahulu menggunakan mode `/plan` & skill `planning-and-task-breakdown`:** Susun artifact `implementation_plan.md` (berisi daftar file UI yang akan diubah, pemetaan komponen, dan langkah verifikasi) dengan permintaan konfirmasi, lalu **tunggu persetujuan saya** sebelum menulis/mengedit kode.
2. Setelah eksekusi, jalankan `npm run build` untuk memastikan nol error.
3. Simpan dokumentasi walkthrough ke file baru di `docs/study-guides/` dengan format penamaan resmi proyek:
   `docs/study-guides/Redesain UI Tahap 3 - Form Pengajuan & Riwayat Cuti (ui-leaves).md`
```

---

## Prompt Tahap 4 — Modul Approval (`/approvals/leader` & `/approvals/hrd`)

Jalankan prompt ini setelah Tahap 3 selesai dan sudah di-commit:

```markdown
Kita melanjutkan migrasi UI Swiss Archival dari `docs/index.html` pada branch `feat/newUI`. Tahap 1, 2, dan 3 sudah selesai.

### Fokus: TAHAP 4 — Verifikasi Ketua Divisi (`/approvals/leader`) & Persetujuan Final HRD (`/approvals/hrd`) (100% UI-Only)

### Aturan Mutlak
1. **HANYA UBAH UI (100% UI-Only):**
   - **DILARANG KERAS** mengubah `src/actions/approval-actions.js`, `src/app/api/approvals/**`, `src/lib/approval-data.js`, maupun `database/*`.
   - Pertahankan seluruh alur pemanggilan Server Actions approve, reject (dengan alasan wajib), dan multi-approve HRD eksisting.
2. Patuhi penuh `AGENTS.md`: JavaScript murni (`.js`/`.jsx`), Tailwind CSS, tanpa TypeScript.

### Ruang Lingkup Pekerjaan Tahap 4
1. **Komponen Signature Routing Slip (`Umlaufzettel`):**
   - Redesain `src/components/approvals/VerificationCard.jsx` (atau buat komponen UI `src/components/ui/RoutingSlipCard.jsx` yang dipakai bersama) mengikuti gaya `.slip` di `docs/index.html`:
     - Header dokumen + metadata pemohon/periode/handover.
     - 3 kotak tahap (`01 Pemohon`, `02 Ketua Divisi` — otomatis menampilkan jalur langsung untuk pemohon `Ketua Divisi`, `03 Otorisasi HRD`) lengkap dengan paraf SVG & stempel tinta (`DISETUJUI` / `DITOLAK` / `DIBATALKAN`).
     - Menampilkan riwayat persetujuan Ketua Divisi (nama, waktu, catatan) dengan jelas pada antrean HRD.
2. **Halaman Ketua Divisi (`/approvals/leader`):**
   - Redesain `src/components/approvals/LeaderVerificationClient.jsx` menggunakan Routing Slip Cards + filter/tab antrean & riwayat.
3. **Halaman HRD (`/approvals/hrd`):**
   - Redesain `src/components/approvals/HrdApprovalClient.jsx` dengan **Segmented Toggle** (`Kartu Paraf` vs `Tabel Ringkas`), checkbox *Pilih Semua*, dan **Floating Bulk Action Bar** (`src/components/approvals/HrdBulkApprovalBar.jsx` & `HrdBulkConfirmModal.jsx`).
4. **Modal & Drawer Pendukung:**
   - Redesain `src/components/approvals/ApprovalDetailDrawer.jsx`, `ApprovalRoleGuardNotice.jsx`, dan `src/components/ui/ApprovalModal.jsx` agar konsisten dengan dialog top-layer Swiss Archival.

### Protokol Wajib (Plan via `/plan` + Build + Walkthrough)
1. **WAJIB buat Plan terlebih dahulu menggunakan mode `/plan` & skill `planning-and-task-breakdown`:** Susun artifact `implementation_plan.md` (berisi daftar file UI yang akan dibuat/dimodifikasi, pemetaan komponen, dan langkah verifikasi) dengan permintaan konfirmasi, lalu **tunggu persetujuan saya** sebelum menulis/mengedit kode.
2. Setelah eksekusi, jalankan `npm run build` untuk memastikan nol error.
3. Simpan dokumentasi walkthrough ke file baru di `docs/study-guides/` dengan format penamaan resmi proyek:
   `docs/study-guides/Redesain UI Tahap 4 - Verifikasi Ketua Divisi & Persetujuan Final HRD (ui-approvals).md`
```

---

## Prompt Tahap 5 — Modul Admin CMS, Profil, & Verifikasi Akhir

Jalankan prompt ini setelah Tahap 4 selesai dan sudah di-commit:

```markdown
Kita masuk ke tahap terakhir migrasi UI Swiss Archival dari `docs/index.html` pada branch `feat/newUI`. Tahap 1 s.d. 4 sudah selesai.

### Fokus: TAHAP 5 — Admin CMS (`/admin/*`), Profil (`/profile`), & Verifikasi Final (100% UI-Only)

### Aturan Mutlak
1. **HANYA UBAH UI (100% UI-Only):**
   - **DILARANG KERAS** mengubah `src/actions/*`, `src/app/api/*`, `src/lib/*`, `src/middleware.js`, maupun `database/*`.
   - Pertahankan seluruh perilaku bisnis UI yang sudah ada (proteksi tombol hapus `Admin`/`HRD`, Double Confirmation Modal hapus divisi, lepas anggota divisi tanpa hapus akun, form jenis cuti dinamis, serta upload avatar & ganti password di Profil).
2. Patuhi penuh `AGENTS.md`: JavaScript murni (`.js`/`.jsx`), Tailwind CSS, tanpa TypeScript.

### Ruang Lingkup Pekerjaan Tahap 5
1. **Modul Admin CMS (`/admin/users`, `/admin/divisions`, `/admin/division-members`, `/admin/leave-types`):**
   - Redesain `AdminUsersClient.jsx`, `AdminDivisionsClient.jsx`, `AdminDivisionMembersClient.jsx`, `AdminLeaveTypesClient.jsx`, `AdminRoleGuardNotice.jsx`, dan `src/components/ui/DataTableToolbar.jsx` menggunakan **Sortable Swiss Ledger Table** + **Mobile Ledger Cards** + tombol & badge arsip.
   - Redesain seluruh modal form CMS (`UserFormModal.jsx`, `DivisionFormModal.jsx`, `DivisionDetailModal.jsx`, `AssignMemberModal.jsx`, `LeaveTypeFormModal.jsx`, dan `src/components/ui/DoubleConfirmDeleteModal.jsx`) dengan gaya dialog Swiss Archival.
2. **Modul Profil (`/profile`):**
   - Redesain `ProfilePageView.jsx`, `ProfileIdentityCard.jsx`, `ProfileEditForm.jsx`, `PasswordSecurityForm.jsx`, dan `RoleAccessSummaryCard.jsx` — termasuk menampilkan **Quota Precision Ruler** pada ringkasan saldo kuota (untuk Karyawan & Ketua Divisi).
3. **Verifikasi Akhir & Pembersihan:**
   - Pastikan tidak ada sisa gaya/kelas usang yang bentrok, cek keterbacaan Light & Dark Mode, cek responsivitas mobile, dan pastikan **Logo Otium asli** tampil konsisten di seluruh halaman.
   - Verifikasi via `git diff --stat main` bahwa tidak ada file di `src/actions/`, `src/app/api/`, `src/lib/`, `src/middleware.js`, atau `database/` yang berubah.
   - Jalankan `npm run build` dan `graphify update .` (jika tersedia).

### Protokol Wajib (Plan via `/plan` + Build + Walkthrough)
1. **WAJIB buat Plan terlebih dahulu menggunakan mode `/plan` & skill `planning-and-task-breakdown`:** Susun artifact `implementation_plan.md` (berisi daftar file UI yang akan diubah, pemetaan komponen, dan langkah verifikasi) dengan permintaan konfirmasi, lalu **tunggu persetujuan saya** sebelum menulis/mengedit kode.
2. Setelah eksekusi, jalankan `npm run build` untuk memastikan nol error.
3. Simpan dokumentasi walkthrough final ke file baru di `docs/study-guides/` dengan format penamaan resmi proyek:
   `docs/study-guides/Redesain UI Tahap 5 - Admin CMS, Profil, & Verifikasi Akhir (ui-admin-profile).md`
```
