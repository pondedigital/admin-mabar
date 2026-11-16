import type { Session } from "@supabase/supabase-js";
import { normalizeEmail } from "./email";
import { supabase } from "./supabase/client";

/**
 * Accounts are created by the PONDE admin in the Supabase dashboard (paid
 * accounts), so there is deliberately no sign-up call in this app.
 */
export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({
    email: normalizeEmail(email),
    password,
  });
  if (error) throw error;
}

/** User-facing message for a failed sign-in. */
export function signInErrorMessage(error: unknown): string {
  const code = (error as { code?: string } | null)?.code;
  if (code === "email_not_confirmed") {
    return "Akun ini belum dikonfirmasi. Hubungi admin PONDE.";
  }
  if (code === "over_request_rate_limit" || code === "over_email_send_rate_limit") {
    return "Terlalu banyak percobaan. Tunggu beberapa menit lalu coba lagi.";
  }
  if (error instanceof TypeError) {
    return "Tidak bisa terhubung. Periksa koneksi internet kamu.";
  }
  // Generic on purpose: don't reveal whether the email exists.
  return "Gmail atau password salah.";
}

/** Result codes returned by the `claim_legacy_account` database function. */
export type ClaimResult =
  | "ok"
  | "invalid_email"
  | "invalid_credentials"
  | "locked"
  | "email_taken"
  | "already_claimed";

/**
 * Moves an old username-based account onto a Gmail address. The account id
 * stays the same, so PB access (pb_admins) and all session history are kept.
 * Verified server-side with the old username + password; no email is sent.
 */
export async function claimLegacyAccount(
  username: string,
  password: string,
  email: string
): Promise<ClaimResult> {
  const { data, error } = await supabase.rpc("claim_legacy_account", {
    p_username: username.trim(),
    p_password: password,
    p_new_email: normalizeEmail(email),
  });
  if (error) throw error;
  return data as ClaimResult;
}

export const CLAIM_MESSAGES: Record<Exclude<ClaimResult, "ok">, string> = {
  invalid_email: "Gunakan alamat Gmail (berakhiran @gmail.com).",
  invalid_credentials: "Username atau password lama salah.",
  locked: "Terlalu banyak percobaan gagal. Coba lagi 15 menit lagi.",
  email_taken: "Gmail ini sudah dipakai akun lain. Pakai Gmail lain atau hubungi admin PONDE.",
  already_claimed: "Akun ini sudah dipindah ke Gmail. Masuk pakai Gmail-nya.",
};

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

export async function getSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export function onAuthStateChange(callback: (session: Session | null) => void) {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => callback(session));
  return () => subscription.unsubscribe();
}
