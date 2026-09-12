"use client";

import { useEffect, useState, useCallback } from "react";
import AdminNav from "@/components/AdminNav";

type Settings = {
  deduction_rate: number;
  min_wage_krw: number | null;
};

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [deductionRate, setDeductionRate] = useState("");
  const [minWage, setMinWage] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/settings");
    const data = await res.json();
    if (res.ok) {
      setSettings(data.settings);
      setDeductionRate(String(data.settings.deduction_rate));
      setMinWage(data.settings.min_wage_krw != null ? String(data.settings.min_wage_krw) : "");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 최초 마운트 시 설정을 불러온다
    load();
  }, [load]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deductionRate: Number(deductionRate),
        minWageKrw: minWage ? Number(minWage) : null,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "저장에 실패했습니다.");
      return;
    }
    setNotice("저장되었습니다.");
    load();
  }

  return (
    <div className="min-h-dvh bg-bg flex flex-col">
      <AdminNav active="settings" />
      {settings && (
        <div className="flex-1 px-10 sm:px-14 py-10 flex justify-center">
          <div className="w-full max-w-[480px]">
            <div className="mb-6">
              <h1 className="text-[22px] font-bold">설정</h1>
              <div className="w-7 h-0.5 bg-accent mt-2" />
            </div>

            <form
              onSubmit={handleSave}
              className="bg-card border border-line rounded-2xl px-8 py-8 flex flex-col gap-6"
            >
              <label className="flex flex-col gap-2">
                <span className="text-[10.5px] tracking-[0.1em] text-muted uppercase">
                  공제율 (예: 0.033 = 3.3%)
                </span>
                <input
                  type="number"
                  step="0.001"
                  className="border-0 border-b border-line bg-transparent text-[14.5px] py-2 outline-none focus:border-accent"
                  value={deductionRate}
                  onChange={(e) => setDeductionRate(e.target.value)}
                  required
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-[10.5px] tracking-[0.1em] text-muted uppercase">
                  최저시급 (경고 기준, 비워두면 경고 안 함)
                </span>
                <input
                  type="number"
                  className="border-0 border-b border-line bg-transparent text-[14.5px] py-2 outline-none focus:border-accent"
                  value={minWage}
                  onChange={(e) => setMinWage(e.target.value)}
                  placeholder="비워두면 경고 없음"
                />
              </label>

              {error && <p className="text-sm text-brick">{error}</p>}
              {notice && <p className="text-sm text-sage">{notice}</p>}

              <button className="bg-accent text-bg rounded-[10px] py-3.5 font-semibold text-[15px] mt-1">
                저장
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
