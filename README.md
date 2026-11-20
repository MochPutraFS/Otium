# Otium — Sistem Manajemen Cuti Karyawan

**Individual Project 7 — Tugas Final Praktikum Pemrograman Web 2026**

Aplikasi web full-stack untuk mengelola siklus pengajuan cuti karyawan, verifikasi berjenjang (Ketua Divisi & HRD), perhitungan kuota cuti tahunan (mendukung setengah hari `0.5`), serah terima tugas (*handover*), serta manajemen data master melalui 6 modul CMS.

---

## Status Pengembangan Saat Ini

- [x] **Inisialisasi Proyek & Skema Database PostgreSQL** (`database/schema.sql`, `seed.sql`, `src/lib/db.js`)
- [x] **UI Halaman Login (`/login`)** — Split-screen branding Otium, input Email/Username, toggle password, Remember Me, validasi client-side
- [x] **UI App Shell & 4 Variasi Dashboard (`/dashboard`)** *(Mode UI-Only)*:
  - Sidebar gelap *collapsible* (desktop) & drawer (mobile) dengan menu adaptif 4 role (`Admin`, `Karyawan`, `Ketua Divisi`, `HRD`)
  - `TopNavbar` dengan info tanggal & hari libur terdekat, dropdown notifikasi internal, dan menu profil
  - 4 tampilan Dashboard spesifik role lengkap dengan visualisasi SVG/Tailwind (Donut kuota `0.5` hari, Mini-Stepper 2 tahap, strip jadwal cuti Sen–Jum, bar ketersediaan divisi, dan progres masa kerja `< 1 tahun`)
  - *Floating Preview Role Dock* sementara untuk berpindah 4 role (`?role=admin|karyawan|ketua-divisi|hrd`) sebelum integrasi autentikasi backend
- [x] **UI Halaman Profil & Panel Kuota Realtime (`/profile`)** — Layout 2 kolom bertab (*Informasi Pribadi* & *Keamanan*), avatar interaktif, adaptif 4 role (`QuotaOverviewCard` untuk Karyawan/Ketua Divisi & `RoleAccessSummaryCard` untuk Admin/HRD)
- [x] **UI Halaman Pengajuan & Riwayat Cuti (`/leaves/new`, `/leaves`)** — Form interaktif dengan kalkulator hari kerja (exclude Sabtu/Minggu & dukungan `0.5` hari), *What-If Quota Widget*, *Slide-Over Detail Drawer* (Timeline 2 jalur), dan *Modal Pembatalan* (alasan wajib + simulasi *Auto-Refund*)
- [x] **UI Halaman Verifikasi Ketua Divisi & Persetujuan Final HRD (`/approvals/leader`, `/approvals/hrd`)** — Pola *Hybrid View* (*Compact Card* untuk antrean aktif + *Tabel Ringkas* untuk riwayat), *Slide-Over Detail Drawer*, Smart `ApprovalModal` (chip catatan cepat & info *Auto-Refund*), serta **Multi-Approve Checkbox HRD** (Jalur 1 & Jalur 2)
- [ ] **UI 4 Modul CMS Admin (`/admin/users`, `/admin/divisions`, `/admin/division-members`, `/admin/leave-types`)** *(sedang dikerjakan)*
- [ ] **Integrasi Backend (Middleware RBAC, JWT Cookie, Server Actions, Route Handlers, & Raw SQL `pg`)**

---

## Tech Stack & Batasan Teknis

- **Framework:** Next.js 15 (App Router)
- **Bahasa:** JavaScript Murni (`.js` / `.jsx`) — *tanpa TypeScript*
- **Styling & Ikon:** Tailwind CSS + `lucide-react`
- **Database:** PostgreSQL
- **Akses Data:** Raw SQL Murni menggunakan `pg` (`node-postgres`) dengan *parameterized queries* (`$1, $2, ...`) dan transaksi atomik (`BEGIN ... COMMIT / ROLLBACK`) — *tanpa ORM / Query Builder*
- **Backend Pattern:** Kombinasi Next.js Server Actions (`"use server"`) dan Route Handlers (`src/app/api/**/route.js`)

---

## Struktur Direktori

```text
sistem-manajemen-cuti-karyawan/
├── database/                  # Skrip PostgreSQL pgAdmin (schema.sql, seed.sql, database.sql)
├── public/
│   ├── images/                # Logo Otium & aset statis
│   └── uploads/               # Penyimpanan lokal lampiran surat dokter & avatar
├── src/
│   ├── app/                   # Next.js App Router (.js / .jsx)
│   │   ├── (auth)/login/      # Halaman Login terpusat
│   │   └── (dashboard)/       # App Shell: dashboard, profile, leaves, approvals, admin
│   ├── actions/               # Next.js Server Actions ("use server")
│   ├── components/            # Komponen UI modular (auth, layout, ui, dashboard, profile, leaves, approvals, admin)
│   └── lib/                   # Pool koneksi 'pg', utilitas tanggal, dan mock data pratinjau UI
├── jsconfig.json              # Path alias JavaScript (@/* -> ./src/*)
├── LICENSE                    # Lisensi MIT
└── README.md
```

---

## Setup & Pratinjau Lokal

1. **Clone repository**
   ```bash
   git clone https://github.com/<username>/sistem-manajemen-cuti-karyawan.git
   cd sistem-manajemen-cuti-karyawan
   ```
2. **Install dependencies**
   ```bash
   npm install
   ```
3. **Setup Database PostgreSQL** *(untuk tahap backend)*
   - Buat database baru di PostgreSQL / pgAdmin.
   - Import file SQL dari folder `/database` (`schema.sql` dan `seed.sql`).
   - Sesuaikan variabel `DATABASE_URL` dan `JWT_SECRET` pada `.env`.
4. **Jalankan Server Development**
   ```bash
   npm run dev
   ```
5. **Pratinjau Halaman UI**
   - Halaman Login: `http://localhost:3000/login`
   - Dashboard (4 Role): `http://localhost:3000/dashboard` (gunakan dock **Pratinjau Role UI** di pojok kanan bawah atau query `?role=admin`, `?role=karyawan`, `?role=ketua-divisi`, `?role=hrd`)
   - Profil & Kuota: `http://localhost:3000/profile`
   - Pengajuan & Riwayat Cuti: `http://localhost:3000/leaves/new` & `http://localhost:3000/leaves`
   - Verifikasi Ketua Divisi & Final HRD: `http://localhost:3000/approvals/leader?role=ketua-divisi` & `http://localhost:3000/approvals/hrd?role=hrd`

---

## Lisensi

Proyek ini dilisensikan di bawah [MIT License](./LICENSE).
