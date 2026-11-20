"use server";

import path from "path";
import { unlink } from "fs/promises";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { withTransaction } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import {
  AVATAR_URL_PATTERN,
  PROTECTED_USER_ROLES,
  isPositiveInt,
  validateAdminUserPayload,
} from "@/lib/validators";

/**
 * Menghapus file avatar lokal milik user yang dihapus (best-effort, tidak menggagalkan transaksi).
 * @param {string | null} avatarUrl
 */
async function cleanupAvatarFile(avatarUrl) {
  if (!avatarUrl || !AVATAR_URL_PATTERN.test(avatarUrl)) {
    return;
  }
  const fileName = path.basename(avatarUrl);
  const fullPath = path.join(
    process.cwd(),
    "public",
    "uploads",
    "avatars",
    fileName
  );
  try {
    await unlink(fullPath);
  } catch {
    // Abaikan bila file sudah tidak ada di disk
  }
}

/**
 * Menerjemahkan error constraint unik PostgreSQL (23505) menjadi fieldErrors yang ramah UI.
 * @param {any} error
 */
function mapUniqueViolationError(error) {
  if (!error || error.code !== "23505") return null;
  const constraint = String(error.constraint || "").toLowerCase();
  if (constraint.includes("username")) {
    return {
      ok: false,
      status: 409,
      error: "Username sudah digunakan oleh akun lain.",
      fieldErrors: { username: "Username sudah digunakan oleh akun lain." },
    };
  }
  if (constraint.includes("email")) {
    return {
      ok: false,
      status: 409,
      error: "Email sudah terdaftar pada akun lain.",
      fieldErrors: { email: "Email sudah terdaftar pada akun lain." },
    };
  }
  return {
    ok: false,
    status: 409,
    error: "Username atau Email sudah terdaftar pada akun lain.",
  };
}

/**
 * CMS Modul 1 — Create User Baru (Khusus Admin).
 * Memvalidasi payload, mengecek keunikan username/email & validitas divisi,
 * meng-hash password dengan bcryptjs, lalu menyisipkan baris ke tabel users dalam transaksi atomik.
 * @param {object} payload
 */
export async function createUserAction(payload) {
  try {
    const auth = await requireRole(["Admin"]);
    if (!auth.ok) {
      return { ok: false, status: auth.status, error: auth.error };
    }

    const validation = validateAdminUserPayload(payload, { mode: "create" });
    if (!validation.ok) {
      return {
        ok: false,
        status: validation.status,
        error: validation.error,
        fieldErrors: validation.fieldErrors,
      };
    }

    const data = validation.data;
    const passwordHash = await bcrypt.hash(data.password, 10);

    const txResult = await withTransaction(async (client) => {
      const dupRes = await client.query(
        `
          SELECT id, username, email
          FROM users
          WHERE LOWER(username) = LOWER($1)
             OR LOWER(email) = LOWER($2)
          LIMIT 1;
        `,
        [data.username, data.email]
      );

      if (dupRes.rowCount > 0) {
        const dup = dupRes.rows[0];
        const fieldErrors = {};
        if (dup.username.toLowerCase() === data.username) {
          fieldErrors.username = "Username sudah digunakan oleh akun lain.";
        }
        if (dup.email.toLowerCase() === data.email) {
          fieldErrors.email = "Email sudah terdaftar pada akun lain.";
        }
        return {
          ok: false,
          status: 409,
          error: "Username atau Email sudah terdaftar pada akun lain.",
          fieldErrors,
        };
      }

      if (data.divisionId !== null) {
        const divRes = await client.query(
          `SELECT id FROM divisions WHERE id = $1 LIMIT 1;`,
          [data.divisionId]
        );
        if (divRes.rowCount === 0) {
          return {
            ok: false,
            status: 400,
            error: "Divisi yang dipilih tidak ditemukan.",
            fieldErrors: { divisionId: "Divisi tidak valid." },
          };
        }
      }

      const insertRes = await client.query(
        `
          INSERT INTO users (
            username,
            email,
            password_hash,
            full_name,
            role,
            division_id,
            initial_leave_quota,
            remaining_leave_quota,
            join_date,
            is_active
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $7, $8, $9)
          RETURNING id, full_name, role;
        `,
        [
          data.username,
          data.email,
          passwordHash,
          data.fullName,
          data.role,
          data.divisionId,
          data.initialLeaveQuota,
          data.joinDate,
          data.isActive,
        ]
      );

      return {
        ok: true,
        user: insertRes.rows[0],
      };
    });

    if (!txResult.ok) {
      return txResult;
    }

    revalidatePath("/admin/users");
    revalidatePath("/admin/divisions");
    revalidatePath("/admin/division-members");
    revalidatePath("/dashboard");

    return {
      ok: true,
      id: txResult.user.id,
      message: `Pengguna "${txResult.user.full_name}" berhasil ditambahkan.`,
    };
  } catch (error) {
    const mapped = mapUniqueViolationError(error);
    if (mapped) return mapped;
    console.error("createUserAction error:", error);
    return {
      ok: false,
      status: 500,
      error: "Terjadi kesalahan saat menambahkan pengguna baru.",
    };
  }
}

/**
 * CMS Modul 1 — Update Data Pengguna (Khusus Admin).
 * Menggunakan transaksi atomik + SELECT ... FOR UPDATE, menerapkan proteksi anti-self-lockout,
 * dan otomatis melepas divisions.leader_id jika Ketua Divisi diubah role-nya atau dinonaktifkan.
 * @param {number} userId
 * @param {object} payload
 */
export async function updateUserAction(userId, payload) {
  try {
    const auth = await requireRole(["Admin"]);
    if (!auth.ok) {
      return { ok: false, status: auth.status, error: auth.error };
    }

    if (!isPositiveInt(userId)) {
      return { ok: false, status: 400, error: "ID pengguna tidak valid." };
    }

    const targetId = Number(userId);
    const validation = validateAdminUserPayload(payload, { mode: "edit" });
    if (!validation.ok) {
      return {
        ok: false,
        status: validation.status,
        error: validation.error,
        fieldErrors: validation.fieldErrors,
      };
    }

    const data = validation.data;

    // Proteksi Anti-Self-Lockout: Admin tidak boleh menurunkan role atau menonaktifkan akunnya sendiri
    if (targetId === auth.user.id) {
      if (data.role !== "Admin") {
        return {
          ok: false,
          status: 403,
          error: "Anda tidak dapat mengubah role akun Admin Anda sendiri.",
          fieldErrors: {
            role: "Role akun Anda sendiri dikunci untuk mencegah hilangnya akses Admin.",
          },
        };
      }
      if (!data.isActive) {
        return {
          ok: false,
          status: 403,
          error: "Anda tidak dapat menonaktifkan akun Anda sendiri.",
          fieldErrors: {
            isActive: "Status aktif akun Anda sendiri tidak dapat dimatikan.",
          },
        };
      }
    }

    const newPasswordHash = data.password
      ? await bcrypt.hash(data.password, 10)
      : null;

    const txResult = await withTransaction(async (client) => {
      const lockRes = await client.query(
        `
          SELECT id, role, is_active, division_id
          FROM users
          WHERE id = $1
          FOR UPDATE;
        `,
        [targetId]
      );

      if (lockRes.rowCount === 0) {
        return {
          ok: false,
          status: 404,
          error: "Data pengguna tidak ditemukan.",
        };
      }

      const dupRes = await client.query(
        `
          SELECT id, username, email
          FROM users
          WHERE (LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($2))
            AND id <> $3
          LIMIT 1;
        `,
        [data.username, data.email, targetId]
      );

      if (dupRes.rowCount > 0) {
        const dup = dupRes.rows[0];
        const fieldErrors = {};
        if (dup.username.toLowerCase() === data.username) {
          fieldErrors.username = "Username sudah digunakan oleh akun lain.";
        }
        if (dup.email.toLowerCase() === data.email) {
          fieldErrors.email = "Email sudah terdaftar pada akun lain.";
        }
        return {
          ok: false,
          status: 409,
          error: "Username atau Email sudah terdaftar pada akun lain.",
          fieldErrors,
        };
      }

      if (data.divisionId !== null) {
        const divRes = await client.query(
          `SELECT id FROM divisions WHERE id = $1 LIMIT 1;`,
          [data.divisionId]
        );
        if (divRes.rowCount === 0) {
          return {
            ok: false,
            status: 400,
            error: "Divisi yang dipilih tidak ditemukan.",
            fieldErrors: { divisionId: "Divisi tidak valid." },
          };
        }
      }

      const updateRes = await client.query(
        `
          UPDATE users
          SET
            username = $1,
            email = $2,
            full_name = $3,
            role = $4,
            division_id = $5,
            initial_leave_quota = $6,
            remaining_leave_quota = $7,
            join_date = $8,
            is_active = $9,
            password_hash = COALESCE($10, password_hash),
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $11
          RETURNING id, full_name, role;
        `,
        [
          data.username,
          data.email,
          data.fullName,
          data.role,
          data.divisionId,
          data.initialLeaveQuota,
          data.remainingLeaveQuota,
          data.joinDate,
          data.isActive,
          newPasswordHash,
          targetId,
        ]
      );

      let releasedDivisionName = null;
      if (data.role !== "Ketua Divisi" || !data.isActive) {
        const releaseRes = await client.query(
          `
            UPDATE divisions
            SET
              leader_id = NULL,
              updated_at = CURRENT_TIMESTAMP
            WHERE leader_id = $1
            RETURNING name;
          `,
          [targetId]
        );
        if (releaseRes.rowCount > 0) {
          releasedDivisionName = releaseRes.rows[0].name;
        }
      }

      return {
        ok: true,
        user: updateRes.rows[0],
        releasedDivisionName,
      };
    });

    if (!txResult.ok) {
      return txResult;
    }

    revalidatePath("/admin/users");
    revalidatePath("/admin/divisions");
    revalidatePath("/admin/division-members");
    revalidatePath("/dashboard");
    revalidatePath("/profile");

    const suffix = txResult.releasedDivisionName
      ? ` Posisi Ketua Divisi pada ${txResult.releasedDivisionName} telah dilepas otomatis.`
      : "";

    return {
      ok: true,
      message: `Data pengguna "${txResult.user.full_name}" berhasil diperbarui.${suffix}`,
    };
  } catch (error) {
    const mapped = mapUniqueViolationError(error);
    if (mapped) return mapped;
    console.error("updateUserAction error:", error);
    return {
      ok: false,
      status: 500,
      error: "Terjadi kesalahan saat memperbarui data pengguna.",
    };
  }
}

/**
 * CMS Modul 1 — Hapus Pengguna (Khusus Admin).
 * Garda mutlak: hanya mengizinkan penghapusan role 'Karyawan' dan 'Ketua Divisi'.
 * Menolak keras penghapusan akun 'Admin', 'HRD', dan akun milik diri sendiri.
 * @param {number} userId
 */
export async function deleteUserAction(userId) {
  try {
    const auth = await requireRole(["Admin"]);
    if (!auth.ok) {
      return { ok: false, status: auth.status, error: auth.error };
    }

    if (!isPositiveInt(userId)) {
      return { ok: false, status: 400, error: "ID pengguna tidak valid." };
    }

    const targetId = Number(userId);
    if (targetId === auth.user.id) {
      return {
        ok: false,
        status: 403,
        error: "Anda tidak dapat menghapus akun Anda sendiri.",
      };
    }

    const txResult = await withTransaction(async (client) => {
      const lockRes = await client.query(
        `
          SELECT id, full_name, role, avatar_url
          FROM users
          WHERE id = $1
          FOR UPDATE;
        `,
        [targetId]
      );

      if (lockRes.rowCount === 0) {
        return {
          ok: false,
          status: 404,
          error: "Akun pengguna tidak ditemukan.",
        };
      }

      const targetUser = lockRes.rows[0];
      if (PROTECTED_USER_ROLES.includes(targetUser.role)) {
        return {
          ok: false,
          status: 403,
          error: "Akun Admin dan HRD diproteksi dan tidak dapat dihapus.",
        };
      }

      await client.query(
        `
          UPDATE divisions
          SET
            leader_id = NULL,
            updated_at = CURRENT_TIMESTAMP
          WHERE leader_id = $1;
        `,
        [targetId]
      );

      const deleteRes = await client.query(
        `
          DELETE FROM users
          WHERE id = $1
            AND role IN ('Karyawan', 'Ketua Divisi')
          RETURNING id, full_name, role;
        `,
        [targetId]
      );

      if (deleteRes.rowCount === 0) {
        return {
          ok: false,
          status: 403,
          error: "Akun tidak dapat dihapus karena status proteksi role.",
        };
      }

      return {
        ok: true,
        deletedUser: deleteRes.rows[0],
        avatarUrl: targetUser.avatar_url,
      };
    });

    if (!txResult.ok) {
      return txResult;
    }

    if (txResult.avatarUrl) {
      await cleanupAvatarFile(txResult.avatarUrl);
    }

    revalidatePath("/admin/users");
    revalidatePath("/admin/divisions");
    revalidatePath("/admin/division-members");
    revalidatePath("/dashboard");

    return {
      ok: true,
      message: `Akun "${txResult.deletedUser.full_name}" berhasil dihapus.`,
    };
  } catch (error) {
    console.error("deleteUserAction error:", error);
    return {
      ok: false,
      status: 500,
      error: "Terjadi kesalahan saat menghapus akun pengguna.",
    };
  }
}
