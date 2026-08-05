export type PlayerLevel = "Pemula" | "Menengah" | "Mahir";

export interface Player {
  id: number;
  name: string;
  present: boolean;
  level: PlayerLevel;
  /**
   * Penyeimbang jumlah main untuk auto-pairing. Pemain yang datang
   * terlambat diberi offset agar dianggap setara dengan jumlah main
   * minimum saat itu (tidak memonopoli antrean untuk "mengejar").
   */
  pairingOffset: number;
}

export type MatchStatus = "active" | "finished";

export interface Match {
  id: number;
  players: number[];
  shuttlecocks: number;
  scoreA: number;
  scoreB: number;
  status: MatchStatus;
  /** Nomor lapangan tempat match ini dimainkan (1..numCourts). */
  court?: number;
}

export interface QueuedMatch {
  id: number;
  teamA: number[];
  teamB: number[];
}

export type PaymentMode = "lapangan_kok" | "all_in";

export type PaymentMethod = "cash" | "qris" | "transfer";

export interface PlayerPayment {
  paid: boolean;
  method: PaymentMethod;
}

export interface PlayerStat extends Player {
  matchesPlayed: number;
  totalCost: number;
  adjustment: number;
  paid: boolean;
  paymentMethod: PaymentMethod;
}

export type ModalType = "alert" | "confirm";

export interface ModalState {
  isOpen: boolean;
  type: ModalType;
  message: string;
  onConfirm: (() => void) | null;
}

export type TabId = "pemain" | "pertandingan" | "rekap" | "klasemen" | "tagihan" | "keuangan";
