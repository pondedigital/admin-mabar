import { supabase } from "../supabase/client";

export interface PbOption {
  id: number;
  name: string;
}

/** PBs (clubs) this admin is allowed to handle, per `pb_admins`. */
export async function listMyPbs(userId: string): Promise<PbOption[]> {
  const { data, error } = await supabase
    .from("pb_admins")
    .select("pbs(id, name)")
    .eq("admin_id", userId);
  if (error) throw error;

  const options = ((data ?? []) as unknown as { pbs: PbOption | null }[])
    .map((row) => row.pbs)
    .filter((pb): pb is PbOption => pb !== null);
  options.sort((a, b) => a.name.localeCompare(b.name));
  return options;
}
