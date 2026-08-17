import type { PaymentMethod, PaymentMode, PlayerLevel } from "./mabar";

export interface ProfileRow {
  id: string;
  username: string;
  role: "admin" | "bendahara" | "viewer";
  created_at: string;
}

export interface PlayerRow {
  id: number;
  name: string;
  default_level: PlayerLevel;
  created_at: string;
}

export interface MabarSessionRow {
  id: number;
  gor_name: string;
  pb_name: string;
  match_date: string;
  num_courts: number;
  payment_mode: PaymentMode;
  all_in_fee: number;
  shuttlecock_price: number;
  base_fee: number;
  status: "open" | "closed";
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface MabarSessionPlayerRow {
  id: number;
  mabar_session_id: number;
  player_id: number;
  level_at_session: PlayerLevel;
  present: boolean;
  pairing_offset: number;
  adjustment: number;
  paid: boolean;
  payment_method: PaymentMethod | null;
}

export interface MatchRow {
  id: number;
  mabar_session_id: number;
  court: number | null;
  shuttlecocks: number;
  score_a: number;
  score_b: number;
  status: "active" | "finished";
  created_at: string;
  finished_at: string | null;
}

export interface MatchPlayerRow {
  id: number;
  match_id: number;
  player_id: number;
  position: number;
}

export interface QueuedMatchRow {
  id: number;
  mabar_session_id: number;
  created_at: string;
}

export interface QueuedMatchPlayerRow {
  id: number;
  queued_match_id: number;
  team: "A" | "B";
  position: number;
  player_id: number;
}

export type ExpenseCategory = "kok_slop" | "kok_satuan" | "lapangan" | "lain";

export interface ExpenseRow {
  id: number;
  mabar_session_id: number;
  category: ExpenseCategory;
  qty: number;
  unit_price: number;
  note: string | null;
  created_at: string;
}
