-- ============================================================================
-- SEED DATA AWAL - SISTEM MANAJEMEN CUTI KARYAWAN
-- Password default semua akun demo: password123
-- ============================================================================

BEGIN;

-- 1. Divisi Awal (leader_id diisi setelah user Ketua Divisi dibuat)
INSERT INTO divisions (name, description)
VALUES (
    'Engineering',
    'Divisi Pengembangan Perangkat Lunak dan Infrastruktur Sistem'
);

-- 2. Akun Pengguna Awal: 1 Admin, 1 HRD, 1 Ketua Divisi, 2 Karyawan (satu divisi)
INSERT INTO users (
    username,
    email,
    password_hash,
    full_name,
    role,
    division_id,
    phone,
    address,
    initial_leave_quota,
    remaining_leave_quota,
    join_date,
    is_active
)
VALUES
(
    'admin',
    'admin@perusahaan.com',
    '$2a$10$M.GwTnn1dhTdGlNDvTT6PuWpfym8kuMaJ/1M6IwoxGtXt4lVxi64a',
    'Administrator Sistem',
    'Admin',
    NULL,
    '081100000001',
    'Jl. Jend. Sudirman No. 1, Jakarta',
    12.0,
    12.0,
    '2023-01-01',
    TRUE
),
(
    'hrd',
    'hrd@perusahaan.com',
    '$2a$10$M.GwTnn1dhTdGlNDvTT6PuWpfym8kuMaJ/1M6IwoxGtXt4lVxi64a',
    'Siti Rahmawati (HRD)',
    'HRD',
    NULL,
    '081100000002',
    'Jl. Gatot Subroto No. 10, Jakarta',
    12.0,
    12.0,
    '2023-03-01',
    TRUE
),
(
    'leader.eng',
    'ketua.eng@perusahaan.com',
    '$2a$10$M.GwTnn1dhTdGlNDvTT6PuWpfym8kuMaJ/1M6IwoxGtXt4lVxi64a',
    'Budi Santoso',
    'Ketua Divisi',
    (SELECT id FROM divisions WHERE name = 'Engineering'),
    '081100000003',
    'Jl. Kemang Raya No. 15, Jakarta',
    12.0,
    12.0,
    '2023-05-10',
    TRUE
),
(
    'karyawan1',
    'andi.pratama@perusahaan.com',
    '$2a$10$M.GwTnn1dhTdGlNDvTT6PuWpfym8kuMaJ/1M6IwoxGtXt4lVxi64a',
    'Andi Pratama',
    'Karyawan',
    (SELECT id FROM divisions WHERE name = 'Engineering'),
    '081100000004',
    'Jl. Tebet Barat No. 22, Jakarta',
    12.0,
    12.0,
    '2024-01-15',
    TRUE
),
(
    'karyawan2',
    'dewi.lestari@perusahaan.com',
    '$2a$10$M.GwTnn1dhTdGlNDvTT6PuWpfym8kuMaJ/1M6IwoxGtXt4lVxi64a',
    'Dewi Lestari',
    'Karyawan',
    (SELECT id FROM divisions WHERE name = 'Engineering'),
    '081100000005',
    'Jl. Pancoran Timur No. 8, Jakarta',
    12.0,
    12.0,
    '2024-06-01',
    TRUE
);

-- 3. Hubungkan Ketua Divisi sebagai leader_id Divisi Engineering
UPDATE divisions
SET leader_id = (SELECT id FROM users WHERE username = 'leader.eng'),
    updated_at = CURRENT_TIMESTAMP
WHERE name = 'Engineering';

-- 4. Jenis Cuti Awal (Minimal 3 Jenis Cuti sesuai aturan bisnis)
INSERT INTO leave_types (
    code,
    name,
    max_quota,
    min_submission_days,
    requires_attachment,
    deducts_annual_quota,
    requires_min_one_year_tenure,
    description,
    is_active
)
VALUES
(
    'ANNUAL',
    'Cuti Tahunan',
    12.0,
    3,
    FALSE,
    TRUE,
    TRUE,
    'Cuti tahunan 12 hari kerja/tahun. Wajib masa kerja minimal 1 tahun dan diajukan paling lambat H-3 sebelum tanggal mulai cuti.',
    TRUE
),
(
    'SICK',
    'Cuti Sakit',
    14.0,
    -3,
    TRUE,
    FALSE,
    FALSE,
    'Cuti sakit tidak memotong kuota tahunan. Wajib melampirkan surat keterangan dokter dan dapat diajukan dari H-0 hingga H+3.',
    TRUE
),
(
    'MARRIAGE',
    'Cuti Menikah',
    3.0,
    7,
    FALSE,
    FALSE,
    FALSE,
    'Cuti khusus pernikahan karyawan maksimal 3 hari kerja tanpa memotong kuota tahunan, diajukan minimal H-7.',
    TRUE
);

COMMIT;
