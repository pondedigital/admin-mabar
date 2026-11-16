import { Check, Minus, Plus, Trash2 } from "lucide-react";
import { useMabar } from "../../context/MabarContext";
import { splitTeams } from "../../lib/match";
import { cn } from "../../lib/utils";
import type { Match } from "../../types/mabar";
import { buttonVariants } from "../ui/button";
import { cardClass } from "../ui/Section";
import { TeamNames } from "./TeamNames";

interface ActiveMatchCardProps {
  match: Match;
}

export function ActiveMatchCard({ match }: ActiveMatchCardProps) {
  const { players, updateKok, updateScore, finishMatch, deleteMatch } = useMabar();
  const { teamA, teamB } = splitTeams(match);
  const courtLabel = match.court ? `Lapangan ${match.court}` : "Tanpa lapangan";
  const hasScore = match.scoreA > 0 || match.scoreB > 0;

  const scoreRow = (team: "scoreA" | "scoreB", ids: number[], label: string) => (
    <div className="flex items-center gap-3">
      <TeamNames ids={ids} players={players} className="flex-1 text-base font-medium" />
      <label className="sr-only" htmlFor={`${match.id}-${team}`}>
        Skor {label}
      </label>
      <input
        id={`${match.id}-${team}`}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={2}
        value={match[team] || ""}
        onChange={(e) => updateScore(match.id, team, e.target.value.replace(/\D/g, ""))}
        onFocus={(e) => e.target.select()}
        placeholder="0"
        className="h-12 w-16 shrink-0 rounded-lg border border-input bg-background text-center text-2xl font-bold tabular placeholder:text-muted-foreground/50 focus:border-foreground focus:outline-none focus:ring-2 focus:ring-foreground/15"
      />
    </div>
  );

  return (
    <article className={cn(cardClass, "overflow-hidden")} aria-label={courtLabel}>
      <div className="flex items-center gap-2 border-b border-border py-1.5 pl-3 pr-1">
        <span className="flex items-center gap-2 whitespace-nowrap text-sm font-semibold">
          <span className="relative flex size-2" aria-hidden>
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent2 opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-accent2" />
          </span>
          {courtLabel}
        </span>
        <div className="ml-auto flex items-center" role="group" aria-label="Kok terpakai">
          <button
            type="button"
            onClick={() => updateKok(match.id, -1)}
            disabled={match.shuttlecocks <= 0}
            aria-label="Kurangi kok"
            className={buttonVariants({ variant: "ghost", size: "icon", className: "size-9" })}
          >
            <Minus size={16} aria-hidden />
          </button>
          <span className="min-w-12 whitespace-nowrap text-center text-sm tabular" aria-live="polite">
            <span key={match.shuttlecocks} className="inline-block animate-pop font-bold">
              {match.shuttlecocks}
            </span>{" "}
            kok
          </span>
          <button
            type="button"
            onClick={() => updateKok(match.id, 1)}
            aria-label="Tambah kok"
            className={buttonVariants({ variant: "ghost", size: "icon", className: "size-9" })}
          >
            <Plus size={16} aria-hidden />
          </button>
        </div>
        <button
          type="button"
          onClick={() => deleteMatch(match.id)}
          aria-label={`Hapus pertandingan di ${courtLabel}`}
          className={buttonVariants({ variant: "ghost", size: "icon", className: "size-9" })}
        >
          <Trash2 size={16} aria-hidden />
        </button>
      </div>

      <div className="space-y-2 p-3">
        {scoreRow("scoreA", teamA, "tim A")}
        {scoreRow("scoreB", teamB, "tim B")}
      </div>

      <div className="px-3 pb-3">
        <button
          type="button"
          onClick={() => finishMatch(match.id)}
          disabled={!hasScore}
          className={buttonVariants({ variant: "ink", className: "w-full" })}
        >
          <Check size={18} strokeWidth={2.5} aria-hidden /> Selesai & simpan skor
        </button>
        {!hasScore && (
          <p className="mt-1.5 text-center text-xs text-muted-foreground">
            Isi skor dulu. Skor 0–0 tidak bisa disimpan.
          </p>
        )}
      </div>
    </article>
  );
}
