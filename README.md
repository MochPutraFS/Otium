# Sistem Manajemen Cuti Karyawan

**Individual Project 7 — Tugas Final Praktikum Pemrograman Web 2026**

Aplikasi web full-stack untuk mendigitalisasi dan mengotomatisasi siklus pengajuan cuti karyawan, verifikasi berjenjang (Ketua Divisi & HRD), perhitungan kuota cuti tahunan (termasuk dukungan setengah hari `0.5`), serta manajemen data master melalui 6 modul CMS.

---

## Tech Stack & Batasan Teknis

- **Framework:** Next.js (App Router)
- **Bahasa:** JavaScript Murni (`.js` / `.jsx`) — *tanpa TypeScript*
- **Styling:** Tailwind CSS
- **Database:** PostgreSQL
- **Akses Data:** Raw SQL Murni menggunakan `pg` (`node-postgres`) dengan *parameterized queries* (`$1, $2, ...`) dan transaksi atomik (`BEGIN ... COMMIT / ROLLBACK`) — *tanpa ORM / Query Builder*
- **Backend Pattern:** Kombinasi Next.js Server Actions (`"use server"`) dan Route Handlers (`src/app/api/**/route.js`)

---

## Struktur Direktori

```text
sistem-manajemen-cuti-karyawan/
├── database/                  # Skrip PostgreSQL pgAdmin (schema.sql, seed.sql, database.sql)
├── public/uploads/            # Penyimpanan lokal lampiran surat dokter & avatar
├── src/
│   ├── middleware.js          # Edge Auth Guard & RBAC Route Protection
│   ├── app/                   # Next.js App Router (.js / .jsx)
│   ├── actions/               # Next.js Server Actions ("use server")
│   ├── components/            # Komponen UI modular (.jsx)
│   └── lib/                   # Pool koneksi 'pg', auth, date-utils, validators
├── jsconfig.json              # Path alias JavaScript (@/* -> ./src/*)
├── LICENSE                    # Lisensi MIT
└── README.md
```

---

## Setup Lokal (Panduan Singkat)

1. **Clone repository**
   ```bash
   git clone https://github.com/<username>/sistem-manajemen-cuti-karyawan.git
   cd sistem-manajemen-cuti-karyawan
   ```
2. **Install dependencies**
   ```bash
   npm install
   ```
3. **Setup Database PostgreSQL**
   - Buat database baru di PostgreSQL / pgAdmin.
   - Import file SQL dari folder `/database` (`schema.sql` dan `seed.sql` atau `database.sql`).
4. **Konfigurasi Environment Variables**
   - Salin `.env.example` menjadi `.env.local` dan sesuaikan `DATABASE_URL` serta `JWT_SECRET`.
5. **Jalankan Server Development**
   ```bash
   npm run dev
   ```

---

## Lisensi

Proyek ini dilisensikan di bawah [MIT License](./LICENSE).
