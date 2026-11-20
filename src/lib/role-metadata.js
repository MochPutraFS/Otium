/**
 * Ringkasan wewenang statis untuk peran non-pemohon cuti (Admin & HRD).
 * Digunakan oleh RoleAccessSummaryCard pada Halaman Profil (/profile).
 */
export const ROLE_ACCESS_METADATA = {
  Admin: {
    title: "Ringkasan Wewenang Administrator",
    subtitle: "Pengelolaan terpusat master data & tata kelola sistem Otium.",
    permissions: [
      "Kelola akun pengguna, masa kerja, & kuota cuti tahunan",
      "Kelola struktur divisi (1 Ketua Divisi = 1 Divisi) & anggota",
      "Konfigurasi jenis cuti dinamis beserta aturan H-3 / H+3",
      "Pemantauan lintas divisi & proteksi akun Admin/HRD",
    ],
    protectionNote:
      "Akun Administrator diproteksi di UI dan Backend sehingga tidak dapat dihapus dari tabel Manajemen Pengguna.",
  },
  HRD: {
    title: "Ringkasan Wewenang HRD",
    subtitle: "Otoritas persetujuan final cuti perusahaan & validasi kuota.",
    permissions: [
      "Persetujuan final (Tahap 2) pengajuan cuti Karyawan",
      "Persetujuan langsung pengajuan cuti pribadi Ketua Divisi",
      "Multi-Approve batch dalam satu transaksi atomik PostgreSQL",
      "Penolakan wajib alasan dengan auto-refund kuota otomatis",
    ],
    protectionNote:
      "Akun HRD diproteksi di UI dan Backend untuk menjaga kesinambungan otoritas persetujuan final perusahaan.",
  },
};
