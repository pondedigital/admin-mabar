import { supabase } from "../supabase/client";
import type { ExpenseCategory, ExpenseRow } from "../../types/db";

export async function listExpenses(sessionId: number): Promise<ExpenseRow[]> {
  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .eq("mabar_session_id", sessionId);
  if (error) throw error;
  return (data ?? []) as ExpenseRow[];
}

/**
 * The UI treats each category as a single settings-like value (one qty +
 * unit_price pair), so this finds-or-creates that one row per category
 * instead of appending line items.
 */
export async function upsertExpense(
  sessionId: number,
  category: ExpenseCategory,
  qty: number,
  unitPrice: number
): Promise<void> {
  const { data: existing, error: findError } = await supabase
    .from("expenses")
    .select("id")
    .eq("mabar_session_id", sessionId)
    .eq("category", category)
    .maybeSingle();
  if (findError) throw findError;

  if (existing) {
    const { error } = await supabase
      .from("expenses")
      .update({ qty, unit_price: unitPrice })
      .eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("expenses")
      .insert({ mabar_session_id: sessionId, category, qty, unit_price: unitPrice });
    if (error) throw error;
  }
}
