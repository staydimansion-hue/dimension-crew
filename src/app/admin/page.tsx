"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type ShiftRow = {
  id: string;
  work_date: string;
  clock_in_at: string;
  clock_out_at: string | null;
  hours_worked: number | null;
  amount: number | null;
  status: string;
  sheet_row: number | null;
  clock_in_out_of_range: boolean | null;
  clock_out_out_of_range: boolean | null;
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
  const router = useRouter();
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

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-neutral-50 px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
          <h1 className="text-xl font-bold">출퇴근 관리</h1>
          <div className="flex gap-3 text-sm">
            <Link href="/admin/staff" className="text-blue-600 underline">
              직원 관리
            </Link>
            <Link href="/admin/settings" className="text-blue-600 underline">
              설정
            </Link>
            <Link href="/admin/qr" className="text-blue-600 underline">
              QR 코드
            </Link>
            <button onClick={handleLogout} className="text-neutral-500 underline">
              로그아웃
            </button>
          </div>
        </div>

        <div className="flex gap-2 mb-4 items-end flex-wrap">
          <label className="text-sm">
            시작일
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="block border border-neutral-300 rounded-lg px-3 py-2 mt-1"
            />
          </label>
          <label className="text-sm">
            종료일
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="block border border-neutral-300 rounded-lg px-3 py-2 mt-1"
            />
          </label>
          <button
            onClick={load}
            className="bg-neutral-900 text-white rounded-lg px-4 py-2 text-sm h-fit"
          >
            조회
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-md overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left">
                <th className="px-4 py-3">날짜</th>
                <th className="px-4 py-3">이름</th>
                <th className="px-4 py-3">출근</th>
                <th className="px-4 py-3">퇴근</th>
                <th className="px-4 py-3">근무시간</th>
                <th className="px-4 py-3">금액</th>
                <th className="px-4 py-3">위치</th>
                <th className="px-4 py-3">상태</th>
                <th className="px-4 py-3">시트</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-6 text-center text-neutral-400">
                    불러오는 중...
                  </td>
                </tr>
              ) : shifts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-6 text-center text-neutral-400">
                    기록이 없습니다.
                  </td>
                </tr>
              ) : (
                shifts.map((s) => (
                  <tr key={s.id} className="border-b border-neutral-100">
                    <td className="px-4 py-3">{s.work_date}</td>
                    <td className="px-4 py-3">{staffName(s.staff)}</td>
                    <td className="px-4 py-3">{toKstLocal(s.clock_in_at)}</td>
                    <td className="px-4 py-3">
                      {s.clock_out_at ? (
                        toKstLocal(s.clock_out_at)
                      ) : (
                        <span className="text-amber-600">근무중</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {s.hours_worked != null ? `${s.hours_worked}h` : "-"}
                    </td>
                    <td className="px-4 py-3">
                      {s.amount != null ? `${s.amount.toLocaleString()}원` : "-"}
                    </td>
                    <td className="px-4 py-3">
                      {s.clock_in_out_of_range || s.clock_out_out_of_range ? (
                        <span className="text-red-600">범위 밖</span>
                      ) : (
                        <span className="text-green-600">정상</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {s.status === "approved" ? (
                        <span className="text-green-600">승인됨</span>
                      ) : s.status === "done" ? (
                        <button
                          onClick={() => handleApprove(s.id)}
                          className="text-blue-600 underline"
                        >
                          승인하기
                        </button>
                      ) : (
                        <span className="text-neutral-400">근무중</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {s.sheet_row ? (
                        <span className="text-green-600">완료</span>
                      ) : (
                        <span className="text-red-600">실패</span>
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
