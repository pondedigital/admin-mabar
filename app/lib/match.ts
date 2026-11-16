import type { Match, QueuedMatch } from "../types/mabar";

export const splitTeams = (match: Match) => {
  const half = Math.ceil(match.players.length / 2);
  return {
    teamA: match.players.slice(0, half),
    teamB: match.players.slice(half),
  };
};

/** Players currently on court (in an unfinished match). */
export const busyPlayerIds = (matches: Match[]): Set<number> =>
  new Set(matches.filter((m) => m.status !== "finished").flatMap((m) => m.players));

/** A queued match can start once none of its players is still on court. */
export const isQueueReady = (queued: QueuedMatch, busy: Set<number>): boolean =>
  [...queued.teamA, ...queued.teamB].every((id) => !busy.has(id));
