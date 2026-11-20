import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

/**
 * Titik masuk utama aplikasi (Root Redirector).
 * Mengarahkan pengguna ke /dashboard jika sudah memiliki sesi aktif, atau ke /login jika belum.
 */
export default async function HomePage() {
  const session = await getSession();
  if (session) {
    redirect("/dashboard");
  }
  redirect("/login");
}
