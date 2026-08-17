import { getLocalDate } from "../format";
import { supabase } from "../supabase/client";
import type { MabarSessionRow } from "../../types/db";

/**
 * The app has only ever one active mabar session at a time (no session
 * picker in the UI yet) — reuse the most recent open one, or create it.
 */
export async function getOrCreateOpenSession(userId: string): Promise<MabarSessionRow> {
  const { data: existing, error: fetchError } = await supabase
    .from("mabar_sessions")
    .select("*")
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (fetchError) throw fetchError;
  if (existing) return existing as MabarSessionRow;

  const { data: created, error: createError } = await supabase
    .from("mabar_sessions")
    .insert({ match_date: getLocalDate(), created_by: userId })
    .select("*")
    .single();
  if (createError) throw createError;
  return created as MabarSessionRow;
}

export type SessionSettingsPatch = Partial<
  Pick<
    MabarSessionRow,
    | "gor_name"
    | "pb_name"
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
