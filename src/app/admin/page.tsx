"use client";

import { useCallback, useEffect, useState } from "react";
import AdminNav from "@/components/AdminNav";

type ShiftRow = {
  id: string;
  work_date: string;
  clock_in_at: string;
  clock_out_at: string | null;
  hours_worked: number | null;
  amount: number | null;
  status: string;
  sheet_row: number | null;
  staff: { name: string } | { name: string }[] | null;
};

function staffName(w: ShiftRow["staff"]): string {
  if (!w) return "-";
  return Array.isArray(w) ? w[0]?.name ?? "-" : w.name;
}

function toKstLocal(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
}

export default function AdminDashboardPage() {
  const [shifts, setShifts] = useState<ShiftRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const res = await fetch(`/api/admin/shifts?${params.toString()}`);
    const data = await res.json();
    if (res.ok) setShifts(data.shifts);
    setLoading(false);
  }, [from, to]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 최초 마운트 시 목록을 불러온다
    load();
  }, [load]);

  async function handleApprove(id: string) {
    await fetch(`/api/admin/shifts/${id}/approve`, { method: "POST" });
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("이 출퇴근 기록을 삭제할까요? 구글시트에 이미 기록된 행은 자동으로 지워지지 않습니다.")) {
      return;
    }
    await fetch(`/api/admin/shifts/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="min-h-dvh bg-bg flex flex-col">
      <AdminNav active="dashboard" />
      <div className="flex-1 px-10 sm:px-14 py-10">
        <div className="flex items-baseline justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-[22px] font-bold">출퇴근 관리</h1>
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

        <div className="bg-card border border-line rounded-2xl overflow-x-auto">
          <table className="w-full text-[13.5px] whitespace-nowrap">
            <thead>
              <tr className="text-left">
                <th className="px-4 py-3 text-[11px] tracking-[0.1em] text-muted uppercase font-semibold border-b border-line">
                  날짜
                </th>
                <th className="px-4 py-3 text-[11px] tracking-[0.1em] text-muted uppercase font-semibold border-b border-line">
                  이름
                </th>
                <th className="px-4 py-3 text-[11px] tracking-[0.1em] text-muted uppercase font-semibold border-b border-line">
                  출근
                </th>
                <th className="px-4 py-3 text-[11px] tracking-[0.1em] text-muted uppercase font-semibold border-b border-line">
                  퇴근
                </th>
                <th className="px-4 py-3 text-[11px] tracking-[0.1em] text-muted uppercase font-semibold border-b border-line">
                  근무시간
                </th>
                <th className="px-4 py-3 text-[11px] tracking-[0.1em] text-muted uppercase font-semibold border-b border-line">
                  금액
                </th>
                <th className="px-4 py-3 text-[11px] tracking-[0.1em] text-muted uppercase font-semibold border-b border-line">
                  상태
                </th>
                <th className="px-4 py-3 text-[11px] tracking-[0.1em] text-muted uppercase font-semibold border-b border-line">
                  시트
                </th>
                <th className="px-4 py-3 text-[11px] tracking-[0.1em] text-muted uppercase font-semibold border-b border-line">
                  작업
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-6 text-center text-muted">
                    불러오는 중...
                  </td>
                </tr>
              ) : shifts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-6 text-center text-muted">
                    기록이 없습니다.
                  </td>
                </tr>
              ) : (
                shifts.map((s) => (
                  <tr key={s.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3 text-muted">{s.work_date}</td>
                    <td className="px-4 py-3 font-semibold">{staffName(s.staff)}</td>
                    <td className="px-4 py-3">{toKstLocal(s.clock_in_at)}</td>
                    <td className="px-4 py-3">
                      {s.clock_out_at ? (
                        toKstLocal(s.clock_out_at)
                      ) : (
                        <span className="text-muted">근무중</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {s.hours_worked != null ? `${s.hours_worked}h` : "-"}
                    </td>
                    <td className="px-4 py-3">
                      {s.amount != null ? `${s.amount.toLocaleString()}원` : "-"}
                    </td>
                    <td className="px-4 py-3">
                      {s.status === "approved" ? (
                        <span className="text-[12px] px-2.5 py-1 rounded-full bg-sage-tint text-sage">
                          승인됨
                        </span>
                      ) : s.status === "done" ? (
                        <button
                          onClick={() => handleApprove(s.id)}
                          className="text-[12px] px-2.5 py-1 rounded-full bg-brick-tint text-brick"
                        >
                          승인하기
                        </button>
                      ) : (
                        <span className="text-[12px] text-muted">근무중</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {s.sheet_row ? (
                        <span className="text-sage">완료</span>
                      ) : (
                        <span className="text-brick">실패</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleDelete(s.id)} className="text-brick underline">
                        삭제
                      </button>
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
