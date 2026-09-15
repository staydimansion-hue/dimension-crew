import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type Settings = {
  deduction_rate: number;
  min_wage_krw: number | null;
  qr_token: string;
  daily_checklist_enabled: boolean;
  daily_checklist_last_sent_date: string | null;
};

export async function getSettings(): Promise<Settings> {
  const { data, error } = await supabaseAdmin
    .from("settings")
    .select(
      "deduction_rate, min_wage_krw, qr_token, daily_checklist_enabled, daily_checklist_last_sent_date"
    )
    .eq("id", 1)
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return data as Settings;
}
