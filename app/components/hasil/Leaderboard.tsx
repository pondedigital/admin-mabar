import { useMabar } from "../../context/MabarContext";
import { splitTeams } from "../../lib/match";
import { LEVELS } from "../../lib/pairing";
import { cn } from "../../lib/utils";
import { cardClass, EmptyState } from "../ui/Section";

interface Standing {
  id: number;
  name: string;
  level: string;
  played: number;
  win: number;
  lose: number;
  pointDiff: number;
}

export function Leaderboard() {
  const { players, matches } = useMabar();

  const standings: Record<number, Standing> = {};
  players.forEach((p) => {
    standings[p.id] = {
      id: p.id,
      name: p.name,
      level: LEVELS[p.level].short,
      played: 0,
      win: 0,
      lose: 0,
      pointDiff: 0,
    };
  });

  matches
    .filter((m) => m.status === "finished")
    .forEach((match) => {
      const { teamA, teamB } = splitTeams(match);
      const diff = Math.abs(match.scoreA - match.scoreB);
      const teamAWin = match.scoreA > match.scoreB;
      const teamBWin = match.scoreB > match.scoreA;

      teamA.forEach((id) => {
        const s = standings[id];
        if (!s) return;
        s.played += 1;
        if (teamAWin) {
          s.win += 1;
          s.pointDiff += diff;
        } else if (teamBWin) {
          s.lose += 1;
          s.pointDiff -= diff;
        }
      });
      teamB.forEach((id) => {
        const s = standings[id];
        if (!s) return;
        s.played += 1;
        if (teamBWin) {
          s.win += 1;
          s.pointDiff += diff;
        } else if (teamAWin) {
          s.lose += 1;
          s.pointDiff -= diff;
        }
      });
    });

  const ranked = Object.values(standings)
    .filter((s) => s.played > 0)
    .sort((a, b) => (b.win !== a.win ? b.win - a.win : b.pointDiff - a.pointDiff));

  if (ranked.length === 0) {
    return (
      <EmptyState
        title="Klasemen masih kosong"
        description="Klasemen muncul setelah ada pertandingan yang selesai."
      />
    );
  }

  return (
    <>
      <div className={cn(cardClass, "overflow-hidden")}>
        <table className="w-full text-sm tabular">
          <caption className="sr-only">
            Klasemen: diurutkan dari menang terbanyak, lalu selisih poin
          </caption>
          <thead className="border-b border-border text-xs text-muted-foreground">
            <tr>
              <th scope="col" className="w-10 py-2.5 pl-3 text-left font-medium">
                #
              </th>
              <th scope="col" className="py-2.5 text-left font-medium">
                Pemain
              </th>
              <th scope="col" className="w-9 py-2.5 text-center font-medium">
                <abbr title="Main" className="no-underline">M</abbr>
              </th>
              <th scope="col" className="w-9 py-2.5 text-center font-medium">
                <abbr title="Menang" className="no-underline">W</abbr>
              </th>
              <th scope="col" className="w-9 py-2.5 text-center font-medium">
                <abbr title="Kalah" className="no-underline">L</abbr>
              </th>
              <th scope="col" className="w-14 py-2.5 pr-3 text-right font-medium">
                <abbr title="Selisih poin" className="no-underline">+/-</abbr>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {ranked.map((s, idx) => (
              <tr key={s.id} className={idx === 0 ? "bg-brand-soft" : undefined}>
                <td className="py-3 pl-3">
                  <span
                    className={cn(
                      "flex size-6 items-center justify-center rounded-full text-xs font-bold",
                      idx === 0 ? "bg-brand text-foreground" : idx < 3 ? "bg-foreground text-white" : "text-muted-foreground"
                    )}
                  >
                    {idx + 1}
                  </span>
                </td>
                <th scope="row" className="py-3 text-left font-semibold">
                  {s.name}
                  <span className="ml-1.5 text-xs font-medium text-muted-foreground">{s.level}</span>
                </th>
                <td className="py-3 text-center text-muted-foreground">{s.played}</td>
                <td className="py-3 text-center font-semibold">{s.win}</td>
                <td className="py-3 text-center text-muted-foreground">{s.lose}</td>
                <td
                  className={cn(
                    "py-3 pr-3 text-right font-semibold",
                    s.pointDiff > 0 && "text-success",
                    s.pointDiff < 0 && "text-destructive"
                  )}
                >
                  {s.pointDiff > 0 ? `+${s.pointDiff}` : s.pointDiff}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 px-1 text-xs text-muted-foreground">
        Urutan: menang terbanyak, lalu selisih poin. M main · W menang · L kalah.
      </p>
    </>
  );
}
