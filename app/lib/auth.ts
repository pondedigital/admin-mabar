import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase/client";

export async function signIn(username: string, password: string): Promise<void> {
  // Supabase Auth only signs in by email, so resolve the username -> email
  // via a SECURITY DEFINER RPC (RLS blocks anonymous reads of `profiles`).
  const { data: email, error: lookupError } = await supabase.rpc("email_for_username", {
    p_username: username,
  });
  if (lookupError) throw lookupError;
  if (!email) throw new Error("Username tidak ditemukan.");

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

export async function getSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export function onAuthStateChange(callback: (session: Session | null) => void) {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => callback(session));
  return () => subscription.unsubscribe();
}
