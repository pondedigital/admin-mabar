import { LEVELS } from "../../lib/pairing";
import { cn } from "../../lib/utils";
import type { Player } from "../../types/mabar";

interface TeamNamesProps {
  ids: number[];
  players: Player[];
  showLevel?: boolean;
  className?: string;
}

/** One team on one line: "Andi / Budi", optionally with level letters. */
export function TeamNames({ ids, players, showLevel = false, className }: TeamNamesProps) {
  if (ids.length === 0) return <span className={cn("text-muted-foreground", className)}>—</span>;
  return (
    <span className={cn("min-w-0", className)}>
      {ids.map((id, index) => {
        const player = players.find((p) => p.id === id);
        return (
          <span key={id}>
            {index > 0 && <span className="text-muted-foreground"> / </span>}
            {player?.name ?? "?"}
            {showLevel && player && (
              <span className="ml-1 text-xs font-semibold text-muted-foreground">
                {LEVELS[player.level].short}
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}
