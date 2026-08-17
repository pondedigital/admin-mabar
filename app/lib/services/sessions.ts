import { getLocalDate } from "../format";
import { supabase } from "../supabase/client";
import type { MabarSessionRow } from "../../types/db";

/**
 * Each PB has its own "one active mabar session at a time" — reuse the
 * most recent open session for this PB, or create it.
 */
export async function getOrCreateOpenSession(
  userId: string,
  pbId: number
): Promise<MabarSessionRow> {
  const { data: existing, error: fetchError } = await supabase
    .from("mabar_sessions")
    .select("*")
    .eq("pb_id", pbId)
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (fetchError) throw fetchError;
  if (existing) return existing as MabarSessionRow;

  const { data: created, error: createError } = await supabase
    .from("mabar_sessions")
    .insert({ pb_id: pbId, match_date: getLocalDate(), created_by: userId })
    .select("*")
    .single();
  if (createError) throw createError;
  return created as MabarSessionRow;
}

export type SessionSettingsPatch = Partial<
  Pick<
    MabarSessionRow,
    | "gor_name"
    | "match_date"
    | "num_courts"
    | "payment_mode"
    | "all_in_fee"
    | "shuttlecock_price"
    | "base_fee"
  >
>;

export async function updateSessionSettings(
  sessionId: number,
  patch: SessionSettingsPatch
): Promise<void> {
  const { error } = await supabase.from("mabar_sessions").update(patch).eq("id", sessionId);
  if (error) throw error;
}

/**
 * Mengakhiri sesi mabar — mengunci sesi ini (rekap & keuangan jadi read-only)
 * sehingga sesi baru bisa dimulai lewat getOrCreateOpenSession.
 */
export async function closeSession(sessionId: number): Promise<void> {
  const { error } = await supabase
    .from("mabar_sessions")
    .update({ status: "closed" })
    .eq("id", sessionId);
  if (error) throw error;
}
