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
      <h1 className="text-lg font-bold text-center mb-4">{name}님 근무 캘린더</h1>

      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setMonth(shiftMonth(month, -1))}
          className="text-[13px] text-muted"
        >
          ◀ 이전달
        </button>
        <span className="text-[15px] font-bold">{monthLabel(month)}</span>
        <button
          onClick={() => setMonth(shiftMonth(month, 1))}
          className="text-[13px] text-muted"
        >
          다음달 ▶
        </button>
      </div>

      <div className="bg-sage-tint rounded-2xl p-5 text-center mb-5">
        <p className="text-[11px] tracking-[0.15em] text-muted uppercase">
          이번 달 예상 입금액
        </p>
        <p className="font-display text-[28px] font-bold text-sage mt-1">
          {projectedPayout.toLocaleString()}원
        </p>
        <p className="text-[11.5px] text-muted mt-1">
          합계 {totalAmount.toLocaleString()}원 · 공제 반영
        </p>
      </div>

      {loading ? (
        <p className="text-center text-muted text-sm py-8">불러오는 중...</p>
      ) : (
        <div className="grid grid-cols-7 gap-1 text-center text-xs">
          {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
            <div key={d} className="text-[11px] text-muted py-1">
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
                className={`aspect-square rounded-[10px] flex flex-col items-center justify-center gap-0.5 ${
                  isSelected
                    ? "bg-ink text-bg"
                    : shift
                      ? "bg-[#ece2d0] text-ink"
                      : "text-ink"
                }`}
              >
                <span className={isSelected ? "font-bold" : "font-medium"}>{day}</span>
                {shift && (
                  <span className="text-[8px] leading-none opacity-85">
                    {shift.amount.toLocaleString()}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {selectedDay && byDate.get(selectedDay) && (
        <div className="mt-4 bg-card border border-line rounded-xl px-5 py-4">
          <div className="flex items-baseline justify-between">
            <p className="text-sm font-bold">{selectedDay}</p>
            {byDate.get(selectedDay)!.status === "approved" ? (
              <span className="text-[11px] px-2.5 py-1 rounded-full bg-sage-tint text-sage">
                승인됨
              </span>
            ) : (
              <span className="text-[11px] px-2.5 py-1 rounded-full bg-brick-tint text-brick">
                승인 대기
              </span>
            )}
          </div>
          <div className="flex gap-5 mt-2.5">
            <div>
              <span className="text-xs text-muted">근무시간</span>{" "}
              <span className="text-[13px] font-semibold">
                {byDate.get(selectedDay)!.hours_worked}시간
              </span>
            </div>
            <div>
              <span className="text-xs text-muted">금액</span>{" "}
              <span className="text-[13px] font-semibold">
                {byDate.get(selectedDay)!.amount.toLocaleString()}원
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CalendarPage() {
  return (
    <StaffGate cardClassName="w-full max-w-md" activeTab="calendar">
      {(name) => <CalendarFlow name={name} />}
    </StaffGate>
  );
}
