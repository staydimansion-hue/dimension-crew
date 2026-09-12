import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type Settings = {
  deduction_rate: number;
  min_wage_krw: number | null;
  qr_token: string;
};

export async function getSettings(): Promise<Settings> {
  const { data, error } = await supabaseAdmin
    .from("settings")
    .select("deduction_rate, min_wage_krw, qr_token")
    .eq("id", 1)
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return data as Settings;
}
