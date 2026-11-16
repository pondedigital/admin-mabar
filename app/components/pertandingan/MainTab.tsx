import { useState } from "react";
import { Hand, ListPlus, Play, Shuffle } from "lucide-react";
import { useMabar } from "../../context/MabarContext";
import { busyPlayerIds, isQueueReady } from "../../lib/match";
import { cn } from "../../lib/utils";
import { buttonVariants } from "../ui/button";
import { cardClass, EmptyState, SectionHeader } from "../ui/Section";
import { Segmented } from "../ui/Segmented";
import { ActiveMatchCard } from "./ActiveMatchCard";
import { QueuedMatchCard } from "./QueuedMatchCard";
import { TeamNames } from "./TeamNames";

type PairingMode = "otomatis" | "manual";

const GENERATE_OPTIONS = ["1", "2", "3", "4"].map((n) => ({ value: n, label: `${n} match` }));

interface MainTabProps {
  onOpenSettings: () => void;
}

export function MainTab({ onOpenSettings }: MainTabProps) {
  const {
    players,
    matches,
    selectedPlayers,
    toggleSelectPlayer,
    createMatch,
    queueManualMatch,
    queue,
    generateMatches,
    startQueuedMatch,
    numCourts,
    isSessionLocked,
  } = useMabar();
  const [generateCount, setGenerateCount] = useState("1");
  const [pairingMode, setPairingMode] = useState<PairingMode>("otomatis");

  const presentPlayers = players.filter((p) => p.present);
  const selectedCount = selectedPlayers.length;
  const activeMatches = matches.filter((m) => m.status !== "finished");
  const courts = Array.from({ length: numCourts }, (_, i) => i + 1);
  // Match aktif tanpa nomor lapangan valid (mis. jumlah lapangan dikurangi saat match berjalan)
  const unassignedMatches = activeMatches.filter((m) => !m.court || m.court > numCourts);

  const busy = busyPlayerIds(matches);
  const playerName = (id: number) => players.find((p) => p.id === id)?.name || "?";
  const readyQueueIndex = queue.findIndex((q) => isQueueReady(q, busy));

  // Pratinjau tim manual — urutan pilih menentukan tim, sama dengan splitTeams
  const half = Math.ceil(selectedCount / 2);
  const manualTeamA = selectedPlayers.slice(0, half);
  const manualTeamB = selectedPlayers.slice(half);

  const hasFreeCourt = courts.some((c) => !activeMatches.some((m) => m.court === c));
  const busySelectedNames = selectedPlayers.filter((id) => busy.has(id)).map(playerName);

  const startBlockedReasons: string[] = [];
  if (busySelectedNames.length > 0) {
    startBlockedReasons.push(`${busySelectedNames.join(", ")} masih bermain`);
  }
  if (!hasFreeCourt) {
    startBlockedReasons.push("tidak ada lapangan kosong");
  }
  const canStartNow = selectedCount >= 2 && startBlockedReasons.length === 0;
  const maxParallel = Math.max(1, Math.floor(presentPlayers.length / 4));

  return (
    <fieldset disabled={isSessionLocked} className="min-w-0 space-y-6 p-4">
      <legend className="sr-only">Pertandingan</legend>

      {/* --- LAPANGAN --- */}
      <section aria-labelledby="courts-title">
        <SectionHeader
          id="courts-title"
          title="Lapangan"
          meta={`${activeMatches.length}/${numCourts} terpakai`}
          action={
            <button
              type="button"
              onClick={onOpenSettings}
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              Ubah jumlah
            </button>
          }
        />
        {presentPlayers.length < numCourts * 4 && (
          <p className="mb-3 rounded-lg bg-warning-soft px-3 py-2.5 text-sm text-warning">
            {presentPlayers.length} pemain hadir. {numCourts} lapangan butuh {numCourts * 4}{" "}
            pemain, jadi saat ini maksimal {maxParallel} match bisa jalan bersamaan.
          </p>
        )}
        <div className="space-y-3">
          {courts.map((court) => {
            const match = activeMatches.find((m) => m.court === court);
            if (match) return <ActiveMatchCard key={court} match={match} />;
            return (
              <div
                key={court}
                className="flex min-h-14 items-center justify-between gap-3 rounded-xl border border-dashed border-input px-3 py-2"
              >
                <span className="text-sm">
                  <span className="font-semibold">Lapangan {court}</span>
                  <span className="text-muted-foreground"> · kosong</span>
                </span>
                {readyQueueIndex >= 0 && (
                  <button
                    type="button"
                    onClick={() => startQueuedMatch(queue[readyQueueIndex].id, court)}
                    className={buttonVariants({ variant: "primary", size: "sm" })}
                  >
                    <Play size={14} aria-hidden /> Mulai antrean #{readyQueueIndex + 1}
                  </button>
                )}
              </div>
            );
          })}
          {unassignedMatches.map((match) => (
            <ActiveMatchCard key={match.id} match={match} />
          ))}
        </div>
      </section>

      {/* --- ANTREAN --- */}
      {queue.length > 0 && (
        <section aria-labelledby="queue-title">
          <SectionHeader id="queue-title" title="Antrean" meta={queue.length} />
          <div className="space-y-3">
            {queue.map((queuedMatch, idx) => (
              <QueuedMatchCard key={queuedMatch.id} queuedMatch={queuedMatch} position={idx + 1} />
            ))}
          </div>
        </section>
      )}

      {/* --- BUAT PERTANDINGAN --- */}
      <section aria-labelledby="create-title">
        <SectionHeader id="create-title" title="Buat pertandingan" />
        <div className={cn(cardClass, "space-y-4 p-3")}>
          <Segmented
            label="Cara memasangkan"
            value={pairingMode}
            onChange={setPairingMode}
            options={[
              { value: "otomatis", label: "Otomatis", icon: Shuffle },
              { value: "manual", label: "Pilih sendiri", icon: Hand },
            ]}
          />

          {pairingMode === "otomatis" ? (
            <>
              <p className="text-sm text-muted-foreground">
                Tim dipasangkan seimbang: selisih level dan jumlah main paling banyak 1. Antrean
                bisa dibuat walau lapangan penuh, dan tetap bisa diedit sebelum dimulai.
              </p>
              <Segmented
                label="Jumlah antrean dibuat"
                size="sm"
                value={generateCount}
                onChange={setGenerateCount}
                options={GENERATE_OPTIONS}
              />
              <button
                type="button"
                onClick={() => generateMatches(Number(generateCount))}
                disabled={presentPlayers.length < 4}
                className={buttonVariants({ variant: "ink", className: "w-full" })}
              >
                <Shuffle size={18} aria-hidden /> Buat antrean
              </button>
              {presentPlayers.length < 4 && (
                <p className="text-xs text-muted-foreground">
                  Butuh minimal 4 pemain hadir. Saat ini {presentPlayers.length}.
                </p>
              )}
            </>
          ) : presentPlayers.length === 0 ? (
            <EmptyState
              title="Belum ada pemain hadir"
              description="Tandai pemain yang hadir di tab Pemain."
            />
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Pilih 2–4 pemain. Dua yang dipilih pertama jadi Tim A. Pemain yang sedang main
                bisa dipilih untuk antrean.
              </p>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Pilih pemain">
                {presentPlayers.map((player) => {
                  const isSelected = selectedPlayers.includes(player.id);
                  const isBusy = busy.has(player.id);
                  return (
                    <button
                      key={player.id}
                      type="button"
                      onClick={() => toggleSelectPlayer(player.id)}
                      aria-pressed={isSelected}
                      className={cn(
                        "flex h-10 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors",
                        isSelected
                          ? "border-foreground bg-foreground text-white"
                          : "border-input bg-card hover:border-foreground"
                      )}
                    >
                      {isSelected && (
                        <span className="text-xs font-bold text-brand">
                          {manualTeamA.includes(player.id) ? "A" : "B"}
                        </span>
                      )}
                      {player.name}
                      {isBusy && (
                        <span
                          className={cn(
                            "text-xs",
                            isSelected ? "text-white/70" : "text-muted-foreground"
                          )}
                        >
                          · main
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {selectedCount > 0 && (
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-lg bg-muted px-3 py-2.5 text-sm">
                  <dt className="font-semibold text-muted-foreground">Tim A</dt>
                  <dd>
                    <TeamNames ids={manualTeamA} players={players} />
                  </dd>
                  <dt className="font-semibold text-muted-foreground">Tim B</dt>
                  <dd>
                    <TeamNames ids={manualTeamB} players={players} />
                  </dd>
                </dl>
              )}

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={createMatch}
                  disabled={!canStartNow}
                  className={buttonVariants({ variant: "primary", className: "w-full" })}
                >
                  <Play size={18} aria-hidden /> Mulai sekarang
                </button>
                <button
                  type="button"
                  onClick={queueManualMatch}
                  disabled={selectedCount < 2}
                  className={buttonVariants({ variant: "outline", className: "w-full" })}
                >
                  <ListPlus size={18} aria-hidden /> Masukkan ke antrean
                </button>
                {selectedCount >= 2 && startBlockedReasons.length > 0 && (
                  <p className="text-xs text-warning">
                    Belum bisa mulai langsung: {startBlockedReasons.join(", ")}. Masukkan ke
                    antrean dulu.
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </section>
    </fieldset>
  );
}
