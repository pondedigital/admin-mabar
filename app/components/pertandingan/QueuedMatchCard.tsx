import { useState } from "react";
import { Check, Pencil, Play, X } from "lucide-react";
import { useMabar } from "../../context/MabarContext";
import { LEVELS } from "../../lib/pairing";
import { busyPlayerIds } from "../../lib/match";
import { cn } from "../../lib/utils";
import type { QueuedMatch } from "../../types/mabar";
import { buttonVariants, inputClass } from "../ui/button";
import { cardClass } from "../ui/Section";
import { TeamNames } from "./TeamNames";

interface QueuedMatchCardProps {
  queuedMatch: QueuedMatch;
  position: number;
}

export function QueuedMatchCard({ queuedMatch, position }: QueuedMatchCardProps) {
  const { players, matches, startQueuedMatch, cancelQueuedMatch, updateQueuedPlayer, numCourts } =
    useMabar();
  const [isEditing, setIsEditing] = useState(false);
  // "auto" = main di lapangan kosong mana pun; angka = lapangan pilihan
  const [selectedCourt, setSelectedCourt] = useState<"auto" | number>("auto");

  const allIds = [...queuedMatch.teamA, ...queuedMatch.teamB];
  const busy = busyPlayerIds(matches);
  const blockingNames = allIds
    .filter((id) => busy.has(id))
    .map((id) => players.find((p) => p.id === id)?.name)
    .filter((name): name is string => Boolean(name));
  const isBusy = allIds.some((id) => busy.has(id));

  // Lapangan kosong bernomor terkecil — sama dengan pilihan startQueuedMatch
  const usedCourts = new Set(
    matches.filter((m) => m.status === "active").map((m) => m.court)
  );
  let freeCourt: number | undefined;
  for (let c = 1; c <= numCourts; c++) {
    if (!usedCourts.has(c)) {
      freeCourt = c;
      break;
    }
  }
  const targetCourt = selectedCourt === "auto" ? freeCourt : selectedCourt;
  const isTargetUsed = targetCourt !== undefined && usedCourts.has(targetCourt);

  let blockedReason: string | null = null;
  if (isBusy) {
    blockedReason =
      blockingNames.length > 0
        ? `Menunggu ${blockingNames.join(", ")} selesai main.`
        : "Ada pemain yang masih bermain.";
  } else if (targetCourt === undefined) {
    blockedReason = "Semua lapangan sedang dipakai.";
  } else if (isTargetUsed) {
    blockedReason = `Lapangan ${targetCourt} masih dipakai.`;
  }

  const renderSlot = (team: "teamA" | "teamB", index: number) => {
    const currentId = queuedMatch[team][index];
    const usedElsewhere = allIds.filter((id) => id !== currentId);
    const options = players.filter(
      (p) => (p.present && !usedElsewhere.includes(p.id)) || p.id === currentId
    );
    return (
      <select
        key={`${team}-${index}`}
        aria-label={`Tim ${team === "teamA" ? "A" : "B"}, pemain ${index + 1}`}
        value={currentId}
        onChange={(e) => updateQueuedPlayer(queuedMatch.id, team, index, Number(e.target.value))}
        className={cn(inputClass, "h-10 text-sm")}
      >
        {options.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} ({LEVELS[p.level].short})
          </option>
        ))}
      </select>
    );
  };

  return (
    <article className={cn(cardClass, "p-3")} aria-label={`Antrean ${position}`}>
      <div className="flex items-start gap-3">
        <span
          className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold tabular"
          aria-hidden
        >
          {position}
        </span>
        {isEditing ? (
          <div className="grid min-w-0 flex-1 gap-1.5">
            <p className="text-xs font-semibold text-muted-foreground">Tim A</p>
            {queuedMatch.teamA.map((_, idx) => renderSlot("teamA", idx))}
            <p className="pt-1 text-xs font-semibold text-muted-foreground">Tim B</p>
            {queuedMatch.teamB.map((_, idx) => renderSlot("teamB", idx))}
          </div>
        ) : (
          <div className="min-w-0 flex-1 space-y-0.5 pt-0.5 text-sm font-medium">
            <TeamNames ids={queuedMatch.teamA} players={players} showLevel className="block" />
            <span className="block text-xs text-muted-foreground">lawan</span>
            <TeamNames ids={queuedMatch.teamB} players={players} showLevel className="block" />
          </div>
        )}
        <div className="-mr-1 -mt-1 flex shrink-0">
          <button
            type="button"
            onClick={() => setIsEditing((prev) => !prev)}
            aria-label={isEditing ? "Selesai edit pemain" : "Edit pemain"}
            aria-pressed={isEditing}
            className={buttonVariants({
              variant: "ghost",
              size: "icon",
              className: cn("size-9", isEditing && "bg-foreground text-white hover:bg-foreground/85 hover:text-white"),
            })}
          >
            {isEditing ? <Check size={16} strokeWidth={2.5} aria-hidden /> : <Pencil size={16} aria-hidden />}
          </button>
          <button
            type="button"
            onClick={() => cancelQueuedMatch(queuedMatch.id)}
            aria-label={`Batalkan antrean ${position}`}
            className={buttonVariants({ variant: "ghost", size: "icon", className: "size-9" })}
          >
            <X size={18} aria-hidden />
          </button>
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <label className="sr-only" htmlFor={`court-${queuedMatch.id}`}>
          Pilih lapangan
        </label>
        <select
          id={`court-${queuedMatch.id}`}
          value={selectedCourt}
          onChange={(e) =>
            setSelectedCourt(e.target.value === "auto" ? "auto" : Number(e.target.value))
          }
          className={cn(inputClass, "w-auto min-w-0 flex-1 text-sm")}
        >
          <option value="auto">Lapangan kosong</option>
          {Array.from({ length: numCourts }, (_, i) => i + 1).map((c) => (
            <option key={c} value={c}>
              Lapangan {c}
              {usedCourts.has(c) ? " (dipakai)" : ""}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() =>
            startQueuedMatch(queuedMatch.id, selectedCourt === "auto" ? undefined : selectedCourt)
          }
          disabled={blockedReason !== null}
          className={buttonVariants({ variant: "primary", className: "shrink-0" })}
        >
          <Play size={16} aria-hidden />
          {targetCourt !== undefined && !isTargetUsed ? `Mulai di Lap ${targetCourt}` : "Mulai"}
        </button>
      </div>
      {blockedReason && <p className="mt-2 text-xs text-warning">{blockedReason}</p>}
    </article>
  );
}
