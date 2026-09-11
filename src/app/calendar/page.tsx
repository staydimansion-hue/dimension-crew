"use client";

import { useCallback, useEffect, useState } from "react";
import StaffGate from "@/components/StaffGate";

type ShiftDay = {
  work_date: string;
  hours_worked: number;
  amount: number;
  status: string;
};

function monthLabel(month: string): string {
  const [y, m] = month.split("-");
  return `${y}년 ${Number(m)}월`;
}

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function CalendarFlow({ name }: { name: string }) {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [shifts, setShifts] = useState<ShiftDay[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [projectedPayout, setProjectedPayout] = useState(0);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/staff/calendar?month=${month}`);
    const data = await res.json();
    if (res.ok) {
      setShifts(data.shifts);
      setTotalAmount(data.totalAmount);
      setProjectedPayout(data.projectedPayout);
    }
    setLoading(false);
  }, [month]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 월이 바뀔 때마다 다시 불러온다
    load();
  }, [load]);

  const [year, mo] = month.split("-").map(Number);
  const firstWeekday = new Date(year, mo - 1, 1).getDay();
  const lastDay = new Date(year, mo, 0).getDate();
  const byDate = new Map(shifts.map((s) => [s.work_date, s]));

  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: lastDay }, (_, i) => i + 1),
  ];

  return (
    <div className="w-full">
      <h1 className="text-lg font-bold text-center mb-1">{name}님 근무 캘린더</h1>

      <div className="flex items-center justify-between my-4">
        <button onClick={() => setMonth(shiftMonth(month, -1))} className="px-3 py-1 text-sm">
          ◀ 이전달
        </button>
        <span className="font-semibold">{monthLabel(month)}</span>
        <button onClick={() => setMonth(shiftMonth(month, 1))} className="px-3 py-1 text-sm">
          다음달 ▶
        </button>
      </div>

      <div className="bg-emerald-50 rounded-xl p-4 mb-4 text-center">
        <p className="text-sm text-neutral-500">이번 달 예상 입금액</p>
        <p className="text-2xl font-bold text-emerald-700">
          {projectedPayout.toLocaleString()}원
        </p>
        <p className="text-xs text-neutral-400 mt-1">
          합계 {totalAmount.toLocaleString()}원 기준 (공제 반영)
        </p>
      </div>

      {loading ? (
        <p className="text-center text-neutral-400 text-sm py-8">불러오는 중...</p>
      ) : (
        <div className="grid grid-cols-7 gap-1 text-center text-xs">
          {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
            <div key={d} className="font-semibold text-neutral-400 py-1">
              {d}
            </div>
          ))}
          {cells.map((day, idx) => {
            if (day == null) return <div key={idx} />;
            const dateStr = `${month}-${String(day).padStart(2, "0")}`;
            const shift = byDate.get(dateStr);
            const isSelected = selectedDay === dateStr;
            return (
              <button
                key={idx}
                onClick={() => shift && setSelectedDay(isSelected ? null : dateStr)}
                className={`aspect-square rounded-lg flex flex-col items-center justify-center ${
                  shift ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-400"
                }`}
              >
                <span>{day}</span>
                {shift && (
                  <span className="text-[9px] leading-tight">
                    {Math.round(shift.amount / 1000)}k
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {selectedDay && byDate.get(selectedDay) && (
        <div className="mt-4 bg-neutral-100 rounded-xl p-4 text-sm">
          <p className="font-semibold">{selectedDay}</p>
          <p>근무시간 {byDate.get(selectedDay)!.hours_worked}시간</p>
          <p>금액 {byDate.get(selectedDay)!.amount.toLocaleString()}원</p>
          <p className="text-neutral-500">
            상태 {byDate.get(selectedDay)!.status === "approved" ? "승인됨" : "승인 대기"}
          </p>
        </div>
      )}
    </div>
  );
}

export default function CalendarPage() {
  return (
    <StaffGate cardClassName="w-full max-w-md bg-white rounded-2xl shadow-md p-6">
      {(name) => <CalendarFlow name={name} />}
    </StaffGate>
  );
}
