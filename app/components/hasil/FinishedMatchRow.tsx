import { Trash2 } from "lucide-react";
import { useMabar } from "../../context/MabarContext";
import { splitTeams } from "../../lib/match";
import { cn } from "../../lib/utils";
import type { Match } from "../../types/mabar";
import { TeamNames } from "../pertandingan/TeamNames";
import { buttonVariants } from "../ui/button";

interface FinishedMatchRowProps {
  match: Match;
  number: number;
}

/** One finished match inside the history list. */
export function FinishedMatchRow({ match, number }: FinishedMatchRowProps) {
  const { players, deleteMatch } = useMabar();
  const { teamA, teamB } = splitTeams(match);
  const isTeamAWon = match.scoreA > match.scoreB;
  const isTeamBWon = match.scoreB > match.scoreA;

  const teamRow = (ids: number[], score: number, won: boolean) => (
    <div className={cn("flex items-baseline gap-3", !won && "text-muted-foreground")}>
      <TeamNames
        ids={ids}
        players={players}
        className={cn("flex-1 text-sm", won ? "font-semibold text-foreground" : "")}
      />
      <span
        className={cn(
          "w-8 text-right text-lg tabular",
          won ? "font-bold text-foreground" : "font-medium"
        )}
      >
        {score}
      </span>
    </div>
  );

  return (
    <li className="flex gap-2 py-3 pl-3 pr-1">
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-xs text-muted-foreground tabular">
          Match {number}
          {match.court ? ` · Lapangan ${match.court}` : ""} · {match.shuttlecocks} kok
        </p>
        {teamRow(teamA, match.scoreA, isTeamAWon)}
        {teamRow(teamB, match.scoreB, isTeamBWon)}
      </div>
      <button
        type="button"
        onClick={() => deleteMatch(match.id)}
        aria-label={`Hapus match ${number}`}
        className={buttonVariants({ variant: "ghost", size: "icon", className: "size-9 self-center" })}
      >
        <Trash2 size={16} aria-hidden />
      </button>
    </li>
  );
}
