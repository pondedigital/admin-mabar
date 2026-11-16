import { normalizeEmail } from "./email";
import { supabase } from "./supabase/client";

/** True only for accounts listed in `platform_admins` (checked server-side). */
export async function isPlatformAdmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc("is_platform_admin");
  if (error) throw error;
  return data === true;
}

export type AdminCreateResult =
  | "ok"
  | "forbidden"
  | "invalid_email"
  | "weak_password"
  | "invalid_pb"
  | "email_taken";

/**
 * Create a Gmail+password account and attach it to a PB (creating the PB if
 * the name is new). Only platform admins may call this; the database function
 * rejects everyone else.
 */
export async function adminCreateUser(
  email: string,
  password: string,
  pbName: string
): Promise<AdminCreateResult> {
  const { data, error } = await supabase.rpc("admin_create_user", {
    p_email: normalizeEmail(email),
    p_password: password,
    p_pb_name: pbName.trim(),
  });
  if (error) throw error;
  return data as AdminCreateResult;
}

export const ADMIN_CREATE_MESSAGES: Record<Exclude<AdminCreateResult, "ok">, string> = {
  forbidden: "Akun ini tidak punya akses admin.",
  invalid_email: "Gunakan alamat Gmail (berakhiran @gmail.com).",
  weak_password: "Password minimal 6 karakter.",
  invalid_pb: "Nama PB 2–60 karakter.",
  email_taken: "Email ini sudah terdaftar. Pakai email lain.",
};
