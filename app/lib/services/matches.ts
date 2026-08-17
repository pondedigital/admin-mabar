import { supabase } from "../supabase/client";
import type { Match, QueuedMatch } from "../../types/mabar";

interface MatchRowJoined {
  id: number;
  court: number | null;
  shuttlecocks: number;
  score_a: number;
  score_b: number;
  status: "active" | "finished";
  match_players: { player_id: number; position: number }[];
}

export async function listMatches(sessionId: number): Promise<Match[]> {
  const { data, error } = await supabase
    .from("matches")
    .select(
      "id, court, shuttlecocks, score_a, score_b, status, match_players(player_id, position)"
    )
    .eq("mabar_session_id", sessionId)
    .order("created_at", { ascending: false });
  if (error) throw error;

  return ((data ?? []) as unknown as MatchRowJoined[]).map((m) => ({
    id: m.id,
    players: [...m.match_players].sort((a, b) => a.position - b.position).map((mp) => mp.player_id),
    shuttlecocks: m.shuttlecocks,
    scoreA: m.score_a,
    scoreB: m.score_b,
    status: m.status,
    court: m.court ?? undefined,
  }));
}

export async function createMatch(
  sessionId: number,
  playerIds: number[],
  court: number
): Promise<Match> {
  const { data: matchRow, error: matchError } = await supabase
    .from("matches")
    .insert({
      mabar_session_id: sessionId,
      court,
      shuttlecocks: 1,
      score_a: 0,
      score_b: 0,
      status: "active",
    })
    .select("id, court, shuttlecocks, score_a, score_b, status")
    .single();
  if (matchError) throw matchError;

  const { error: mpError } = await supabase.from("match_players").insert(
    playerIds.map((playerId, position) => ({
      match_id: matchRow.id,
      player_id: playerId,
      position,
    }))
  );
  if (mpError) throw mpError;

  return {
    id: matchRow.id,
    players: playerIds,
    shuttlecocks: matchRow.shuttlecocks,
    scoreA: matchRow.score_a,
    scoreB: matchRow.score_b,
    status: matchRow.status,
    court: matchRow.court ?? undefined,
  };
}

export async function updateKok(matchId: number, shuttlecocks: number): Promise<void> {
  const { error } = await supabase.from("matches").update({ shuttlecocks }).eq("id", matchId);
  if (error) throw error;
}

export async function updateScore(
  matchId: number,
  field: "score_a" | "score_b",
  score: number
): Promise<void> {
  const { error } = await supabase.from("matches").update({ [field]: score }).eq("id", matchId);
  if (error) throw error;
}

export async function finishMatch(matchId: number): Promise<void> {
  const { error } = await supabase
    .from("matches")
    .update({ status: "finished", finished_at: new Date().toISOString() })
    .eq("id", matchId);
  if (error) throw error;
}

export async function deleteMatch(matchId: number): Promise<void> {
  const { error } = await supabase.from("matches").delete().eq("id", matchId);
  if (error) throw error;
}

// --- Queue ---

interface QueuedMatchRowJoined {
  id: number;
  queued_match_players: { team: "A" | "B"; position: number; player_id: number }[];
}

export async function listQueue(sessionId: number): Promise<QueuedMatch[]> {
  const { data, error } = await supabase
    .from("queued_matches")
    .select("id, queued_match_players(team, position, player_id)")
    .eq("mabar_session_id", sessionId)
    .order("created_at", { ascending: true });
  if (error) throw error;

  return ((data ?? []) as unknown as QueuedMatchRowJoined[]).map((q) => {
    const byTeam = (team: "A" | "B") =>
      q.queued_match_players
        .filter((p) => p.team === team)
        .sort((a, b) => a.position - b.position)
        .map((p) => p.player_id);
    return { id: q.id, teamA: byTeam("A"), teamB: byTeam("B") };
  });
}

export async function insertQueuedMatch(
  sessionId: number,
  teamA: number[],
  teamB: number[]
): Promise<QueuedMatch> {
  const { data: queueRow, error: queueError } = await supabase
    .from("queued_matches")
    .insert({ mabar_session_id: sessionId })
    .select("id")
    .single();
  if (queueError) throw queueError;

  const rows = [
    ...teamA.map((playerId, position) => ({
      queued_match_id: queueRow.id,
      team: "A" as const,
      position,
      player_id: playerId,
    })),
    ...teamB.map((playerId, position) => ({
      queued_match_id: queueRow.id,
      team: "B" as const,
      position,
      player_id: playerId,
    })),
  ];
  const { error: playersError } = await supabase.from("queued_match_players").insert(rows);
  if (playersError) throw playersError;

  return { id: queueRow.id, teamA, teamB };
}

/** Sequential inserts — batches from auto-pairing are always small (a handful of items). */
export async function insertQueuedMatches(
  sessionId: number,
  results: { teamA: number[]; teamB: number[] }[]
): Promise<QueuedMatch[]> {
  const created: QueuedMatch[] = [];
  for (const r of results) {
    created.push(await insertQueuedMatch(sessionId, r.teamA, r.teamB));
  }
  return created;
}

export async function cancelQueuedMatch(queueId: number): Promise<void> {
  const { error } = await supabase.from("queued_matches").delete().eq("id", queueId);
  if (error) throw error;
}

export async function updateQueuedPlayer(
  queueId: number,
  team: "A" | "B",
  position: number,
  playerId: number
): Promise<void> {
  const { error } = await supabase
    .from("queued_match_players")
    .update({ player_id: playerId })
    .eq("queued_match_id", queueId)
    .eq("team", team)
    .eq("position", position);
  if (error) throw error;
}

/** Deletes every queued match this player is part of (used when they leave/get removed). */
export async function removeQueuedMatchesContainingPlayer(playerId: number): Promise<void> {
  const { data, error } = await supabase
    .from("queued_match_players")
    .select("queued_match_id")
    .eq("player_id", playerId);
  if (error) throw error;

  const queueIds = [...new Set((data ?? []).map((r) => r.queued_match_id))];
  if (queueIds.length === 0) return;

  const { error: delError } = await supabase.from("queued_matches").delete().in("id", queueIds);
  if (delError) throw delError;
}
