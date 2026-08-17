import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { usePersistentState } from "../hooks/usePersistentState";
import { getLocalDate } from "../lib/format";
import { generateBalancedMatches } from "../lib/pairing";
import * as expensesService from "../lib/services/expenses";
import * as matchesService from "../lib/services/matches";
import * as playersService from "../lib/services/players";
import type { RosterPlayer } from "../lib/services/players";
import { listMyPbs, type PbOption } from "../lib/services/pbs";
import {
  closeSession,
  getOrCreateOpenSession,
  updateSessionSettings,
} from "../lib/services/sessions";
import { supabase } from "../lib/supabase/client";
import type { ExpenseCategory, MabarSessionRow } from "../types/db";
import type {
  Match,
  ModalState,
  PaymentMethod,
  PaymentMode,
  Player,
  PlayerLevel,
  PlayerPayment,
  PlayerStat,
  QueuedMatch,
} from "../types/mabar";

interface MabarContextValue {
  // PB (klub) yang ditangani admin ini
  pbOptions: PbOption[];
  activePbId: number | null;
  setActivePbId: (id: number) => void;

  // Status sesi mabar (open = bisa diedit, closed = read-only/terkunci)
  sessionStatus: "open" | "closed";
  isSessionLocked: boolean;
  endSession: () => void;
  startNewSession: () => void;

  // Pemain
  players: Player[];
  playerRoster: RosterPlayer[];
  addPlayer: (name: string, level: PlayerLevel) => void;
  togglePresence: (id: number) => void;
  deletePlayer: (id: number) => void;
  updatePlayerLevel: (id: number, level: PlayerLevel) => void;

  // Pertandingan
  matches: Match[];
  selectedPlayers: number[];
  toggleSelectPlayer: (id: number) => void;
  createMatch: () => void;
  queueManualMatch: () => void;
  updateKok: (matchId: number, delta: number) => void;
  deleteMatch: (matchId: number) => void;
  updateScore: (matchId: number, team: "scoreA" | "scoreB", score: string) => void;
  finishMatch: (matchId: number) => void;

  // Auto-pairing & antrean
  queue: QueuedMatch[];
  generateMatches: (count: number) => void;
  startQueuedMatch: (queueId: number, court?: number) => void;
  cancelQueuedMatch: (queueId: number) => void;
  updateQueuedPlayer: (
    queueId: number,
    team: "teamA" | "teamB",
    index: number,
    playerId: number
  ) => void;

  // Pengaturan mabar
  numCourts: number;
  setNumCourts: Dispatch<SetStateAction<number>>;
  paymentMode: PaymentMode;
  setPaymentMode: Dispatch<SetStateAction<PaymentMode>>;
  allInFee: number;
  setAllInFee: Dispatch<SetStateAction<number>>;
  shuttlecockPrice: number;
  setShuttlecockPrice: Dispatch<SetStateAction<number>>;
  baseFee: number;
  setBaseFee: Dispatch<SetStateAction<number>>;
  gorName: string;
  setGorName: Dispatch<SetStateAction<string>>;
  pbName: string;
  matchDate: string;
  setMatchDate: Dispatch<SetStateAction<string>>;

  // Penyesuaian harga per pemain
  playerAdjustments: Record<number, number>;
  setPlayerAdjustment: (playerId: number, amount: number) => void;

  // Status pembayaran per pemain
  playerPayments: Record<number, PlayerPayment>;
  setPlayerPaid: (playerId: number, paid: boolean) => void;
  setPlayerPaymentMethod: (playerId: number, method: PaymentMethod) => void;

  // Pengeluaran
  expKokSlopQty: number;
  setExpKokSlopQty: Dispatch<SetStateAction<number>>;
  expKokSlopPrice: number;
  setExpKokSlopPrice: Dispatch<SetStateAction<number>>;
  expKokSatuanQty: number;
  setExpKokSatuanQty: Dispatch<SetStateAction<number>>;
  expKokSatuanPrice: number;
  setExpKokSatuanPrice: Dispatch<SetStateAction<number>>;
  expLapangan: number;
  setExpLapangan: Dispatch<SetStateAction<number>>;
  expLain: number;
  setExpLain: Dispatch<SetStateAction<number>>;

  // Modal global
  modal: ModalState;
  showAlert: (message: string) => void;
  showConfirm: (message: string, onConfirm: () => void, confirmLabel?: string) => void;
  closeModal: () => void;

  // Kalkulasi
  playerStats: Record<number, PlayerStat>;
  totalKokUsed: number;
  totalBiayaTerkumpul: number;
  totalPengeluaranKokSlop: number;
  totalPengeluaranKokSatuan: number;
  totalPengeluaran: number;
  saldoAkhir: number;
}

const MabarContext = createContext<MabarContextValue | null>(null);

const CLOSED_MODAL: ModalState = {
  isOpen: false,
  type: "alert",
  message: "",
  onConfirm: null,
};

export function MabarProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [pbOptions, setPbOptions] = useState<PbOption[]>([]);
  const [activePbId, setActivePbIdState] = usePersistentState<number | null>(
    "activePbId",
    null
  );
  const [playerRoster, setPlayerRoster] = useState<RosterPlayer[]>([]);

  const [sessionId, setSessionId] = useState<number | null>(null);
  const [sessionStatus, setSessionStatus] = useState<"open" | "closed">("open");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [queue, setQueue] = useState<QueuedMatch[]>([]);
  // Ephemeral UI selection only — not part of the DB schema, resets on refresh.
  const [selectedPlayers, setSelectedPlayers] = useState<number[]>([]);
  const [playerAdjustments, setPlayerAdjustments] = useState<Record<number, number>>({});
  const [playerPayments, setPlayerPayments] = useState<Record<number, PlayerPayment>>({});

  // Pengaturan mabar (mirrors one `mabar_sessions` row, synced via debounced effect below)
  const [numCourts, setNumCourts] = useState(1);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("lapangan_kok");
  const [allInFee, setAllInFee] = useState(35000);
  const [shuttlecockPrice, setShuttlecockPrice] = useState(3000);
  const [baseFee, setBaseFee] = useState(0);
  const [gorName, setGorName] = useState("");
  const [matchDate, setMatchDate] = useState(() => getLocalDate());

  // Pengeluaran (mirrors `expenses` rows, synced via debounced effect below)
  const [expKokSlopQty, setExpKokSlopQty] = useState(0);
  const [expKokSlopPrice, setExpKokSlopPrice] = useState(110000);
  const [expKokSatuanQty, setExpKokSatuanQty] = useState(0);
  const [expKokSatuanPrice, setExpKokSatuanPrice] = useState(10000);
  const [expLapangan, setExpLapangan] = useState(0);
  const [expLain, setExpLain] = useState(0);

  const [modal, setModal] = useState<ModalState>(CLOSED_MODAL);

  const showAlert = (message: string) =>
    setModal({ isOpen: true, type: "alert", message, onConfirm: null });

  const showConfirm = (message: string, onConfirm: () => void, confirmLabel?: string) =>
    setModal({ isOpen: true, type: "confirm", message, onConfirm, confirmLabel });

  const closeModal = () => setModal(CLOSED_MODAL);

  const reportError = (prefix: string) => (err: unknown) =>
    showAlert(`${prefix}: ${err instanceof Error ? err.message : String(err)}`);

  const pbName = pbOptions.find((pb) => pb.id === activePbId)?.name ?? "";

  // --- STEP 1: who's logged in, which PBs do they handle, and the shared roster ---
  useEffect(() => {
    let cancelled = false;

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Tidak ada sesi login aktif.");

      const [pbs, roster] = await Promise.all([listMyPbs(user.id), playersService.listRoster()]);
      if (cancelled) return;
      if (pbs.length === 0) {
        throw new Error(
          "Akun ini belum terhubung ke PB manapun. Hubungi admin lain untuk didaftarkan (tabel pb_admins)."
        );
      }

      setUserId(user.id);
      setPbOptions(pbs);
      setPlayerRoster(roster);

      const stillValid = activePbId !== null && pbs.some((pb) => pb.id === activePbId);
      setActivePbIdState(stillValid ? activePbId : pbs[0].id);
    }

    load().catch((err) => {
      if (cancelled) return;
      setLoadError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Memuat data satu sesi (dipakai saat load awal & saat mulai sesi baru) ---
  const loadSessionData = async (session: MabarSessionRow) => {
    const [sessionPlayers, matchList, queueList, expenseRows] = await Promise.all([
      playersService.listSessionPlayers(session.id),
      matchesService.listMatches(session.id),
      matchesService.listQueue(session.id),
      expensesService.listExpenses(session.id),
    ]);

    setGorName(session.gor_name);
    setMatchDate(session.match_date);
    setNumCourts(session.num_courts);
    setPaymentMode(session.payment_mode);
    setAllInFee(session.all_in_fee);
    setShuttlecockPrice(session.shuttlecock_price);
    setBaseFee(session.base_fee);

    setPlayers(sessionPlayers.players);
    setPlayerAdjustments(sessionPlayers.adjustments);
    setPlayerPayments(sessionPlayers.payments);
    setMatches(matchList);
    setQueue(queueList);
    setSelectedPlayers([]);

    const findExpense = (category: ExpenseCategory) =>
      expenseRows.find((e) => e.category === category);
    setExpKokSlopQty(findExpense("kok_slop")?.qty ?? 0);
    setExpKokSlopPrice(findExpense("kok_slop")?.unit_price ?? 110000);
    setExpKokSatuanQty(findExpense("kok_satuan")?.qty ?? 0);
    setExpKokSatuanPrice(findExpense("kok_satuan")?.unit_price ?? 10000);
    setExpLapangan(findExpense("lapangan")?.unit_price ?? 0);
    setExpLain(findExpense("lain")?.unit_price ?? 0);

    settingsSkipRef.current = true;
    expenseSkipRef.current = true;
    setSessionStatus(session.status);
    setSessionId(session.id);
  };

  // --- STEP 2: load (or create) the active PB's open session + its data ---
  useEffect(() => {
    if (userId === null || activePbId === null) return;
    let cancelled = false;
    setLoading(true);

    async function load() {
      const session = await getOrCreateOpenSession(userId!, activePbId!);
      if (cancelled) return;
      await loadSessionData(session);
      if (cancelled) return;
      setLoading(false);
    }

    load().catch((err) => {
      if (cancelled) return;
      setLoadError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, activePbId]);

  const setActivePbId = (id: number) => setActivePbIdState(id);

  // --- ACTIONS: SESI MABAR ---
  const endSession = () => {
    if (sessionId === null || sessionStatus === "closed") return;
    showConfirm(
      "Yakin ingin mengakhiri mabar ini? Rekap, keuangan, dan tagihan sesi ini akan dikunci (tidak bisa diubah lagi).",
      () => {
        closeSession(sessionId)
          .then(() => setSessionStatus("closed"))
          .catch(reportError("Gagal mengakhiri sesi mabar"));
      },
      "Akhiri Sesi"
    );
  };

  const startNewSession = () => {
    if (userId === null || activePbId === null) return;
    setLoading(true);
    getOrCreateOpenSession(userId, activePbId)
      .then((session) => loadSessionData(session))
      .catch(reportError("Gagal memulai mabar baru"))
      .finally(() => setLoading(false));
  };

  // --- SYNC: pengaturan mabar -> mabar_sessions (debounced, skipped right after (re)load) ---
  const settingsSkipRef = useRef(true);
  useEffect(() => {
    if (loading || sessionId === null || sessionStatus === "closed") return;
    if (settingsSkipRef.current) {
      settingsSkipRef.current = false;
      return;
    }
    const timeout = setTimeout(() => {
      updateSessionSettings(sessionId, {
        gor_name: gorName,
        match_date: matchDate,
        num_courts: numCourts,
        payment_mode: paymentMode,
        all_in_fee: allInFee,
        shuttlecock_price: shuttlecockPrice,
        base_fee: baseFee,
      }).catch(reportError("Gagal menyimpan pengaturan mabar"));
    }, 600);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    loading,
    sessionId,
    sessionStatus,
    gorName,
    matchDate,
    numCourts,
    paymentMode,
    allInFee,
    shuttlecockPrice,
    baseFee,
  ]);

  // --- SYNC: pengeluaran -> expenses (debounced, skipped right after (re)load) ---
  const expenseSkipRef = useRef(true);
  useEffect(() => {
    if (loading || sessionId === null || sessionStatus === "closed") return;
    if (expenseSkipRef.current) {
      expenseSkipRef.current = false;
      return;
    }
    const timeout = setTimeout(() => {
      Promise.all([
        expensesService.upsertExpense(sessionId, "kok_slop", expKokSlopQty, expKokSlopPrice),
        expensesService.upsertExpense(sessionId, "kok_satuan", expKokSatuanQty, expKokSatuanPrice),
        expensesService.upsertExpense(sessionId, "lapangan", 1, expLapangan),
        expensesService.upsertExpense(sessionId, "lain", 1, expLain),
      ]).catch(reportError("Gagal menyimpan pengeluaran"));
    }, 600);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    loading,
    sessionId,
    sessionStatus,
    expKokSlopQty,
    expKokSlopPrice,
    expKokSatuanQty,
    expKokSatuanPrice,
    expLapangan,
    expLain,
  ]);

  // --- HELPER: JUMLAH MAIN ---
  const realPlayCount = (playerId: number) =>
    matches.filter((m) => m.players.includes(playerId)).length;

  const effectivePlayCount = (p: Player) => realPlayCount(p.id) + p.pairingOffset;

  const minEffectiveCount = (exceptId?: number) => {
    const counts = players
      .filter((p) => p.present && p.id !== exceptId)
      .map(effectivePlayCount);
    return counts.length > 0 ? Math.min(...counts) : 0;
  };

  const removeFromQueue = (playerId: number) => {
    setQueue((prev) =>
      prev.filter((q) => !q.teamA.includes(playerId) && !q.teamB.includes(playerId))
    );
    return matchesService
      .removeQueuedMatchesContainingPlayer(playerId)
      .catch(reportError("Gagal memperbarui antrean"));
  };

  const isSessionLocked = sessionStatus === "closed";

  // --- ACTIONS: PEMAIN ---
  const addPlayer = (name: string, level: PlayerLevel) => {
    const trimmed = name.trim();
    if (!trimmed || sessionId === null || isSessionLocked) return;

    const alreadyInSession = players.some(
      (p) => p.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (alreadyInSession) {
      showAlert(`${trimmed} sudah ada di daftar pemain hari ini.`);
      return;
    }

    const pairingOffset = minEffectiveCount();
    // Nama sudah ada di roster klub (lintas-PB) -> pakai player_id yang sama,
    // jangan buat baris players baru (supaya rekap/klasemen tidak pecah).
    const existing = playerRoster.find((p) => p.name.toLowerCase() === trimmed.toLowerCase());

    const promise = existing
      ? playersService.addExistingPlayerToSession(
          sessionId,
          existing.id,
          existing.name,
          level,
          pairingOffset
        )
      : playersService.addPlayer(sessionId, trimmed, level, pairingOffset);

    promise
      .then((newPlayer) => {
        setPlayers((prev) => [...prev, newPlayer]);
        if (!existing) {
          setPlayerRoster((prev) =>
            [...prev, { id: newPlayer.id, name: newPlayer.name, level }].sort((a, b) =>
              a.name.localeCompare(b.name)
            )
          );
        }
      })
      .catch(reportError("Gagal menambah pemain"));
  };

  const togglePresence = (id: number) => {
    if (sessionId === null || isSessionLocked) return;
    const player = players.find((p) => p.id === id);
    if (!player) return;
    const nowPresent = !player.present;
    let pairingOffset = player.pairingOffset;
    // Pemain yang baru hadir kembali disetarakan dengan jumlah main
    // minimum saat ini agar tidak memonopoli antrean.
    if (nowPresent) {
      const target = Math.max(effectivePlayCount(player), minEffectiveCount(id));
      pairingOffset = target - realPlayCount(id);
    }
    setPlayers((prev) =>
      prev.map((p) => (p.id === id ? { ...p, present: nowPresent, pairingOffset } : p))
    );
    setSelectedPlayers((prev) => prev.filter((pid) => pid !== id));
    removeFromQueue(id);
    playersService
      .setPresence(sessionId, id, nowPresent, pairingOffset)
      .catch(reportError("Gagal memperbarui kehadiran"));
  };

  const deletePlayer = (id: number) => {
    if (isSessionLocked) return;
    const hasPlayed = matches.some((m) => m.players.includes(id));
    if (hasPlayed) {
      showAlert(
        "Pemain ini sudah bermain di pertandingan, tidak bisa dihapus. Anda bisa menandainya sebagai 'Tidak Hadir'."
      );
      return;
    }
    // Hanya keluar dari sesi hari ini — roster klub (players) tetap ada
    // supaya riwayat & klasemen di PB lain / sesi lain tidak hilang.
    setPlayers((prev) => prev.filter((p) => p.id !== id));
    setQueue((prev) => prev.filter((q) => !q.teamA.includes(id) && !q.teamB.includes(id)));
    (async () => {
      try {
        await matchesService.removeQueuedMatchesContainingPlayer(id);
        await playersService.removeFromSession(sessionId!, id);
      } catch (err) {
        reportError("Gagal menghapus pemain")(err);
      }
    })();
  };

  const updatePlayerLevel = (id: number, level: PlayerLevel) => {
    if (sessionId === null || isSessionLocked) return;
    setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, level } : p)));
    setPlayerRoster((prev) => prev.map((p) => (p.id === id ? { ...p, level } : p)));
    playersService
      .updatePlayerLevel(sessionId, id, level)
      .catch(reportError("Gagal memperbarui level pemain"));
  };

  // --- ACTIONS: PERTANDINGAN ---
  const toggleSelectPlayer = (id: number) => {
    if (isSessionLocked) return;
    // Pemain yang sedang main tetap boleh dipilih — match manual bisa
    // dimasukkan ke antrean dan dimainkan setelah match berjalan selesai.
    if (selectedPlayers.includes(id)) {
      setSelectedPlayers(selectedPlayers.filter((pid) => pid !== id));
    } else if (selectedPlayers.length < 4) {
      setSelectedPlayers([...selectedPlayers, id]);
    } else {
      showAlert("Maksimal 4 pemain untuk satu pertandingan.");
    }
  };

  // Lapangan kosong dengan nomor terkecil (1..numCourts)
  const nextFreeCourt = () => {
    const used = new Set(
      matches.filter((m) => m.status === "active").map((m) => m.court)
    );
    for (let c = 1; c <= numCourts; c++) {
      if (!used.has(c)) return c;
    }
    return undefined;
  };

  const createMatch = () => {
    if (sessionId === null || isSessionLocked) return;
    if (selectedPlayers.length < 2) {
      showAlert("Pilih minimal 2 pemain untuk memulai pertandingan!");
      return;
    }

    const busyNames = selectedPlayers
      .filter((id) =>
        matches.some((m) => m.status === "active" && m.players.includes(id))
      )
      .map((id) => players.find((p) => p.id === id)?.name)
      .filter(Boolean);
    if (busyNames.length > 0) {
      showAlert(
        `Pemain ${busyNames.join(", ")} masih bermain. Gunakan "Tambah ke Antrean" agar match ini bisa dimainkan setelah mereka selesai.`
      );
      return;
    }

    const availableCourt = nextFreeCourt();
    if (availableCourt === undefined) {
      showAlert(
        `Semua lapangan sedang dipakai (${numCourts} lapangan). Gunakan "Tambah ke Antrean" agar match ini bisa dimainkan begitu ada lapangan kosong.`
      );
      return;
    }

    const playerIds = selectedPlayers;
    setSelectedPlayers([]);
    matchesService
      .createMatch(sessionId, playerIds, availableCourt)
      .then((newMatch) => setMatches((prev) => [newMatch, ...prev]))
      .catch(reportError("Gagal membuat pertandingan"));
  };

  // Match manual masuk antrean — urutan pilih menentukan tim (paruh pertama
  // jadi Tim A), sama dengan pembagian tim di splitTeams.
  const queueManualMatch = () => {
    if (sessionId === null || isSessionLocked) return;
    if (selectedPlayers.length < 2) {
      showAlert("Pilih minimal 2 pemain untuk membuat antrean!");
      return;
    }

    const half = Math.ceil(selectedPlayers.length / 2);
    const teamA = selectedPlayers.slice(0, half);
    const teamB = selectedPlayers.slice(half);
    setSelectedPlayers([]);
    matchesService
      .insertQueuedMatch(sessionId, teamA, teamB)
      .then((newQueue) => setQueue((prev) => [...prev, newQueue]))
      .catch(reportError("Gagal membuat antrean"));
  };

  const updateKok = (matchId: number, delta: number) => {
    if (isSessionLocked) return;
    setMatches((prev) => {
      const updated = prev.map((m) =>
        m.id === matchId ? { ...m, shuttlecocks: Math.max(0, m.shuttlecocks + delta) } : m
      );
      const target = updated.find((m) => m.id === matchId);
      if (target) {
        matchesService
          .updateKok(matchId, target.shuttlecocks)
          .catch(reportError("Gagal memperbarui jumlah kok"));
      }
      return updated;
    });
  };

  const deleteMatch = (matchId: number) => {
    if (isSessionLocked) return;
    showConfirm("Yakin ingin menghapus pertandingan ini?", () => {
      setMatches((prev) => prev.filter((m) => m.id !== matchId));
      matchesService.deleteMatch(matchId).catch(reportError("Gagal menghapus pertandingan"));
    });
  };

  const updateScore = (matchId: number, team: "scoreA" | "scoreB", score: string) => {
    if (isSessionLocked) return;
    const value = Number(score);
    setMatches((prev) => prev.map((m) => (m.id === matchId ? { ...m, [team]: value } : m)));
    matchesService
      .updateScore(matchId, team === "scoreA" ? "score_a" : "score_b", value)
      .catch(reportError("Gagal memperbarui skor"));
  };

  const finishMatch = (matchId: number) => {
    if (isSessionLocked) return;
    const matchToFinish = matches.find((m) => m.id === matchId);
    if (matchToFinish && matchToFinish.scoreA === 0 && matchToFinish.scoreB === 0) {
      showAlert("Silakan input score pertandingan terlebih dahulu! (Skor tidak boleh 0 - 0)");
      return;
    }

    setMatches((prev) =>
      prev.map((m) => (m.id === matchId ? { ...m, status: "finished" } : m))
    );
    matchesService.finishMatch(matchId).catch(reportError("Gagal menyelesaikan pertandingan"));
  };

  // --- ACTIONS: AUTO-PAIRING & ANTREAN ---
  const generateMatches = (count: number) => {
    if (sessionId === null || isSessionLocked) return;
    const presentPlayers = players.filter((p) => p.present);
    if (presentPlayers.length < 4) {
      showAlert("Pemain hadir kurang dari 4 orang!");
      return;
    }

    // Jumlah main virtual: match nyata (aktif + selesai) + antrean yang sudah terbentuk
    const candidates = presentPlayers.map((p) => ({
      id: p.id,
      level: p.level,
      count:
        effectivePlayCount(p) +
        queue.filter((q) => q.teamA.includes(p.id) || q.teamB.includes(p.id)).length,
    }));

    // Pemain yang masih terikat match berjalan / antrean sebelumnya —
    // generator memilih kombinasi yang menyentuh sesedikit mungkin kelompok
    // ini agar match baru bisa main begitu satu lapangan kosong.
    const activeUnits = matches
      .filter((m) => m.status === "active")
      .map((m) => m.players);
    const blockingUnits = [...activeUnits, ...queue.map((q) => [...q.teamA, ...q.teamB])];

    // Pemain yang sedang di lapangan tidak boleh memblokir pemain bebas
    // mengisi lapangan kosong (aturan selisih jumlah main dilonggarkan
    // untuk mereka, dan kombinasi tanpa mereka diprioritaskan).
    const playingIds = activeUnits.flat();

    const results = generateBalancedMatches(candidates, count, blockingUnits, playingIds);

    if (results.length === 0) {
      showAlert(
        "Tidak ditemukan kombinasi 4 pemain yang seimbang (selisih level & jumlah main maksimal 1). Coba atur level pemain, selesaikan match yang berjalan, atau tunggu antrean dimainkan."
      );
      return;
    }

    if (results.length < count) {
      showAlert(
        `Hanya ${results.length} dari ${count} antrean yang bisa dibuat. Sisa pemain tidak bisa dipasangkan seimbang (cek level pemain atau jumlah pemain hadir).`
      );
    }

    matchesService
      .insertQueuedMatches(sessionId, results)
      .then((created) => setQueue((prev) => [...prev, ...created]))
      .catch(reportError("Gagal membuat antrean otomatis"));
  };

  const startQueuedMatch = (queueId: number, court?: number) => {
    if (sessionId === null || isSessionLocked) return;
    const queued = queue.find((q) => q.id === queueId);
    if (!queued) return;

    const availableCourt = court ?? nextFreeCourt();
    if (court === undefined && availableCourt === undefined) {
      showAlert(`Semua lapangan sedang dipakai (${numCourts} lapangan). Selesaikan match yang berjalan dulu.`);
      return;
    }

    const ids = [...queued.teamA, ...queued.teamB];
    const isBusy = ids.some((id) =>
      matches.some((m) => m.status === "active" && m.players.includes(id))
    );
    if (isBusy) {
      showAlert("Ada pemain di antrean ini yang masih bermain. Selesaikan match tersebut dulu.");
      return;
    }

    if (court !== undefined) {
      const courtInUse = matches.some(
        (m) => m.status === "active" && m.court === court
      );
      if (courtInUse) {
        showAlert(`Lapangan ${court} masih dipakai. Pilih lapangan lain atau selesaikan match di lapangan tersebut.`);
        return;
      }
    }

    setQueue((prev) => prev.filter((q) => q.id !== queueId));
    (async () => {
      try {
        const newMatch = await matchesService.createMatch(sessionId, ids, availableCourt!);
        setMatches((prev) => [newMatch, ...prev]);
        await matchesService.cancelQueuedMatch(queueId);
      } catch (err) {
        reportError("Gagal memulai pertandingan dari antrean")(err);
      }
    })();
  };

  const cancelQueuedMatch = (queueId: number) => {
    if (isSessionLocked) return;
    setQueue((prev) => prev.filter((q) => q.id !== queueId));
    matchesService.cancelQueuedMatch(queueId).catch(reportError("Gagal membatalkan antrean"));
  };

  const updateQueuedPlayer = (
    queueId: number,
    team: "teamA" | "teamB",
    index: number,
    playerId: number
  ) => {
    if (isSessionLocked) return;
    setQueue((prev) =>
      prev.map((q) => {
        if (q.id !== queueId) return q;
        if (q.teamA.includes(playerId) || q.teamB.includes(playerId)) return q;
        const updatedTeam = [...q[team]];
        updatedTeam[index] = playerId;
        return { ...q, [team]: updatedTeam };
      })
    );
    matchesService
      .updateQueuedPlayer(queueId, team === "teamA" ? "A" : "B", index, playerId)
      .catch(reportError("Gagal memperbarui antrean"));
  };

  const setPlayerAdjustment = (playerId: number, amount: number) => {
    if (isSessionLocked) return;
    setPlayerAdjustments((prev) => ({ ...prev, [playerId]: amount }));
    if (sessionId === null) return;
    playersService
      .setAdjustment(sessionId, playerId, amount)
      .catch(reportError("Gagal menyimpan penyesuaian harga"));
  };

  const setPlayerPaid = (playerId: number, paid: boolean) => {
    if (isSessionLocked) return;
    setPlayerPayments((prev) => ({
      ...prev,
      [playerId]: { paid, method: prev[playerId]?.method ?? "cash" },
    }));
    if (sessionId === null) return;
    playersService
      .setPayment(sessionId, playerId, { paid })
      .catch(reportError("Gagal menyimpan status pembayaran"));
  };

  const setPlayerPaymentMethod = (playerId: number, method: PaymentMethod) => {
    if (isSessionLocked) return;
    setPlayerPayments((prev) => ({
      ...prev,
      [playerId]: { paid: true, method },
    }));
    if (sessionId === null) return;
    playersService
      .setPayment(sessionId, playerId, { paid: true, payment_method: method })
      .catch(reportError("Gagal menyimpan metode pembayaran"));
  };

  // --- STATS & CALCULATIONS ---
  const playerStats = useMemo(() => {
    const stats: Record<number, PlayerStat> = {};
    players.forEach((p) => {
      let initialCost = 0;
      if (p.present) {
        if (paymentMode === "all_in") {
          initialCost = allInFee;
        } else if (paymentMode === "lapangan_kok") {
          initialCost = baseFee;
        }
      }
      const adj = playerAdjustments[p.id] || 0;
      const payment = playerPayments[p.id];
      stats[p.id] = {
        ...p,
        matchesPlayed: 0,
        totalCost: initialCost + adj,
        adjustment: adj,
        paid: payment?.paid ?? false,
        paymentMethod: payment?.method ?? "cash",
      };
    });

    matches.forEach((match) => {
      const costPerMatch = match.shuttlecocks * shuttlecockPrice;
      const costPerPlayer = costPerMatch / match.players.length;

      match.players.forEach((playerId) => {
        if (stats[playerId]) {
          stats[playerId].matchesPlayed += 1;
          if (paymentMode === "lapangan_kok") {
            stats[playerId].totalCost += costPerPlayer;
          }
        }
      });
    });

    return stats;
  }, [
    players,
    matches,
    shuttlecockPrice,
    baseFee,
    paymentMode,
    allInFee,
    playerAdjustments,
    playerPayments,
  ]);

  const totalKokUsed = matches.reduce((sum, match) => sum + match.shuttlecocks, 0);
  const totalBiayaTerkumpul = Object.values(playerStats).reduce(
    (sum, p) => sum + p.totalCost,
    0
  );

  const totalPengeluaranKokSlop = expKokSlopQty * expKokSlopPrice;
  const totalPengeluaranKokSatuan = expKokSatuanQty * expKokSatuanPrice;
  const totalPengeluaran =
    totalPengeluaranKokSlop + totalPengeluaranKokSatuan + expLapangan + expLain;
  const saldoAkhir = totalBiayaTerkumpul - totalPengeluaran;

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div>
          <p className="font-bold text-red-600 mb-1">Gagal memuat data dari Supabase</p>
          <p className="text-sm text-gray-500">{loadError}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400 text-sm">Memuat data mabar...</p>
      </div>
    );
  }

  const value: MabarContextValue = {
    pbOptions,
    activePbId,
    setActivePbId,
    sessionStatus,
    isSessionLocked,
    endSession,
    startNewSession,
    players,
    playerRoster,
    addPlayer,
    togglePresence,
    deletePlayer,
    updatePlayerLevel,
    matches,
    selectedPlayers,
    toggleSelectPlayer,
    createMatch,
    queueManualMatch,
    updateKok,
    deleteMatch,
    updateScore,
    finishMatch,
    queue,
    generateMatches,
    startQueuedMatch,
    cancelQueuedMatch,
    updateQueuedPlayer,
    numCourts,
    setNumCourts,
    paymentMode,
    setPaymentMode,
    allInFee,
    setAllInFee,
    shuttlecockPrice,
    setShuttlecockPrice,
    baseFee,
    setBaseFee,
    gorName,
    setGorName,
    pbName,
    matchDate,
    setMatchDate,
    playerAdjustments,
    setPlayerAdjustment,
    playerPayments,
    setPlayerPaid,
    setPlayerPaymentMethod,
    expKokSlopQty,
    setExpKokSlopQty,
    expKokSlopPrice,
    setExpKokSlopPrice,
    expKokSatuanQty,
    setExpKokSatuanQty,
    expKokSatuanPrice,
    setExpKokSatuanPrice,
    expLapangan,
    setExpLapangan,
    expLain,
    setExpLain,
    modal,
    showAlert,
    showConfirm,
    closeModal,
    playerStats,
    totalKokUsed,
    totalBiayaTerkumpul,
    totalPengeluaranKokSlop,
    totalPengeluaranKokSatuan,
    totalPengeluaran,
    saldoAkhir,
  };

  return <MabarContext.Provider value={value}>{children}</MabarContext.Provider>;
}

export function useMabar() {
  const context = useContext(MabarContext);
  if (!context) {
    throw new Error("useMabar harus dipakai di dalam <MabarProvider>");
  }
  return context;
}
