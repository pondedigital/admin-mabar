import { useMabar } from "../../context/MabarContext";
import { usePersistentState } from "../../hooks/usePersistentState";
import { cn } from "../../lib/utils";
import type { HasilView } from "../../types/mabar";
import { cardClass, EmptyState, SectionHeader } from "../ui/Section";
import { Segmented } from "../ui/Segmented";
import { FinishedMatchRow } from "./FinishedMatchRow";
import { Leaderboard } from "./Leaderboard";

export function HasilTab() {
  const [view, setView] = usePersistentState<HasilView>("hasilView", "riwayat");

  return (
    <div className="space-y-4 p-4">
      <Segmented
        label="Tampilan hasil"
        value={view}
        onChange={setView}
        options={[
          { value: "riwayat", label: "Riwayat" },
          { value: "klasemen", label: "Klasemen" },
        ]}
      />
      {view === "riwayat" ? <RiwayatView /> : <Leaderboard />}
    </div>
  );
}

function RiwayatView() {
  const { matches, playerStats, totalKokUsed, isSessionLocked } = useMabar();

  // Newest first in state; number matches in the order they were played.
  const finishedMatches = matches.filter((m) => m.status === "finished");
  const activePlayers = Object.values(playerStats)
    .filter((p) => p.matchesPlayed > 0)
    .sort((a, b) => b.matchesPlayed - a.matchesPlayed);

  return (
    <div className="space-y-6">
      <section aria-labelledby="stats-title">
        <SectionHeader id="stats-title" title="Statistik" />
        <div className={cn(cardClass, "divide-y divide-border")}>
          <dl className="grid grid-cols-2 divide-x divide-border tabular">
            <div className="p-3">
              <dt className="text-xs text-muted-foreground">Match selesai</dt>
              <dd className="text-xl font-bold">{finishedMatches.length}</dd>
            </div>
            <div className="p-3">
              <dt className="text-xs text-muted-foreground">Kok terpakai</dt>
              <dd className="text-xl font-bold">
                {totalKokUsed} <span className="text-sm font-normal text-muted-foreground">pcs</span>
              </dd>
            </div>
          </dl>
          <div className="p-3">
            <p className="mb-2 text-xs text-muted-foreground">Jumlah main per pemain</p>
            {activePlayers.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada pemain yang bertanding.</p>
            ) : (
              <ul className="flex flex-wrap gap-1.5">
                {activePlayers.map((p) => (
                  <li
                    key={p.id}
                    className="flex h-8 items-center gap-1.5 rounded-full bg-muted pl-3 pr-1 text-sm"
                  >
                    {p.name}
                    <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-card px-1.5 text-xs font-bold tabular">
                      {p.matchesPlayed}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <section aria-labelledby="history-title">
        <SectionHeader id="history-title" title="Riwayat pertandingan" />
        {finishedMatches.length === 0 ? (
          <EmptyState
            title="Belum ada pertandingan selesai"
            description="Match yang diselesaikan di tab Main akan muncul di sini."
          />
        ) : (
          <fieldset disabled={isSessionLocked} className="min-w-0">
            <legend className="sr-only">Riwayat pertandingan</legend>
            <ul className={cn(cardClass, "divide-y divide-border")}>
              {finishedMatches.map((match, idx) => (
                <FinishedMatchRow
                  key={match.id}
                  match={match}
                  number={finishedMatches.length - idx}
                />
              ))}
            </ul>
          </fieldset>
        )}
      </section>
    </div>
  );
}
