#!/usr/bin/env node
/**
 * Otium — Interactive One-Command Local Setup
 * Dijalankan via: npm run setup
 *
 * Fitur:
 * 1. Membuat file `.env` otomatis (DATABASE_URL aman + JWT_SECRET acak 64-hex).
 * 2. Membuat database PostgreSQL bila belum ada (menggunakan `pg`, tanpa ORM).
 * 3. Mengimpor skema & data awal dari `database/database.sql`.
 * 4. Memastikan direktori unggahan lokal (`public/uploads/*`) tersedia.
 */

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const readline = require("node:readline/promises");
const { stdin: input, stdout: output } = require("node:process");
const { Client } = require("pg");

const ROOT_DIR = path.resolve(__dirname, "..");
const ENV_PATH = path.join(ROOT_DIR, ".env");
const SQL_PATH = path.join(ROOT_DIR, "database", "database.sql");

const DB_NAME_REGEX = /^[a-zA-Z0-9_]+$/;

async function ask(rl, question, defaultValue = "") {
  const suffix = defaultValue ? ` [${defaultValue}]` : "";
  const answer = (await rl.question(`${question}${suffix}: `)).trim();
  return answer || defaultValue;
}

function buildConnectionString({ host, port, user, password, database }) {
  const encUser = encodeURIComponent(user);
  const encPass = encodeURIComponent(password);
  const auth = password ? `${encUser}:${encPass}` : encUser;
  return `postgresql://${auth}@${host}:${port}/${database}`;
}

function parseExistingEnv(envPath) {
  const raw = fs.readFileSync(envPath, "utf8");
  const values = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    values[key] = val;
  }
  return values;
}

function parseDatabaseUrl(urlStr) {
  const parsed = new URL(urlStr);
  const database = decodeURIComponent(parsed.pathname.replace(/^\/+/, ""));
  return {
    host: parsed.hostname || "localhost",
    port: parsed.port ? Number(parsed.port) : 5432,
    user: decodeURIComponent(parsed.username || "postgres"),
    password: decodeURIComponent(parsed.password || ""),
    database,
  };
}

function formatFriendlyError(error) {
  if (!error) return "Kesalahan tidak diketahui.";
  if (error.code === "ECONNREFUSED") {
    return "Tidak dapat terhubung ke PostgreSQL (ECONNREFUSED). Pastikan service PostgreSQL sudah menyala dan host/port sesuai.";
  }
  if (error.code === "28P01") {
    return "Username atau Password PostgreSQL salah (kode 28P01). Jalankan ulang `npm run setup` dengan kredensial yang benar.";
  }
  if (error.code === "28000") {
    return "Role/Username PostgreSQL tidak diizinkan masuk (kode 28000). Periksa kembali username PostgreSQL Anda.";
  }
  if (error.code === "ENOTFOUND") {
    return "Host PostgreSQL tidak ditemukan. Untuk penggunaan lokal, cukup tekan Enter untuk memakai default `localhost`.";
  }
  return error.message || String(error);
}

function ensureUploadDirs() {
  const dirs = [
    path.join(ROOT_DIR, "public", "uploads"),
    path.join(ROOT_DIR, "public", "uploads", "attachments"),
    path.join(ROOT_DIR, "public", "uploads", "avatars"),
  ];
  for (const dir of dirs) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function main() {
  console.log("\n========================================================");
  console.log("  OTIUM — Setup Otomatis Lingkungan Lokal (PostgreSQL)");
  console.log("========================================================");
  console.log("  Petunjuk: Tekan Enter langsung jika ingin memakai");
  console.log("  nilai bawaan yang tertulis di dalam tanda [...].\n");

  if (!fs.existsSync(SQL_PATH)) {
    console.error(`[ERROR] File SQL tidak ditemukan: ${SQL_PATH}`);
    process.exit(1);
  }

  const rl = readline.createInterface({ input, output });

  try {
    // 1. Konfigurasi .env & Kredensial PostgreSQL
    console.log("[Langkah 1/4] Konfigurasi Environment (.env) & PostgreSQL");
    let shouldWriteEnv = true;
    let dbConfig = null;

    if (fs.existsSync(ENV_PATH)) {
      const overwrite = await ask(
        rl,
        "File .env sudah ada. Buat ulang .env dengan konfigurasi baru? (y/N)",
        "N"
      );
      shouldWriteEnv = overwrite.toLowerCase() === "y";

      if (!shouldWriteEnv) {
        const existingEnv = parseExistingEnv(ENV_PATH);
        if (!existingEnv.DATABASE_URL) {
          throw new Error(
            "File .env eksisting tidak memiliki DATABASE_URL. Jalankan ulang `npm run setup` dan pilih `y` untuk membuat ulang .env."
          );
        }
        dbConfig = parseDatabaseUrl(existingEnv.DATABASE_URL);
        console.log(
          `[OK] Memakai konfigurasi dari .env eksisting (${dbConfig.host}:${dbConfig.port}/${dbConfig.database}).`
        );

        if (!existingEnv.JWT_SECRET) {
          const jwtSecret = crypto.randomBytes(32).toString("hex");
          fs.appendFileSync(ENV_PATH, `\nJWT_SECRET="${jwtSecret}"\n`, "utf8");
          console.log(
            "[OK] JWT_SECRET belum ada di .env — otomatis ditambahkan."
          );
        }
      }
    }

    if (shouldWriteEnv) {
      const host = await ask(rl, "PostgreSQL Host", "localhost");
      const portStr = await ask(rl, "PostgreSQL Port", "5432");
      const port = Number(portStr);
      if (!Number.isInteger(port) || port <= 0 || port > 65535) {
        throw new Error("Port PostgreSQL tidak valid (harus 1–65535).");
      }

      const user = await ask(rl, "PostgreSQL Username", "postgres");
      const password = await ask(
        rl,
        "PostgreSQL Password (kosongkan jika tidak memakai password)",
        ""
      );
      const database = await ask(rl, "Nama Database Otium", "otium_db");

      if (!DB_NAME_REGEX.test(database)) {
        throw new Error(
          "Nama database hanya boleh berisi huruf, angka, dan underscore (_)."
        );
      }

      dbConfig = { host, port, user, password, database };
      const databaseUrl = buildConnectionString(dbConfig);
      const jwtSecret = crypto.randomBytes(32).toString("hex");
      const envContent = [
        "# Generated by `npm run setup` — Otium",
        `DATABASE_URL="${databaseUrl}"`,
        `JWT_SECRET="${jwtSecret}"`,
        "",
      ].join("\n");
      fs.writeFileSync(ENV_PATH, envContent, { encoding: "utf8" });
      console.log("[OK] File .env berhasil dibuat dengan JWT_SECRET acak.");
    }

    const { host, port, user, password, database } = dbConfig;

    // 2. Pastikan direktori upload lokal tersedia
    console.log("\n[Langkah 2/4] Menyiapkan direktori unggahan lokal");
    ensureUploadDirs();
    console.log("[OK] Direktori public/uploads/ siap digunakan.");

    // 3. Cek & buat database jika belum ada (koneksi ke database 'postgres')
    console.log(
      `\n[Langkah 3/4] Menghubungi PostgreSQL (${host}:${port}) sebagai "${user}"...`
    );
    const adminClient = new Client({
      host,
      port,
      user,
      password: password || undefined,
      database: "postgres",
    });

    await adminClient.connect();
    try {
      const checkRes = await adminClient.query(
        "SELECT 1 FROM pg_database WHERE datname = $1",
        [database]
      );

      if (checkRes.rowCount === 0) {
        await adminClient.query(`CREATE DATABASE "${database}"`);
        console.log(`[OK] Database "${database}" berhasil dibuat.`);
      } else {
        console.log(`[INFO] Database "${database}" sudah tersedia.`);
      }
    } finally {
      await adminClient.end();
    }

    // 4. Konfirmasi & impor database/database.sql (DDL + Seed Data)
    console.log("\n[Langkah 4/4] Impor Skema 8 Tabel & Akun Demo Awal");
    const confirmSeed = await ask(
      rl,
      `Impor database/database.sql ke "${database}"? (WAJIB untuk instalasi baru; tabel lama akan di-reset) (Y/n)`,
      "Y"
    );

    let seededUsersCount = null;
    if (confirmSeed.toLowerCase() === "y") {
      const sqlScript = fs.readFileSync(SQL_PATH, "utf8");
      const targetClient = new Client({
        host,
        port,
        user,
        password: password || undefined,
        database,
      });

      await targetClient.connect();
      try {
        await targetClient.query(sqlScript);
        const verifyRes = await targetClient.query(
          "SELECT COUNT(*)::int AS total FROM users;"
        );
        seededUsersCount = Number(verifyRes.rows[0]?.total || 0);
        console.log(
          `[OK] Skema 8 tabel & data awal berhasil diimpor (${seededUsersCount} akun demo terverifikasi di tabel users).`
        );
      } finally {
        await targetClient.end();
      }
    } else {
      console.log(
        "[PERINGATAN] Impor database/database.sql dilewati. Jika login akun demo gagal, jalankan ulang `npm run setup` lalu pilih Y."
      );
    }

    // Ringkasan selesai
    console.log("\n========================================================");
    console.log("  SETUP SELESAI! Jalankan aplikasi dengan:");
    console.log("    npm run dev");
    console.log("  Lalu buka: http://localhost:3000/login");
    if (seededUsersCount !== null) {
      console.log("--------------------------------------------------------");
      console.log("  Akun Demo Awal (Password semua akun: password123):");
      console.log("    - Admin        : admin@perusahaan.com        (username: admin)");
      console.log("    - HRD          : hrd@perusahaan.com          (username: hrd)");
      console.log("    - Ketua Divisi : ketua.eng@perusahaan.com    (username: leader.eng)");
      console.log("    - Karyawan 1   : andi.pratama@perusahaan.com (username: karyawan1)");
      console.log("    - Karyawan 2   : dewi.lestari@perusahaan.com (username: karyawan2)");
    }
    console.log("========================================================\n");
  } catch (error) {
    console.error(`\n[ERROR] ${formatFriendlyError(error)}`);
    if (error?.message && formatFriendlyError(error) !== error.message) {
      console.error(`Detail teknis: ${error.message}`);
    }
    console.error(
      "Tips: Cek kembali layanan PostgreSQL & kredensial Anda, lalu jalankan ulang `npm run setup`.\n"
    );
    process.exitCode = 1;
  } finally {
    rl.close();
  }
}

main();
