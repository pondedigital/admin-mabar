import type { PlayerLevel } from "../types/mabar";

export const LEVELS: Record<PlayerLevel, { label: string; short: string; score: number; color: string }> = {
  // Skill is ordinal, so the badge darkens with level instead of using unrelated hues.
  Pemula: { label: "Pemula (C)", short: "C", score: 1, color: "bg-muted text-foreground" },
  Menengah: { label: "Menengah (B)", short: "B", score: 2, color: "bg-brand-soft text-foreground" },
  Mahir: { label: "Mahir (A)", short: "A", score: 3, color: "bg-foreground text-white" },
};

export interface PairingCandidate {
  id: number;
  level: PlayerLevel;
  /** Jumlah main efektif: match nyata + antrean + offset penyeimbang. */
  count: number;
}

export interface PairingResult {
  teamA: number[];
  teamB: number[];
}

const POOL_SIZE = 16;
const MAX_LEVEL_GAP = 1;
const MAX_PLAY_GAP = 1;

/**
 * Cari satu pasangan match 2v2 yang seimbang:
 * - Selisih total skor level antar tim maksimal 1.
 * - Setelah match terbentuk, selisih jumlah main antar pemain hadir maksimal 1.
 *   Pemain yang SEDANG main di lapangan (`playingIds`) tidak ikut dihitung
 *   pada aturan ini kecuali ia bagian dari kombinasi — jumlah mainnya sedang
 *   bertambah, jadi ia tidak boleh memblokir pemain bebas mengisi lapangan
 *   kosong.
 *
 * Prioritas pemilihan dari semua kombinasi valid:
 * 1. Paling sedikit memakai pemain yang sedang main — kombinasi yang bisa
 *    langsung dimainkan di lapangan kosong selalu menang dari kombinasi yang
 *    harus menunggu match lain selesai.
 * 2. Total jumlah main ke-4 pemain paling kecil — pemain yang paling jarang
 *    main didahulukan.
 * 3. Ketergantungan paling sedikit. `blockingUnits` berisi kelompok pemain
 *    yang masih terikat match lain (sedang main di lapangan atau sudah masuk
 *    antrean sebelumnya). Kombinasi yang menyentuh lebih sedikit kelompok
 *    diprioritaskan, sehingga match antrean bisa langsung dimainkan begitu
 *    SATU lapangan selesai — tidak perlu menunggu semua.
 *
 * Dari kandidat terbaik, dipilih satu secara acak. Mengembalikan null jika
 * pemain kurang dari 4 atau tidak ada kombinasi yang memenuhi aturan.
 */
export function generateBalancedMatch(
  candidates: PairingCandidate[],
  blockingUnits: number[][] = [],
  playingIds: number[] = []
): PairingResult | null {
  if (candidates.length < 4) return null;

  const sorted = [...candidates].sort((a, b) => a.count - b.count);
  const pool = sorted.slice(0, POOL_SIZE);

  const blockingSets = blockingUnits.map((unit) => new Set(unit));
  const dependencyCount = (ids: number[]) =>
    blockingSets.filter((unit) => ids.some((id) => unit.has(id))).length;
  const playingSet = new Set(playingIds);

  const validMatches: (PairingResult & {
    dependencies: number;
    countSum: number;
    busyCount: number;
  })[] = [];

  for (let i = 0; i < pool.length - 3; i++) {
    for (let j = i + 1; j < pool.length - 2; j++) {
      for (let k = j + 1; k < pool.length - 1; k++) {
        for (let l = k + 1; l < pool.length; l++) {
          const four = [pool[i], pool[j], pool[k], pool[l]];
          const pairings: [PairingCandidate[], PairingCandidate[]][] = [
            [[four[0], four[1]], [four[2], four[3]]],
            [[four[0], four[2]], [four[1], four[3]]],
            [[four[0], four[3]], [four[1], four[2]]],
          ];

          const selectedIds = new Set(four.map((p) => p.id));
          const projected = sorted
            .filter((p) => selectedIds.has(p.id) || !playingSet.has(p.id))
            .map((p) => (selectedIds.has(p.id) ? p.count + 1 : p.count));
          const playGap = Math.max(...projected) - Math.min(...projected);
          if (playGap > MAX_PLAY_GAP) continue;

          for (const [teamA, teamB] of pairings) {
            const scoreA = LEVELS[teamA[0].level].score + LEVELS[teamA[1].level].score;
            const scoreB = LEVELS[teamB[0].level].score + LEVELS[teamB[1].level].score;
            if (Math.abs(scoreA - scoreB) <= MAX_LEVEL_GAP) {
              validMatches.push({
                teamA: teamA.map((p) => p.id),
                teamB: teamB.map((p) => p.id),
                dependencies: dependencyCount([...four].map((p) => p.id)),
                countSum: four.reduce((sum, p) => sum + p.count, 0),
                busyCount: four.filter((p) => playingSet.has(p.id)).length,
              });
            }
          }
        }
      }
    }
  }

  if (validMatches.length === 0) return null;

  // Prioritas 1: paling sedikit pemain yang sedang main — match yang bisa
  // langsung mengisi lapangan kosong selalu didahulukan.
  const minBusy = Math.min(...validMatches.map((m) => m.busyCount));
  const playable = validMatches.filter((m) => m.busyCount === minBusy);

  // Prioritas 2: kombinasi dengan total jumlah main paling kecil — pemain
  // yang paling jarang main (dan levelnya bisa membentuk match seimbang)
  // selalu didahulukan.
  const minCountSum = Math.min(...playable.map((m) => m.countSum));
  const fewestPlayed = playable.filter((m) => m.countSum === minCountSum);

  // Prioritas 3: ketergantungan paling sedikit, lalu acak
  const minDeps = Math.min(...fewestPlayed.map((m) => m.dependencies));
  const best = fewestPlayed.filter((m) => m.dependencies === minDeps);
  const picked = best[Math.floor(Math.random() * best.length)];
  return { teamA: picked.teamA, teamB: picked.teamB };
}

/**
 * Buat beberapa match antrean sekaligus. Karena pilihan match pertama bisa
 * menyisakan kombinasi pemain yang tidak seimbang untuk match berikutnya,
 * fungsi ini mencoba ulang dari awal beberapa kali dan mengembalikan hasil
 * terbanyak yang berhasil dibuat.
 */
export function generateBalancedMatches(
  base: PairingCandidate[],
  count: number,
  blockingUnits: number[][] = [],
  playingIds: number[] = [],
  attempts = 15
): PairingResult[] {
  let best: PairingResult[] = [];

  for (let attempt = 0; attempt < attempts; attempt++) {
    const counts = new Map(base.map((p) => [p.id, p.count]));
    const units = [...blockingUnits];
    const result: PairingResult[] = [];

    for (let i = 0; i < count; i++) {
      const candidates = base.map((p) => ({ ...p, count: counts.get(p.id)! }));
      const match = generateBalancedMatch(candidates, units, playingIds);
      if (!match) break;
      result.push(match);
      const ids = [...match.teamA, ...match.teamB];
      ids.forEach((id) => counts.set(id, counts.get(id)! + 1));
      units.push(ids);
    }

    if (result.length === count) return result;
    if (result.length > best.length) best = result;
  }

  return best;
}
