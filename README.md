# Otium — Sistem Manajemen Cuti Karyawan

**Individual Project 7 — Tugas Final Praktikum Pemrograman Web 2026**

Aplikasi web full-stack **Sistem Manajemen Cuti Karyawan** berbasis **Next.js (App Router, JavaScript Murni)** dan **PostgreSQL (100% Raw SQL via `pg`, tanpa ORM)**. Mengelola seluruh siklus pengajuan cuti, verifikasi berjenjang (Ketua Divisi & HRD), kalkulasi kuota presisi `0.5` hari, serah terima tugas (*handover*), surat cuti resmi siap cetak A4/PDF, serta 6 modul CMS dalam antarmuka **Swiss Archival / Editorial Ledger** (mendukung Light & Dark Mode).

---

## Fitur Utama (Production-Ready)

- **Autentikasi Terpusat & RBAC 2 Lapis (`/login`, `src/middleware.js`, `/api/auth/*`)**
  - Login dengan `Email` atau `Username` + `Password` (`bcryptjs`), opsi **Remember Me** (JWT HttpOnly Cookie `1 hari` normal / `7 hari` jika dicentang), deteksi role otomatis, pemblokiran akun `is_active = FALSE`, dan tanpa registrasi publik.
- **Dashboard Adaptif 4 Role (`/dashboard`)**
  - Tampilan khusus untuk `Admin`, `Karyawan`, `Ketua Divisi`, dan `HRD` lengkap dengan **12-Day Quota Precision Ruler**, `.metric-strip`, dan ringkasan antrean/riwayat realtime dari PostgreSQL.
- **Pengajuan & Riwayat Cuti (`/leaves/new`, `/leaves`)**
  - Validasi berlapis (masa kerja `>= 1 tahun` untuk Cuti Tahunan, batas H-3 / H+3, anti-overlap tanggal, kecukupan kuota, rekan pengganti satu divisi, lampiran wajib Cuti Sakit).
  - Kalkulator hari kerja (mengecualikan Sabtu–Minggu & hari libur aktif), dukungan cuti setengah hari (`0.5`), **What-If Projection Ruler**, kalender interaktif multi-bulan, pembatalan dengan alasan wajib + *auto-refund* kuota atomik, serta cetak **Surat Cuti Resmi PDF**.
- **Verifikasi Ketua Divisi & Persetujuan Final HRD (`/approvals/leader`, `/approvals/hrd`)**
  - Kartu **Routing Slip (`Umlaufzettel`)** 3 tahap beserta paraf & stempel status.
  - Alur 1 (`Karyawan → Ketua Divisi → HRD`) dan Alur 2 (`Ketua Divisi → HRD`).
  - **Multi-Approve Checkbox (*Bulk Approval*)** HRD dalam satu transaksi SQL atomik + *auto-refund* kuota saat penolakan.
- **Admin CMS Modul 1–4 (`/admin/users`, `/admin/divisions`, `/admin/division-members`, `/admin/leave-types`)**
  - Manajemen User (proteksi anti-hapus akun `Admin` & `HRD`), Manajemen Divisi (aturan 1 Ketua per Divisi + *Double Confirmation Delete* tanpa menghapus akun anggota), Manajemen Anggota Divisi (`division_id = NULL`), serta Konfigurasi Jenis Cuti Dinamis dari database.
- **Profil & Notifikasi Internal (`/profile`, `/api/notifications`, `/api/upload`)**
  - Pembaruan biodata, unggah/hapus foto profil lokal (`/public/uploads/avatars`), ganti password (`bcryptjs`), serta notifikasi internal *handover*.

---

## Tech Stack & Arsitektur

- **Framework:** Next.js 15 (App Router)
- **Bahasa:** JavaScript Murni (`.js` / `.jsx` — tanpa TypeScript)
- **Styling & Ikon:** Tailwind CSS + `lucide-react` (`Cormorant Garamond`, `IBM Plex Sans`, `IBM Plex Mono`)
- **Database:** PostgreSQL
- **Akses Data:** Raw SQL Murni menggunakan `pg` (`node-postgres`) dengan *parameterized queries* (`$1, $2, ...`) dan transaksi atomik (`BEGIN ... COMMIT / ROLLBACK` + `SELECT ... FOR UPDATE`)
- **Backend Pattern:** Kombinasi Next.js Server Actions (`"use server"`) dan Route Handlers (`src/app/api/**/route.js`)

---

## Struktur Direktori

```text
otium/
├── database/                  # Skrip PostgreSQL pgAdmin (database.sql, schema.sql, seed.sql)
├── public/
│   ├── images/                # Logo Otium (Swiss Ledger Seal) & aset statis
│   └── uploads/               # Penyimpanan lokal lampiran surat dokter & avatar
├── src/
│   ├── middleware.js          # Edge Auth Guard & RBAC Route Protection
│   ├── app/                   # Next.js App Router (.js / .jsx)
│   │   ├── (auth)/login/      # Halaman Login terpusat (Editorial Split Archival)
│   │   ├── (dashboard)/       # App Shell: dashboard, profile, leaves, approvals, admin
│   │   └── api/               # Next.js Route Handlers
│   ├── actions/               # Next.js Server Actions ("use server")
│   ├── components/            # Komponen UI modular (.jsx)
│   └── lib/                   # Pool 'pg', withTransaction, auth/JWT, validasi, utilitas tanggal
├── .env.example               # Template variabel lingkungan
├── jsconfig.json              # Path alias JavaScript (@/* -> ./src/*)
├── LICENSE                    # Lisensi MIT
└── README.md
```

---

## Setup Lokal

1. **Clone repository**
   ```bash
   git clone https://github.com/MochPutraFS/Otium.git
   cd Otium
   ```
2. **Install dependencies**
   ```bash
   npm install
   ```
3. **Setup Database PostgreSQL (pgAdmin)**
   - Buat database baru di PostgreSQL / pgAdmin (misal `otium_db`).
   - Jalankan **satu file gabungan** `database/database.sql` (atau jalankan `database/schema.sql` diikuti `database/seed.sql`).
4. **Konfigurasi Environment Variables**
   - Salin `.env.example` menjadi `.env` (atau `.env.local`), lalu sesuaikan nilai `DATABASE_URL` dan `JWT_SECRET`.
5. **Jalankan Server Development**
   ```bash
   npm run dev
   ```
6. **Akses Aplikasi**
   - Buka `http://localhost:3000/login` di browser Anda.

---

## Akun Demo Awal (`database/seed.sql`)

Seluruh akun bawaan menggunakan password yang sama: **`password123`**

| Role | Username | Email | Divisi |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `admin@perusahaan.com` | — |
| **HRD** | `hrd` | `hrd@perusahaan.com` | — |
| **Ketua Divisi** | `leader.eng` | `ketua.eng@perusahaan.com` | Engineering |
| **Karyawan 1** | `karyawan1` | `andi.pratama@perusahaan.com` | Engineering |
| **Karyawan 2** | `karyawan2` | `dewi.lestari@perusahaan.com` | Engineering |

---

## Lisensi

Proyek ini dilisensikan di bawah [MIT License](./LICENSE).
