import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import {
  SESSION_COOKIE_NAME,
  buildClearSessionCookieOptions,
  requireAuth,
} from "@/lib/auth";
import { isPositiveInt } from "@/lib/validators";
import { mapNotificationRow } from "@/lib/shell-data";

function unauthorizedResponse(message) {
  const response = NextResponse.json({ error: message }, { status: 401 });
  response.cookies.set(
    SESSION_COOKIE_NAME,
    "",
    buildClearSessionCookieOptions()
  );
  return response;
}

/**
 * GET /api/notifications
 * Mengambil 15 notifikasi terbaru & jumlah belum dibaca milik user yang sedang login.
 */
export async function GET() {
  try {
    const auth = await requireAuth();
    if (!auth.ok) {
      return unauthorizedResponse(auth.error);
    }

    const [listRes, unreadRes] = await Promise.all([
      query(
        `
          SELECT id, leave_request_id, title, message, is_read, created_at
          FROM notifications
          WHERE user_id = $1
          ORDER BY created_at DESC, id DESC
          LIMIT 15;
        `,
        [auth.user.id]
      ),
      query(
        `
          SELECT COUNT(*)::int AS unread_count
          FROM notifications
          WHERE user_id = $1
            AND is_read = FALSE;
        `,
        [auth.user.id]
      ),
    ]);

    return NextResponse.json(
      {
        notifications: listRes.rows.map(mapNotificationRow),
        unreadCount: Number(unreadRes.rows[0]?.unread_count || 0),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/notifications error:", error);
    return NextResponse.json(
      { error: "Gagal memuat daftar notifikasi." },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/notifications
 * Menandai 1 notifikasi ({ notificationId }) atau seluruh notifikasi ({ markAllRead: true })
 * milik user yang sedang login sebagai sudah dibaca.
 */
export async function PATCH(request) {
  try {
    const auth = await requireAuth();
    if (!auth.ok) {
      return unauthorizedResponse(auth.error);
    }

    let body = null;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Payload JSON tidak valid." },
        { status: 400 }
      );
    }

    if (body?.markAllRead === true) {
      await query(
        `
          UPDATE notifications
          SET is_read = TRUE
          WHERE user_id = $1
            AND is_read = FALSE;
        `,
        [auth.user.id]
      );
    } else if (body?.notificationId !== undefined) {
      if (!isPositiveInt(body.notificationId)) {
        return NextResponse.json(
          { error: "ID notifikasi tidak valid." },
          { status: 400 }
        );
      }

      const updateRes = await query(
        `
          UPDATE notifications
          SET is_read = TRUE
          WHERE id = $1
            AND user_id = $2
          RETURNING id, is_read;
        `,
        [Number(body.notificationId), auth.user.id]
      );

      if (updateRes.rowCount === 0) {
        return NextResponse.json(
          { error: "Notifikasi tidak ditemukan atau bukan milik Anda." },
          { status: 404 }
        );
      }
    } else {
      return NextResponse.json(
        { error: "Sertakan notificationId atau markAllRead: true." },
        { status: 400 }
      );
    }

    const unreadRes = await query(
      `
        SELECT COUNT(*)::int AS unread_count
        FROM notifications
        WHERE user_id = $1
          AND is_read = FALSE;
      `,
      [auth.user.id]
    );

    return NextResponse.json(
      {
        success: true,
        unreadCount: Number(unreadRes.rows[0]?.unread_count || 0),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("PATCH /api/notifications error:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui status notifikasi." },
      { status: 500 }
    );
  }
}
