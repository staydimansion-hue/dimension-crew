"use client";

import { useCallback, useEffect, useState } from "react";
import AdminNav from "@/components/AdminNav";
import { cycleKeyForWorkDate, shiftCycle } from "@/lib/payCycle";

type StaffSummary = {
  staffId: string;
  name: string;
  hours: number;
  amount: number;
  pendingCount: number;
};

type ShiftRow = {
  id: string;
  workDate: string;
  staffName: string;
  clockInAt: string;
  clockOutAt: string;
  hoursWorked: number | null;
  amount: number | null;
  payrollRow: number | null;
};

type PayrollData = {
  cycleKey: string;
  from: string;
  to: string;
  label: string;
  reminderSentAt: string | null;
  announcedAt: string | null;
  staffSummaries: StaffSummary[];
  shifts: ShiftRow[];
};

function toKstLocal(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
}

function todayKstDateString(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
}

export default function AdminPayrollPage() {
  const [cycleKey, setCycleKey] = useState(() => cycleKeyForWorkDate(todayKstDateString()));
  const [data, setData] = useState<PayrollData | null>(null);
  const [loading, setLoading] = useState(true);
  const [payrollBusyId, setPayrollBusyId] = useState<string | null>(null);
  const [payrollError, setPayrollError] = useState<{ id: string; message: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/payroll?cycle=${cycleKey}`);
    const json = await res.json();
    if (res.ok) setData(json);
    setLoading(false);
  }, [cycleKey]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 사이클이 바뀔 때마다 다시 불러온다
    load();
  }, [load]);

  async function handlePayroll(id: string) {
    setPayrollBusyId(id);
    setPayrollError(null);
    const res = await fetch(`/api/admin/shifts/${id}/payroll`, { method: "POST" });
    const json = await res.json();
    setPayrollBusyId(null);
    if (!res.ok) {
      setPayrollError({ id, message: json.error || "입력에 실패했습니다." });
      return;
    }
    load();
  }

  const totalHours = data?.staffSummaries.reduce((sum, s) => sum + s.hours, 0) ?? 0;
  const totalAmount = data?.staffSummaries.reduce((sum, s) => sum + s.amount, 0) ?? 0;

  return (
    <div className="min-h-dvh bg-bg flex flex-col">
      <AdminNav active="payroll" />
      <div className="flex-1 px-10 sm:px-14 py-10">
        <div className="mb-6">
          <h1 className="text-[22px] font-bold">인건비</h1>
          <div className="w-7 h-0.5 bg-accent mt-2" />
        </div>

        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setCycleKey((k) => shiftCycle(k, -1))}
            aria-label="이전 달"
            className="border border-line rounded-lg w-9 h-9 shrink-0 flex items-center justify-center text-[15px]"
          >
            ←
          </button>
          <div className="flex-1 text-center min-w-0">
            {data ? (
              <>
                <div className="text-[16px] font-bold truncate">{data.label}</div>
                <div className="text-[11.5px] text-muted truncate">
                  {data.from} ~ {data.to} 근무분
                </div>
              </>
            ) : (
              <div className="text-[14px] font-semibold">불러오는 중...</div>
            )}
          </div>
          <button
            onClick={() => setCycleKey((k) => shiftCycle(k, 1))}
            aria-label="다음 달"
            className="border border-line rounded-lg w-9 h-9 shrink-0 flex items-center justify-center text-[15px]"
          >
            →
          </button>
        </div>

        {data && (
          <div className="text-[12px] text-muted mb-6">
            알림 DM:{" "}
            {data.reminderSentAt ? (
              <span className="text-sage">{toKstLocal(data.reminderSentAt)} 발송됨</span>
            ) : (
              <span>아직 발송 안 됨</span>
            )}
            {"  ·  "}
            완료 공지:{" "}
            {data.announcedAt ? (
              <span className="text-sage">{toKstLocal(data.announcedAt)} 발송됨</span>
            ) : (
              <span>아직 발송 안 됨</span>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {loading ? (
            <div className="text-muted text-[13px]">불러오는 중...</div>
          ) : data && data.staffSummaries.length === 0 ? (
            <div className="text-muted text-[13px]">이 사이클에 완료된 근무가 없습니다.</div>
          ) : (
            data?.staffSummaries.map((s) => (
              <div key={s.staffId} className="bg-card border border-line rounded-xl p-4">
                <div className="text-[13px] font-semibold mb-1">{s.name}</div>
                <div className="text-[12px] text-muted">
                  {s.hours.toFixed(1)}시간 · {s.amount.toLocaleString()}원
                </div>
                {s.pendingCount > 0 && (
                  <div className="text-[11px] text-brick mt-1">
                    급여장부 미입력 {s.pendingCount}건
                  </div>
                )}
              </div>
            ))
          )}
          {!loading && data && data.staffSummaries.length > 0 && (
            <div className="bg-ink text-bg rounded-xl p-4">
              <div className="text-[13px] font-semibold mb-1">합계</div>
              <div className="text-[12px]">
                {totalHours.toFixed(1)}시간 · {totalAmount.toLocaleString()}원
              </div>
            </div>
          )}
        </div>

        <div className="bg-card border border-line rounded-2xl overflow-x-auto">
          <table className="w-full text-[13.5px] whitespace-nowrap">
            <thead>
              <tr className="text-left">
                {["날짜", "이름", "출근", "퇴근", "근무시간", "금액", "급여장부"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-[11px] tracking-[0.1em] text-muted uppercase font-semibold border-b border-line"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-muted">
                    불러오는 중...
                  </td>
                </tr>
              ) : !data || data.shifts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-muted">
                    이 사이클에 완료된 근무가 없습니다.
                  </td>
                </tr>
              ) : (
                data.shifts.map((s) => (
                  <tr key={s.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3 text-muted">{s.workDate}</td>
                    <td className="px-4 py-3 font-semibold">{s.staffName}</td>
                    <td className="px-4 py-3">{toKstLocal(s.clockInAt)}</td>
                    <td className="px-4 py-3">{toKstLocal(s.clockOutAt)}</td>
                    <td className="px-4 py-3">
                      {s.hoursWorked != null ? `${s.hoursWorked}h` : "-"}
                    </td>
                    <td className="px-4 py-3">
                      {s.amount != null ? `${s.amount.toLocaleString()}원` : "-"}
                    </td>
                    <td className="px-4 py-3">
                      {s.payrollRow ? (
                        <span className="text-sage">입력됨 ({s.payrollRow}행)</span>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => handlePayroll(s.id)}
                            disabled={payrollBusyId === s.id}
                            className="text-[12px] px-2.5 py-1 rounded-full bg-brick-tint text-brick disabled:opacity-50 whitespace-nowrap"
                          >
                            {payrollBusyId === s.id ? "입력 중..." : "급여장부 입력"}
                          </button>
                          {payrollError?.id === s.id && (
                            <span className="text-[11px] text-brick whitespace-normal max-w-[220px]">
                              {payrollError.message}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
