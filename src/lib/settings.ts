import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type Settings = {
  deduction_rate: number;
  min_wage_krw: number | null;
};

export async function getSettings(): Promise<Settings> {
  const { data, error } = await supabaseAdmin
    .from("settings")
    .select("deduction_rate, min_wage_krw")
    .eq("id", 1)
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return data as Settings;
}
