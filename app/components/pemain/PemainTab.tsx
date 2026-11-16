import { useState, type FormEvent } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import { useMabar } from "../../context/MabarContext";
import { LEVELS } from "../../lib/pairing";
import { cn } from "../../lib/utils";
import type { PlayerLevel } from "../../types/mabar";
import { buttonVariants, inputClass } from "../ui/button";
import { cardClass, EmptyState, SectionHeader } from "../ui/Section";
import { Segmented } from "../ui/Segmented";

const LEVEL_OPTIONS = (Object.keys(LEVELS) as PlayerLevel[]).map((level) => ({
  value: level,
  label: level,
}));

export function PemainTab() {
  const {
    players,
    playerRoster,
    addPlayer,
    togglePresence,
    deletePlayer,
    updatePlayerLevel,
    isSessionLocked,
  } = useMabar();
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerLevel, setNewPlayerLevel] = useState<PlayerLevel>("Menengah");

  const presentCount = players.filter((p) => p.present).length;

  const handleNameChange = (value: string) => {
    setNewPlayerName(value);
    // Nama persis cocok dengan roster klub -> prefill level yang sudah tercatat,
    // supaya pemain yang sama tidak berakhir dengan baris ganda di roster.
    const match = playerRoster.find((p) => p.name.toLowerCase() === value.trim().toLowerCase());
    if (match) setNewPlayerLevel(match.level);
  };

  const handleAddPlayer = (e: FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;
    addPlayer(newPlayerName, newPlayerLevel);
    setNewPlayerName("");
  };

  return (
    <fieldset disabled={isSessionLocked} className="min-w-0 space-y-6 p-4">
      <legend className="sr-only">Pemain</legend>

      <form onSubmit={handleAddPlayer} className={cn(cardClass, "space-y-3 p-3")}>
        <label htmlFor="new-player" className="sr-only">
          Nama pemain
        </label>
        <div className="flex gap-2">
          <input
            id="new-player"
            type="text"
            placeholder="Nama pemain"
            autoComplete="off"
            enterKeyHint="done"
            value={newPlayerName}
            onChange={(e) => handleNameChange(e.target.value)}
            list="player-roster-suggestions"
            className={inputClass}
          />
          <datalist id="player-roster-suggestions">
            {playerRoster.map((p) => (
              <option key={p.id} value={p.name} />
            ))}
          </datalist>
          <button
            type="submit"
            disabled={!newPlayerName.trim()}
            className={buttonVariants({ variant: "primary" })}
          >
            <Plus size={18} aria-hidden /> Tambah
          </button>
        </div>
        <Segmented
          label="Level pemain baru"
          size="sm"
          value={newPlayerLevel}
          onChange={setNewPlayerLevel}
          options={LEVEL_OPTIONS}
        />
      </form>

      <section aria-labelledby="player-list-title">
        <SectionHeader
          id="player-list-title"
          title="Daftar pemain"
          meta={players.length > 0 ? `${presentCount} hadir dari ${players.length}` : undefined}
        />
        {players.length === 0 ? (
          <EmptyState
            title="Belum ada pemain"
            description="Tambahkan nama pemain yang datang hari ini di atas."
          />
        ) : (
          <>
            <ul className={cn(cardClass, "divide-y divide-border")}>
              {players.map((player) => (
                <li key={player.id} className="flex items-center gap-1 pr-1">
                  <button
                    type="button"
                    onClick={() => togglePresence(player.id)}
                    aria-pressed={player.present}
                    aria-label={`${player.name}, ${player.present ? "hadir" : "tidak hadir"}`}
                    className="flex min-h-14 min-w-0 flex-1 items-center gap-3 px-3 text-left"
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                        player.present
                          ? "border-foreground bg-foreground text-brand"
                          : "border-input bg-card"
                      )}
                    >
                      {player.present && <Check size={14} strokeWidth={3} />}
                    </span>
                    <span
                      className={cn(
                        "truncate text-base",
                        player.present ? "font-medium" : "text-muted-foreground"
                      )}
                    >
                      {player.name}
                    </span>
                  </button>
                  <label className="sr-only" htmlFor={`level-${player.id}`}>
                    Level {player.name}
                  </label>
                  <select
                    id={`level-${player.id}`}
                    value={player.level}
                    onChange={(e) => updatePlayerLevel(player.id, e.target.value as PlayerLevel)}
                    className={cn(
                      "h-8 rounded-full px-2.5 text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-foreground",
                      LEVELS[player.level].color
                    )}
                  >
                    {(Object.keys(LEVELS) as PlayerLevel[]).map((level) => (
                      <option key={level} value={level}>
                        {LEVELS[level].label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => deletePlayer(player.id)}
                    aria-label={`Hapus ${player.name}`}
                    className={buttonVariants({ variant: "ghost", size: "icon" })}
                  >
                    <Trash2 size={18} aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-2 px-1 text-xs text-muted-foreground">
              Ketuk nama untuk menandai hadir atau tidak hadir. Pemain yang sudah main tidak bisa
              dihapus, tandai tidak hadir saja.
            </p>
          </>
        )}
      </section>
    </fieldset>
  );
}
