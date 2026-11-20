# Otium — Sistem Manajemen Cuti Karyawan

**Individual Project 7 — Tugas Final Praktikum Pemrograman Web 2026**

Aplikasi web full-stack untuk mengelola siklus pengajuan cuti karyawan, verifikasi berjenjang (Ketua Divisi & HRD), perhitungan kuota cuti tahunan (mendukung setengah hari `0.5`), serah terima tugas (*handover*), serta manajemen data master melalui 6 modul CMS.

---

## Status Pengembangan Saat Ini

### Backend & Integrasi PostgreSQL (Production-Ready)
- [x] **Skema Database PostgreSQL** (`database/schema.sql`, `database/seed.sql`, `src/lib/db.js`) — 7 tabel relasional dengan *parameterized queries* (`pg`) dan helper transaksi atomik (`withTransaction`)
- [x] **Autentikasi & Proteksi RBAC 2 Lapis (`/login`, `src/middleware.js`, `/api/auth/*`)** — Login Email/Username + `bcryptjs`, JWT HttpOnly Cookie (*Remember Me* 1 hari / 7 hari), deteksi role otomatis, proteksi rute per role, dan pemblokiran akun nonaktif
- [x] **App Shell, Notifikasi Internal & Halaman Profil (`/profile`, `/api/notifications`, `/api/upload`)** — Navigasi adaptif 4 role, notifikasi internal dari PostgreSQL, pembaruan profil, unggah avatar lokal, serta perubahan kata sandi
- [x] **CMS Admin — Manajemen User (`/admin/users`)** — CRUD user dengan proteksi akun `Admin` & `HRD`, pencarian/filter, dan validasi berlapis
- [x] **CMS Admin — Manajemen Divisi & Anggota Divisi (`/admin/divisions`, `/admin/division-members`)** — CRUD divisi, aturan 1 Ketua Divisi per divisi, penghapusan divisi dengan *Double Confirmation* tanpa menghapus akun anggota, serta penugasan/pelepasan anggota divisi

### Antarmuka UI (Tahap Integrasi Backend Berikutnya)
- [x] **Dashboard Adaptif 4 Role (`/dashboard`)** — Tampilan khusus `Admin`, `Karyawan`, `Ketua Divisi`, dan `HRD`
- [x] **Pengajuan & Riwayat Cuti (`/leaves/new`, `/leaves`)** — Kalkulator hari kerja (exclude Sabtu/Minggu & dukungan `0.5` hari), *What-If Quota Widget*, *Slide-Over Detail Drawer*, dan *Modal Pembatalan*
- [x] **Verifikasi Ketua Divisi & Persetujuan Final HRD (`/approvals/leader`, `/approvals/hrd`)** — *Hybrid View*, `ApprovalModal`, dan *Multi-Approve Checkbox* HRD
- [x] **CMS Admin — Manajemen Jenis Cuti (`/admin/leave-types`)** — Konfigurasi dinamis kategori cuti

---

## Tech Stack & Arsitektur

- **Framework:** Next.js 15 (App Router)
- **Bahasa:** JavaScript Murni (`.js` / `.jsx`)
- **Styling & Ikon:** Tailwind CSS + `lucide-react`
- **Database:** PostgreSQL
- **Akses Data:** Raw SQL Murni menggunakan `pg` (`node-postgres`) dengan *parameterized queries* (`$1, $2, ...`) dan transaksi atomik (`BEGIN ... COMMIT / ROLLBACK`)
- **Backend Pattern:** Kombinasi Next.js Server Actions (`"use server"`) dan Route Handlers (`src/app/api/**/route.js`)

---

## Struktur Direktori

```text
otium/
├── database/                  # Skrip PostgreSQL pgAdmin (schema.sql, seed.sql)
├── public/
│   ├── images/                # Logo Otium & aset statis
│   └── uploads/               # Penyimpanan lokal lampiran surat dokter & avatar
├── src/
│   ├── middleware.js          # Edge Auth Guard & RBAC Route Protection
│   ├── app/                   # Next.js App Router (.js / .jsx)
│   │   ├── (auth)/login/      # Halaman Login terpusat
│   │   ├── (dashboard)/       # App Shell: dashboard, profile, leaves, approvals, admin
│   │   └── api/               # Next.js Route Handlers (auth, notifications, upload, admin, divisions)
│   ├── actions/               # Next.js Server Actions ("use server")
│   ├── components/            # Komponen UI modular (auth, layout, ui, dashboard, profile, leaves, approvals, admin)
│   └── lib/                   # Pool koneksi 'pg', auth/JWT, validasi, utilitas tanggal, dan data helpers
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
3. **Setup Database PostgreSQL**
   - Buat database baru di PostgreSQL / pgAdmin.
   - Jalankan skrip `database/schema.sql` diikuti `database/seed.sql`.
4. **Konfigurasi Environment Variables**
   - Salin `.env.example` menjadi `.env.local` (atau `.env`) lalu sesuaikan nilai `DATABASE_URL` dan `JWT_SECRET`.
5. **Jalankan Server Development**
   ```bash
   npm run dev
   ```
6. **Akses Aplikasi**
   - Buka `http://localhost:3000/login` di browser Anda.

---

## Lisensi

Proyek ini dilisensikan di bawah [MIT License](./LICENSE).
