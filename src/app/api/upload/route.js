import crypto from "crypto";
import path from "path";
import { mkdir, writeFile } from "fs/promises";
import { NextResponse } from "next/server";
import {
  SESSION_COOKIE_NAME,
  buildClearSessionCookieOptions,
  requireAuth,
} from "@/lib/auth";

const FOLDER_RULES = {
  avatars: {
    maxBytes: 2 * 1024 * 1024, // 2 MB
    maxLabel: "2 MB",
    allowedTypes: {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    },
  },
  attachments: {
    maxBytes: 5 * 1024 * 1024, // 5 MB
    maxLabel: "5 MB",
    allowedTypes: {
      "application/pdf": "pdf",
      "image/jpeg": "jpg",
      "image/png": "png",
    },
  },
};

/**
 * Validasi magic bytes (file signature) agar file spoofing dengan ekstensi palsu ditolak.
 * @param {Buffer} buffer
 * @param {string} mimeType
 */
function matchesMagicBytes(buffer, mimeType) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4) return false;

  if (mimeType === "image/jpeg") {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }

  if (mimeType === "image/png") {
    return (
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    );
  }

  if (mimeType === "image/webp") {
    return (
      buffer.length >= 12 &&
      buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
      buffer.subarray(8, 12).toString("ascii") === "WEBP"
    );
  }

  if (mimeType === "application/pdf") {
    return buffer.subarray(0, 5).toString("ascii") === "%PDF-";
  }

  return false;
}

/**
 * POST /api/upload
 * Menerima multipart/form-data { file: File, folder: 'avatars' | 'attachments' }
 * dan menyimpannya ke public/uploads/{folder}/.
 */
export async function POST(request) {
  try {
    const auth = await requireAuth();
    if (!auth.ok) {
      const response = NextResponse.json(
        { error: auth.error },
        { status: 401 }
      );
      response.cookies.set(
        SESSION_COOKIE_NAME,
        "",
        buildClearSessionCookieOptions()
      );
      return response;
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const rawFolder = String(formData.get("folder") || "").trim().toLowerCase();

    const rule = FOLDER_RULES[rawFolder];
    if (!rule) {
      return NextResponse.json(
        { error: "Folder tujuan unggahan tidak valid (harus avatars atau attachments)." },
        { status: 400 }
      );
    }

    if (!file || typeof file.arrayBuffer !== "function") {
      return NextResponse.json(
        { error: "File unggahan tidak ditemukan." },
        { status: 400 }
      );
    }

    const extension = rule.allowedTypes[file.type];
    if (!extension) {
      return NextResponse.json(
        {
          error:
            rawFolder === "avatars"
              ? "Format foto profil harus JPG, PNG, atau WEBP."
              : "Format lampiran harus PDF, JPG, atau PNG.",
        },
        { status: 400 }
      );
    }

    if (file.size <= 0) {
      return NextResponse.json(
        { error: "File unggahan tidak boleh kosong." },
        { status: 400 }
      );
    }

    if (file.size > rule.maxBytes) {
      return NextResponse.json(
        { error: `Ukuran file maksimal ${rule.maxLabel}.` },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (!matchesMagicBytes(buffer, file.type)) {
      return NextResponse.json(
        { error: "Isi file tidak sesuai dengan format yang diizinkan." },
        { status: 400 }
      );
    }

    const uniqueName = `${Date.now()}-${crypto.randomUUID()}.${extension}`;
    const targetDir = path.join(process.cwd(), "public", "uploads", rawFolder);
    const targetPath = path.join(targetDir, uniqueName);

    await mkdir(targetDir, { recursive: true });
    await writeFile(targetPath, buffer);

    return NextResponse.json(
      {
        success: true,
        url: `/uploads/${rawFolder}/${uniqueName}`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/upload error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat mengunggah file." },
      { status: 500 }
    );
  }
}
