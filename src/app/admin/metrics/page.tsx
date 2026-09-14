"use client";

import { useCallback, useEffect, useState } from "react";
import AdminNav from "@/components/AdminNav";
import BarChart from "@/components/BarChart";

type Datum = { label: string; value: number };

type MetricsData = {
  avgDurationByRoomType: Datum[];
  efficiencyByStaff: Datum[];
  completionRateByStaff: Datum[];
  photoCompletenessByStaff: Datum[];
  hoursByStaff: Datum[];
  avgRoomsByWeekday: Datum[];
};

function firstOfMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function AdminMetricsPage() {
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(today());
  const [data, setData] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/metrics?from=${from}&to=${to}`);
    const json = await res.json();
    if (res.ok) setData(json);
    setLoading(false);
  }, [from, to]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 기간이 바뀔 때마다 다시 불러온다
    load();
  }, [load]);

  return (
    <div className="min-h-dvh bg-bg flex flex-col">
      <AdminNav active="metrics" />
      <div className="flex-1 px-10 sm:px-14 py-10">
        <div className="flex items-baseline justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-[22px] font-bold">근무지표</h1>
            <div className="w-7 h-0.5 bg-accent mt-2" />
          </div>
          <div className="flex items-end gap-2.5">
            <label className="flex flex-col gap-1">
              <span className="text-[10.5px] tracking-[0.1em] text-muted uppercase">
                시작일
              </span>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="border border-line rounded-lg px-3 py-2 text-[13px] bg-card"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10.5px] tracking-[0.1em] text-muted uppercase">
                종료일
              </span>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="border border-line rounded-lg px-3 py-2 text-[13px] bg-card"
              />
            </label>
            <button
              onClick={load}
              className="bg-ink text-bg rounded-lg px-5 py-2 text-[13px] font-semibold h-fit"
            >
              조회
            </button>
          </div>
        </div>

        {loading || !data ? (
          <div className="text-muted text-[13px] py-10 text-center">불러오는 중...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <BarChart
              title="직원별 시간당 처리 객실 수 (효율)"
              unit="개/h"
              data={data.efficiencyByStaff}
            />
            <BarChart
              title="직원별 당일 완료율"
              unit="%"
              data={data.completionRateByStaff}
            />
            <BarChart
              title="방 타입별 평균 청소시간"
              unit="분"
              data={data.avgDurationByRoomType}
            />
            <BarChart
              title="직원별 사진(객실+욕실) 완결률"
              unit="%"
              data={data.photoCompletenessByStaff}
            />
            <BarChart
              title="직원별 총 근무시간"
              unit="h"
              data={data.hoursByStaff}
            />
            <BarChart
              title="요일별 평균 처리 객실 수"
              unit="개"
              data={data.avgRoomsByWeekday}
            />
          </div>
        )}
      </div>
    </div>
  );
}
