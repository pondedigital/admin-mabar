import { supabase } from "../supabase/client";
import type { Player, PaymentMethod, PlayerLevel, PlayerPayment } from "../../types/mabar";

export interface RosterPlayer {
  id: number;
  name: string;
  level: PlayerLevel;
}

/** The whole club roster (shared across every PB) — used for add-player autocomplete/dedup. */
export async function listRoster(): Promise<RosterPlayer[]> {
  const { data, error } = await supabase
    .from("players")
    .select("id, name, default_level")
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => ({ id: row.id, name: row.name, level: row.default_level }));
}

interface SessionPlayerRow {
  player_id: number;
  level_at_session: PlayerLevel;
  present: boolean;
  pairing_offset: number;
  adjustment: number;
  paid: boolean;
  payment_method: PaymentMethod | null;
  players: { name: string } | null;
}

export interface SessionPlayerData {
  players: Player[];
  adjustments: Record<number, number>;
  payments: Record<number, PlayerPayment>;
}

/** Everyone attending this mabar session, joined with the (global) roster's name. */
export async function listSessionPlayers(sessionId: number): Promise<SessionPlayerData> {
  const { data, error } = await supabase
    .from("mabar_session_players")
    .select(
      "player_id, level_at_session, present, pairing_offset, adjustment, paid, payment_method, players(name)"
    )
    .eq("mabar_session_id", sessionId);
  if (error) throw error;

  const rows = (data ?? []) as unknown as SessionPlayerRow[];
  const players: Player[] = rows.map((row) => ({
    id: row.player_id,
    name: row.players?.name ?? "",
    present: row.present,
    level: row.level_at_session,
    pairingOffset: row.pairing_offset,
  }));
  const adjustments = Object.fromEntries(rows.map((row) => [row.player_id, row.adjustment]));
  const payments = Object.fromEntries(
    rows.map((row) => [
      row.player_id,
      { paid: row.paid, method: row.payment_method ?? "cash" } satisfies PlayerPayment,
    ])
  );

  return { players, adjustments, payments };
}

/** Adds a player to the club roster and to this mabar session in one go. */
export async function addPlayer(
  sessionId: number,
  name: string,
  level: PlayerLevel,
  pairingOffset: number
): Promise<Player> {
  const { data: playerRow, error: playerError } = await supabase
    .from("players")
    .insert({ name, default_level: level })
    .select("id, name")
    .single();
  if (playerError) throw playerError;

  const { error: spError } = await supabase.from("mabar_session_players").insert({
    mabar_session_id: sessionId,
    player_id: playerRow.id,
    level_at_session: level,
    present: true,
    pairing_offset: pairingOffset,
  });
  if (spError) throw spError;

  return {
    id: playerRow.id,
    name: playerRow.name,
    present: true,
    level,
    pairingOffset,
  };
}

/** Adds a player who's already on the roster to this session, without duplicating the roster row. */
export async function addExistingPlayerToSession(
  sessionId: number,
  playerId: number,
  playerName: string,
  level: PlayerLevel,
  pairingOffset: number
): Promise<Player> {
  const { error } = await supabase.from("mabar_session_players").insert({
    mabar_session_id: sessionId,
    player_id: playerId,
    level_at_session: level,
    present: true,
    pairing_offset: pairingOffset,
  });
  if (error) throw error;

  return { id: playerId, name: playerName, present: true, level, pairingOffset };
}

/** Updates both the roster default and this session's level, keeping them in sync. */
export async function updatePlayerLevel(
  sessionId: number,
  playerId: number,
  level: PlayerLevel
): Promise<void> {
  const [rosterResult, sessionResult] = await Promise.all([
    supabase.from("players").update({ default_level: level }).eq("id", playerId),
    supabase
      .from("mabar_session_players")
      .update({ level_at_session: level })
      .eq("mabar_session_id", sessionId)
      .eq("player_id", playerId),
  ]);
  if (rosterResult.error) throw rosterResult.error;
  if (sessionResult.error) throw sessionResult.error;
}

export async function setPresence(
  sessionId: number,
  playerId: number,
  present: boolean,
  pairingOffset: number
): Promise<void> {
  const { error } = await supabase
    .from("mabar_session_players")
    .update({ present, pairing_offset: pairingOffset })
    .eq("mabar_session_id", sessionId)
    .eq("player_id", playerId);
  if (error) throw error;
}

/**
 * Removes a player from this session only — the shared roster row stays,
 * since the same player may be reused in other sessions/PBs.
 */
export async function removeFromSession(sessionId: number, playerId: number): Promise<void> {
  const { error } = await supabase
    .from("mabar_session_players")
    .delete()
    .eq("mabar_session_id", sessionId)
    .eq("player_id", playerId);
  if (error) throw error;
}

export async function setAdjustment(
  sessionId: number,
  playerId: number,
  amount: number
): Promise<void> {
  const { error } = await supabase
    .from("mabar_session_players")
    .update({ adjustment: amount })
    .eq("mabar_session_id", sessionId)
    .eq("player_id", playerId);
  if (error) throw error;
}

export async function setPayment(
  sessionId: number,
  playerId: number,
  patch: { paid?: boolean; payment_method?: PaymentMethod }
): Promise<void> {
  const { error } = await supabase
    .from("mabar_session_players")
    .update(patch)
    .eq("mabar_session_id", sessionId)
    .eq("player_id", playerId);
  if (error) throw error;
}
