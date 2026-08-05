import {
  createContext,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { usePersistentState } from "../hooks/usePersistentState";
import { getLocalDate } from "../lib/format";
import { generateBalancedMatches } from "../lib/pairing";
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
  // Pemain
  players: Player[];
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
  setPbName: Dispatch<SetStateAction<string>>;
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
  showConfirm: (message: string, onConfirm: () => void) => void;
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
  const [players, setPlayers] = usePersistentState<Player[]>("players", []);
  const [matches, setMatches] = usePersistentState<Match[]>("matches", []);
  const [queue, setQueue] = usePersistentState<QueuedMatch[]>("queue", []);
  const [selectedPlayers, setSelectedPlayers] = usePersistentState<number[]>(
    "selectedPlayers",
    []
  );
  const [playerAdjustments, setPlayerAdjustments] = usePersistentState<
    Record<number, number>
  >("playerAdjustments", {});
  const [playerPayments, setPlayerPayments] = usePersistentState<
    Record<number, PlayerPayment>
  >("playerPayments", {});

  // Pengaturan mabar
  const [numCourts, setNumCourts] = usePersistentState("numCourts", 1);
  const [paymentMode, setPaymentMode] = usePersistentState<PaymentMode>(
    "paymentMode",
    "lapangan_kok"
  );
  const [allInFee, setAllInFee] = usePersistentState("allInFee", 35000);
  const [shuttlecockPrice, setShuttlecockPrice] = usePersistentState(
    "shuttlecockPrice",
    3000
  );
  const [baseFee, setBaseFee] = usePersistentState("baseFee", 0);
  const [gorName, setGorName] = usePersistentState("gorName", "");
  const [pbName, setPbName] = usePersistentState("pbName", "ADMIN PONDE");
  const [matchDate, setMatchDate] = usePersistentState("matchDate", () => getLocalDate());

  // Pengeluaran
  const [expKokSlopQty, setExpKokSlopQty] = usePersistentState("expKokSlopQty", 0);
  const [expKokSlopPrice, setExpKokSlopPrice] = usePersistentState(
    "expKokSlopPrice",
    110000
  );
  const [expKokSatuanQty, setExpKokSatuanQty] = usePersistentState("expKokSatuanQty", 0);
  const [expKokSatuanPrice, setExpKokSatuanPrice] = usePersistentState(
    "expKokSatuanPrice",
    10000
  );
  const [expLapangan, setExpLapangan] = usePersistentState("expLapangan", 0);
  const [expLain, setExpLain] = usePersistentState("expLain", 0);

  const [modal, setModal] = useState<ModalState>(CLOSED_MODAL);

  const showAlert = (message: string) =>
    setModal({ isOpen: true, type: "alert", message, onConfirm: null });

  const showConfirm = (message: string, onConfirm: () => void) =>
    setModal({ isOpen: true, type: "confirm", message, onConfirm });

  const closeModal = () => setModal(CLOSED_MODAL);

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
  };

  // --- ACTIONS: PEMAIN ---
  const addPlayer = (name: string, level: PlayerLevel) => {
    if (!name.trim()) return;
    setPlayers((prev) => [
      ...prev,
      {
        id: Date.now(),
        name: name.trim(),
        present: true,
        level,
        pairingOffset: minEffectiveCount(),
      },
    ]);
  };

  const togglePresence = (id: number) => {
    setPlayers((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const nowPresent = !p.present;
        let pairingOffset = p.pairingOffset;
        // Pemain yang baru hadir kembali disetarakan dengan jumlah main
        // minimum saat ini agar tidak memonopoli antrean.
        if (nowPresent) {
          const target = Math.max(effectivePlayCount(p), minEffectiveCount(id));
          pairingOffset = target - realPlayCount(id);
        }
        return { ...p, present: nowPresent, pairingOffset };
      })
    );
    setSelectedPlayers((prev) => prev.filter((pid) => pid !== id));
    removeFromQueue(id);
  };

  const deletePlayer = (id: number) => {
    const hasPlayed = matches.some((m) => m.players.includes(id));
    if (hasPlayed) {
      showAlert(
        "Pemain ini sudah bermain di pertandingan, tidak bisa dihapus. Anda bisa menandainya sebagai 'Tidak Hadir'."
      );
      return;
    }
    setPlayers((prev) => prev.filter((p) => p.id !== id));
    removeFromQueue(id);
  };

  const updatePlayerLevel = (id: number, level: PlayerLevel) => {
    setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, level } : p)));
  };

  // --- ACTIONS: PERTANDINGAN ---
  const toggleSelectPlayer = (id: number) => {
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

  const activeMatchCount = matches.filter((m) => m.status === "active").length;

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

    const newMatch: Match = {
      id: Date.now(),
      players: selectedPlayers,
      shuttlecocks: 1,
      scoreA: 0,
      scoreB: 0,
      status: "active",
      court: availableCourt,
    };
    setMatches((prev) => [newMatch, ...prev]);
    setSelectedPlayers([]);
  };

  // Match manual masuk antrean — urutan pilih menentukan tim (paruh pertama
  // jadi Tim A), sama dengan pembagian tim di splitTeams.
  const queueManualMatch = () => {
    if (selectedPlayers.length < 2) {
      showAlert("Pilih minimal 2 pemain untuk membuat antrean!");
      return;
    }

    const half = Math.ceil(selectedPlayers.length / 2);
    setQueue((prev) => [
      ...prev,
      {
        id: Date.now(),
        teamA: selectedPlayers.slice(0, half),
        teamB: selectedPlayers.slice(half),
      },
    ]);
    setSelectedPlayers([]);
  };

  const updateKok = (matchId: number, delta: number) => {
    setMatches((prev) =>
      prev.map((m) =>
        m.id === matchId ? { ...m, shuttlecocks: Math.max(0, m.shuttlecocks + delta) } : m
      )
    );
  };

  const deleteMatch = (matchId: number) => {
    showConfirm("Yakin ingin menghapus pertandingan ini?", () => {
      setMatches((prev) => prev.filter((m) => m.id !== matchId));
    });
  };

  const updateScore = (matchId: number, team: "scoreA" | "scoreB", score: string) => {
    setMatches((prev) =>
      prev.map((m) => (m.id === matchId ? { ...m, [team]: Number(score) } : m))
    );
  };

  const finishMatch = (matchId: number) => {
    const matchToFinish = matches.find((m) => m.id === matchId);
    if (matchToFinish && matchToFinish.scoreA === 0 && matchToFinish.scoreB === 0) {
      showAlert("Silakan input score pertandingan terlebih dahulu! (Skor tidak boleh 0 - 0)");
      return;
    }

    setMatches((prev) =>
      prev.map((m) => (m.id === matchId ? { ...m, status: "finished" } : m))
    );
  };

  // --- ACTIONS: AUTO-PAIRING & ANTREAN ---
  const generateMatches = (count: number) => {
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

    setQueue([
      ...queue,
      ...results.map((r, i) => ({ id: Date.now() + i, ...r })),
    ]);
  };

  const startQueuedMatch = (queueId: number, court?: number) => {
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

    const newMatch: Match = {
      id: Date.now(),
      players: ids,
      shuttlecocks: 1,
      scoreA: 0,
      scoreB: 0,
      status: "active",
      court: availableCourt,
    };
    setMatches((prev) => [newMatch, ...prev]);
    setQueue((prev) => prev.filter((q) => q.id !== queueId));
  };

  const cancelQueuedMatch = (queueId: number) => {
    setQueue((prev) => prev.filter((q) => q.id !== queueId));
  };

  const updateQueuedPlayer = (
    queueId: number,
    team: "teamA" | "teamB",
    index: number,
    playerId: number
  ) => {
    setQueue((prev) =>
      prev.map((q) => {
        if (q.id !== queueId) return q;
        if (q.teamA.includes(playerId) || q.teamB.includes(playerId)) return q;
        const updatedTeam = [...q[team]];
        updatedTeam[index] = playerId;
        return { ...q, [team]: updatedTeam };
      })
    );
  };

  const setPlayerAdjustment = (playerId: number, amount: number) => {
    setPlayerAdjustments((prev) => ({ ...prev, [playerId]: amount }));
  };

  const setPlayerPaid = (playerId: number, paid: boolean) => {
    setPlayerPayments((prev) => ({
      ...prev,
      [playerId]: { paid, method: prev[playerId]?.method ?? "cash" },
    }));
  };

  const setPlayerPaymentMethod = (playerId: number, method: PaymentMethod) => {
    setPlayerPayments((prev) => ({
      ...prev,
      [playerId]: { paid: prev[playerId]?.paid ?? false, method },
    }));
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

  const value: MabarContextValue = {
    players,
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
    setPbName,
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
