"use server";

import path from "path";
import { unlink } from "fs/promises";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { query, withTransaction } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import {
  AVATAR_URL_PATTERN,
  isValidAvatarUrl,
  validatePasswordChange,
  validateProfileUpdate,
} from "@/lib/validators";
import { getProfilePageData } from "@/lib/shell-data";

/**
 * Menghapus file avatar lama di public/uploads/avatars secara aman (best-effort).
 * @param {string | null} oldAvatarUrl
 */
async function cleanupOldAvatarFile(oldAvatarUrl) {
  if (!oldAvatarUrl || !AVATAR_URL_PATTERN.test(oldAvatarUrl)) {
    return;
  }
  const fileName = path.basename(oldAvatarUrl);
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
    // Abaikan jika file sudah tidak ada di disk
  }
}

/**
 * Memperbarui informasi profil pengguna yang sedang login.
 * Non-Admin hanya boleh mengubah full_name, phone, address (proteksi privilege escalation).
 * Admin dapat memperbarui atribut administratif akunnya sendiri secara atomik.
 */
export async function updateProfileAction(payload) {
  try {
    const auth = await requireAuth();
    if (!auth.ok) {
      return { ok: false, error: auth.error };
    }

    const isAdmin = auth.user.role === "Admin";
    const validation = validateProfileUpdate(payload, { isAdmin });
    if (!validation.ok) {
      return {
        ok: false,
        error: validation.error,
        fieldErrors: validation.fieldErrors,
      };
    }

    const data = validation.data;

    if (!isAdmin) {
      await query(
        `
          UPDATE users
          SET
            full_name = $1,
            phone = $2,
            address = $3,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $4
            AND is_active = TRUE;
        `,
        [data.fullName, data.phone, data.address, auth.user.id]
      );
    } else {
      const txResult = await withTransaction(async (client) => {
        const lockedUserRes = await client.query(
          `
            SELECT id, initial_leave_quota, remaining_leave_quota
            FROM users
            WHERE id = $1
              AND is_active = TRUE
            FOR UPDATE;
          `,
          [auth.user.id]
        );

        const currentRow = lockedUserRes.rows[0];
        if (!currentRow) {
          return {
            ok: false,
            error: "Akun tidak ditemukan atau berstatus nonaktif.",
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
          [data.username, data.email, auth.user.id]
        );

        if (dupRes.rowCount > 0) {
          const dup = dupRes.rows[0];
          const fieldErrors = {};
          if (dup.username.toLowerCase() === data.username.toLowerCase()) {
            fieldErrors.username = "Username sudah digunakan oleh akun lain.";
          }
          if (dup.email.toLowerCase() === data.email.toLowerCase()) {
            fieldErrors.email = "Email sudah digunakan oleh akun lain.";
          }
          return {
            ok: false,
            error: "Username atau Email sudah terdaftar pada akun lain.",
            fieldErrors,
          };
        }

        if (data.divisionId !== null) {
          const divCheck = await client.query(
            `SELECT id FROM divisions WHERE id = $1 LIMIT 1;`,
            [data.divisionId]
          );
          if (divCheck.rowCount === 0) {
            return {
              ok: false,
              error: "Divisi yang dipilih tidak ditemukan.",
              fieldErrors: { divisionId: "Divisi tidak valid." },
            };
          }
        }

        // Opsi A: Sesuaikan remaining_leave_quota secara proporsional terhadap selisih kuota awal
        const oldInitial = Number(currentRow.initial_leave_quota);
        const oldRemaining = Number(currentRow.remaining_leave_quota);
        const delta = Number((data.initialLeaveQuota - oldInitial).toFixed(1));
        const nextRemaining = Math.max(
          0,
          Number((oldRemaining + delta).toFixed(1))
        );

        await client.query(
          `
            UPDATE users
            SET
              full_name = $1,
              phone = $2,
              address = $3,
              username = $4,
              email = $5,
              division_id = $6,
              join_date = $7,
              initial_leave_quota = $8,
              remaining_leave_quota = $9,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = $10;
          `,
          [
            data.fullName,
            data.phone,
            data.address,
            data.username,
            data.email,
            data.divisionId,
            data.joinDateIso,
            data.initialLeaveQuota,
            nextRemaining,
            auth.user.id,
          ]
        );

        return { ok: true };
      });

      if (!txResult.ok) {
        return txResult;
      }
    }

    revalidatePath("/profile");
    revalidatePath("/dashboard");
    revalidatePath("/", "layout");

    const refreshed = await getProfilePageData(auth.user.id);
    return {
      ok: true,
      message: "Perubahan profil berhasil disimpan.",
      profile: refreshed?.profile || null,
    };
  } catch (error) {
    console.error("updateProfileAction error:", error);
    return {
      ok: false,
      error: "Terjadi kesalahan saat menyimpan perubahan profil.",
    };
  }
}

/**
 * Menyimpan path avatar baru (atau menghapus avatar dengan null) ke PostgreSQL secara atomik
 * serta membersihkan file avatar lama dari disk.
 * @param {string | null} avatarUrl
 */
export async function updateAvatarAction(avatarUrl) {
  try {
    const auth = await requireAuth();
    if (!auth.ok) {
      return { ok: false, error: auth.error };
    }

    const normalizedUrl =
      avatarUrl === null || avatarUrl === "" ? null : String(avatarUrl).trim();

    if (!isValidAvatarUrl(normalizedUrl)) {
      return {
        ok: false,
        error: "Path foto profil tidak valid.",
      };
    }

    const txResult = await withTransaction(async (client) => {
      const currentRes = await client.query(
        `
          SELECT avatar_url
          FROM users
          WHERE id = $1
            AND is_active = TRUE
          FOR UPDATE;
        `,
        [auth.user.id]
      );

      if (currentRes.rowCount === 0) {
        return {
          ok: false,
          error: "Akun tidak ditemukan atau berstatus nonaktif.",
        };
      }

      const previousAvatarUrl = currentRes.rows[0].avatar_url;

      await client.query(
        `
          UPDATE users
          SET
            avatar_url = $1,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $2;
        `,
        [normalizedUrl, auth.user.id]
      );

      return { ok: true, previousAvatarUrl };
    });

    if (!txResult.ok) {
      return txResult;
    }

    if (
      txResult.previousAvatarUrl &&
      txResult.previousAvatarUrl !== normalizedUrl
    ) {
      await cleanupOldAvatarFile(txResult.previousAvatarUrl);
    }

    revalidatePath("/profile");
    revalidatePath("/", "layout");

    return {
      ok: true,
      avatarUrl: normalizedUrl,
      message: normalizedUrl
        ? "Foto profil berhasil diperbarui."
        : "Foto profil dihapus dan dikembalikan ke avatar inisial.",
    };
  } catch (error) {
    console.error("updateAvatarAction error:", error);
    return {
      ok: false,
      error: "Gagal memperbarui foto profil.",
    };
  }
}

/**
 * Mengubah password akun pengguna yang sedang login dengan verifikasi bcryptjs
 * dan penguncian baris (SELECT ... FOR UPDATE).
 */
export async function changePasswordAction(payload) {
  try {
    const auth = await requireAuth();
    if (!auth.ok) {
      return { ok: false, error: auth.error };
    }

    const validation = validatePasswordChange(payload);
    if (!validation.ok) {
      return {
        ok: false,
        error: validation.error,
        fieldErrors: validation.fieldErrors,
      };
    }

    const { currentPassword, newPassword } = validation.data;

    const txResult = await withTransaction(async (client) => {
      const userRes = await client.query(
        `
          SELECT id, password_hash
          FROM users
          WHERE id = $1
            AND is_active = TRUE
          FOR UPDATE;
        `,
        [auth.user.id]
      );

      const userRow = userRes.rows[0];
      if (!userRow) {
        return {
          ok: false,
          error: "Akun tidak ditemukan atau berstatus nonaktif.",
        };
      }

      const isCurrentValid = await bcrypt.compare(
        currentPassword,
        userRow.password_hash
      );
      if (!isCurrentValid) {
        return {
          ok: false,
          error: "Password saat ini tidak sesuai.",
          fieldErrors: {
            currentPassword: "Password saat ini tidak sesuai.",
          },
        };
      }

      const newHash = await bcrypt.hash(newPassword, 10);

      await client.query(
        `
          UPDATE users
          SET
            password_hash = $1,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $2;
        `,
        [newHash, auth.user.id]
      );

      return { ok: true };
    });

    if (!txResult.ok) {
      return txResult;
    }

    revalidatePath("/profile");

    return {
      ok: true,
      message: "Password akun Anda berhasil diperbarui.",
    };
  } catch (error) {
    console.error("changePasswordAction error:", error);
    return {
      ok: false,
      error: "Terjadi kesalahan saat memperbarui password.",
    };
  }
}
