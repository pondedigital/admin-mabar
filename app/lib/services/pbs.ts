import { supabase } from "../supabase/client";

export interface PbOption {
  id: number;
  name: string;
}

/** PBs (clubs) this admin is allowed to handle, per `pb_admins`. */
export async function listMyPbs(userId: string): Promise<PbOption[]> {
  const { data, error } = await supabase
    .from("pb_admins")
    .select("pbs(id, name)")
    .eq("admin_id", userId);
  if (error) throw error;

  const options = ((data ?? []) as unknown as { pbs: PbOption | null }[])
    .map((row) => row.pbs)
    .filter((pb): pb is PbOption => pb !== null);
  options.sort((a, b) => a.name.localeCompare(b.name));
  return options;
}

export type CreatePbError = "name_taken" | "invalid_name" | "already_has_pb" | "not_signed_in";

/**
 * Creates a PB and makes the signed-in user its admin, via the
 * `create_my_pb` database function (only allowed while the user has no PB).
 */
export async function createMyPb(name: string): Promise<number> {
  const { data, error } = await supabase.rpc("create_my_pb", { p_name: name.trim() });
  if (error) throw error;
  return data as number;
}

export const CREATE_PB_MESSAGES: Record<CreatePbError, string> = {
  name_taken: "Nama PB ini sudah dipakai. Coba nama lain.",
  invalid_name: "Nama PB 2–60 karakter.",
  already_has_pb: "Akun ini sudah punya PB. Muat ulang halaman.",
  not_signed_in: "Sesi login habis. Silakan masuk lagi.",
};

/** Maps the database function's error message (its code) to user copy. */
export function createPbErrorMessage(error: unknown): string {
  const message = (error as { message?: string } | null)?.message ?? "";
  const code = (Object.keys(CREATE_PB_MESSAGES) as CreatePbError[]).find((c) => message.includes(c));
  return code ? CREATE_PB_MESSAGES[code] : "Gagal membuat PB. Coba lagi.";
}
