import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type Settings = {
  geo_center_lat: number | null;
  geo_center_lng: number | null;
  geo_radius_m: number;
  deduction_rate: number;
  min_wage_krw: number | null;
};

export async function getSettings(): Promise<Settings> {
  const { data, error } = await supabaseAdmin
    .from("settings")
    .select("geo_center_lat, geo_center_lng, geo_radius_m, deduction_rate, min_wage_krw")
    .eq("id", 1)
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return data as Settings;
}
