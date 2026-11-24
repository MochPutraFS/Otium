-- ============================================================================
-- DATABASE SCHEMA (DDL) - SISTEM MANAJEMEN CUTI KARYAWAN
-- Engine: PostgreSQL (100% Raw SQL, Tanpa ORM)
-- ============================================================================

-- Bersihkan tabel jika sudah ada (urutan terbalik dari dependensi Foreign Key)
DROP TABLE IF EXISTS blackout_periods CASCADE;
DROP TABLE IF EXISTS holidays CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS leave_approvals CASCADE;
DROP TABLE IF EXISTS leave_requests CASCADE;
DROP TABLE IF EXISTS leave_types CASCADE;
ALTER TABLE IF EXISTS divisions DROP CONSTRAINT IF EXISTS fk_division_leader;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS divisions CASCADE;

-- 1. TABEL DIVISIONS (Master Divisi)
CREATE TABLE divisions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    leader_id INTEGER UNIQUE, -- Constraint UNIQUE: 1 Ketua Divisi maks memimpin 1 Divisi
    max_concurrent_leave_pct INTEGER NOT NULL DEFAULT 30
        CHECK (max_concurrent_leave_pct BETWEEN 1 AND 100),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. TABEL USERS (Pengguna: Admin, Karyawan, Ketua Divisi, HRD)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    role VARCHAR(20) NOT NULL
        CHECK (role IN ('Admin', 'Karyawan', 'Ketua Divisi', 'HRD')),
    division_id INTEGER
        REFERENCES divisions(id) ON DELETE SET NULL ON UPDATE CASCADE,
    phone VARCHAR(30),
    address TEXT,
    avatar_url VARCHAR(255),
    initial_leave_quota NUMERIC(4,1) NOT NULL DEFAULT 12.0
        CHECK (initial_leave_quota >= 0),
    remaining_leave_quota NUMERIC(4,1) NOT NULL DEFAULT 12.0
        CHECK (remaining_leave_quota >= 0),
    join_date DATE NOT NULL DEFAULT CURRENT_DATE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tambahkan Foreign Key leader_id pada tabel divisions setelah tabel users dibuat
ALTER TABLE divisions
ADD CONSTRAINT fk_division_leader
FOREIGN KEY (leader_id) REFERENCES users(id)
ON DELETE SET NULL ON UPDATE CASCADE;

-- 3. TABEL LEAVE_TYPES (Konfigurasi Jenis Cuti Dinamis)
CREATE TABLE leave_types (
    id SERIAL PRIMARY KEY,
    code VARCHAR(30) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL UNIQUE,
    max_quota NUMERIC(4,1) NOT NULL DEFAULT 12.0
        CHECK (max_quota > 0),
    min_submission_days INTEGER NOT NULL DEFAULT 0,
    requires_attachment BOOLEAN NOT NULL DEFAULT FALSE,
    deducts_annual_quota BOOLEAN NOT NULL DEFAULT TRUE,
    requires_min_one_year_tenure BOOLEAN NOT NULL DEFAULT FALSE,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. TABEL LEAVE_REQUESTS (Transaksi Pengajuan Cuti)
CREATE TABLE leave_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL
        REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    leave_type_id INTEGER NOT NULL
        REFERENCES leave_types(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    is_half_day BOOLEAN NOT NULL DEFAULT FALSE,
    submission_date DATE NOT NULL DEFAULT CURRENT_DATE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days NUMERIC(4,1) NOT NULL
        CHECK (total_days > 0),
    reason TEXT NOT NULL,
    handover_user_id INTEGER
        REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    handover_notes TEXT NOT NULL,
    attachment_url VARCHAR(255),
    leave_address TEXT NOT NULL,
    emergency_phone VARCHAR(30) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'Pending'
        CHECK (status IN ('Pending', 'Approved by Leader', 'Approved', 'Rejected', 'Cancelled')),

    -- Jejak Verifikasi Tahap 1 (Ketua Divisi)
    leader_approver_id INTEGER
        REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    leader_approved_at TIMESTAMP,
    leader_notes TEXT,

    -- Jejak Persetujuan Final Tahap 2 (HRD)
    hrd_approver_id INTEGER
        REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    hrd_approved_at TIMESTAMP,
    hrd_notes TEXT,

    -- Detail Penolakan & Pembatalan
    rejected_by_role VARCHAR(20)
        CHECK (rejected_by_role IS NULL OR rejected_by_role IN ('Ketua Divisi', 'HRD')),
    rejection_reason TEXT,
    cancellation_reason TEXT,
    cancelled_at TIMESTAMP,

    -- Flag Transaksi Atomik Pemotongan & Auto-Refund Kuota
    quota_deducted BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Constraint Integritas Tanggal & Alasan Wajib
    CONSTRAINT chk_leave_dates CHECK (end_date >= start_date),
    CONSTRAINT chk_half_day_single_date CHECK (NOT is_half_day OR (start_date = end_date AND total_days = 0.5)),
    CONSTRAINT chk_rejection_reason_required CHECK (status <> 'Rejected' OR (rejection_reason IS NOT NULL AND LENGTH(TRIM(rejection_reason)) > 0)),
    CONSTRAINT chk_cancellation_reason_required CHECK (status <> 'Cancelled' OR (cancellation_reason IS NOT NULL AND LENGTH(TRIM(cancellation_reason)) > 0))
);

-- 5. TABEL LEAVE_APPROVALS (Riwayat & Audit Log Verifikasi Berjenjang)
CREATE TABLE leave_approvals (
    id SERIAL PRIMARY KEY,
    leave_request_id INTEGER NOT NULL
        REFERENCES leave_requests(id) ON DELETE CASCADE ON UPDATE CASCADE,
    approver_id INTEGER
        REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    approver_name_snapshot VARCHAR(150) NOT NULL,
    approver_role VARCHAR(20) NOT NULL
        CHECK (approver_role IN ('Ketua Divisi', 'HRD')),
    approval_stage INTEGER NOT NULL
        CHECK (approval_stage IN (1, 2)),
    action VARCHAR(20) NOT NULL
        CHECK (action IN ('Approved', 'Rejected')),
    notes TEXT,
    acted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_request_approval_stage UNIQUE (leave_request_id, approval_stage),
    CONSTRAINT chk_approval_reject_notes CHECK (action <> 'Rejected' OR (notes IS NOT NULL AND LENGTH(TRIM(notes)) > 0))
);

-- 6. TABEL NOTIFICATIONS (Notifikasi Handover & Pengingat)
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL
        REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    leave_request_id INTEGER
        REFERENCES leave_requests(id) ON DELETE CASCADE ON UPDATE CASCADE,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7. TABEL HOLIDAYS (Master Hari Libur Nasional & Cuti Bersama)
CREATE TABLE holidays (
    id SERIAL PRIMARY KEY,
    holiday_date DATE NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    holiday_type VARCHAR(30) NOT NULL DEFAULT 'National Holiday'
        CHECK (holiday_type IN ('National Holiday', 'Collective Leave')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by INTEGER
        REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 8. TABEL BLACKOUT_PERIODS (Periode Larangan Cuti Perusahaan / Divisi - Fase 2)
CREATE TABLE blackout_periods (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT NOT NULL,
    division_id INTEGER
        REFERENCES divisions(id) ON DELETE CASCADE ON UPDATE CASCADE, -- NULL = seluruh perusahaan
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by INTEGER
        REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_blackout_dates CHECK (end_date >= start_date)
);

-- Indeks Performa untuk Query Filter, Anti-Overlap, dan Antrean Approval
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_division_id ON users(division_id);
CREATE INDEX idx_leave_requests_user_status ON leave_requests(user_id, status);
CREATE INDEX idx_leave_requests_date_range ON leave_requests(user_id, start_date, end_date);
CREATE INDEX idx_leave_requests_status ON leave_requests(status);
CREATE INDEX idx_leave_approvals_request_id ON leave_approvals(leave_request_id);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read);
CREATE INDEX idx_holidays_date_active ON holidays(holiday_date, is_active);
CREATE INDEX idx_blackout_dates_active ON blackout_periods(start_date, end_date, is_active);
