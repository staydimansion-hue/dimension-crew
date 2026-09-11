"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

type Staff = {
  id: string;
  name: string;
  phone: string;
  hourly_wage: number | null;
  is_active: boolean;
};

export default function AdminStaffPage() {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [hourlyWage, setHourlyWage] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [wageDrafts, setWageDrafts] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/staff");
    const data = await res.json();
    if (res.ok) setStaffList(data.staff);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 최초 마운트 시 목록을 불러온다
    load();
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");
    const res = await fetch("/api/admin/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, hourlyWage: Number(hourlyWage) }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "등록에 실패했습니다.");
      return;
    }
    setNotice(`등록 완료. 초기 PIN은 ${data.initialPin} 입니다.`);
    setName("");
    setPhone("");
    setHourlyWage("");
    load();
  }

  async function toggleActive(staff: Staff) {
    await fetch(`/api/admin/staff/${staff.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !staff.is_active }),
    });
    load();
  }

  async function resetPin(staff: Staff) {
    await fetch(`/api/admin/staff/${staff.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPin: "0808" }),
    });
    setNotice(`${staff.name}님 PIN을 0808로 초기화했습니다.`);
  }

  async function updateWage(staff: Staff) {
    const value = wageDrafts[staff.id];
    const hourlyWage = Number(value);
    if (!Number.isFinite(hourlyWage) || hourlyWage < 0) return;
    const res = await fetch(`/api/admin/staff/${staff.id}/wage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hourlyWage }),
    });
    const data = await res.json();
    if (data.belowMinWage) {
      setNotice(`⚠️ ${staff.name}님 시급이 최저시급보다 낮습니다. 확인해주세요.`);
    } else {
      setNotice(`${staff.name}님 시급이 오늘부터 ${hourlyWage.toLocaleString()}원으로 변경됩니다.`);
    }
    load();
  }

  return (
    <div className="min-h-screen bg-neutral-50 px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold">직원 관리</h1>
          <Link href="/admin" className="text-blue-600 underline text-sm">
            출퇴근 기록으로
          </Link>
        </div>

        <form
          onSubmit={handleCreate}
          className="bg-white rounded-2xl shadow-md p-5 mb-6 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"
        >
          <label className="text-sm">
            이름
            <input
              className="block w-full border border-neutral-300 rounded-lg px-3 py-2 mt-1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>
          <label className="text-sm">
            전화번호
            <input
              className="block w-full border border-neutral-300 rounded-lg px-3 py-2 mt-1"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="- 없이"
              required
            />
          </label>
          <label className="text-sm">
            시급(원)
            <input
              type="number"
              className="block w-full border border-neutral-300 rounded-lg px-3 py-2 mt-1"
              value={hourlyWage}
              onChange={(e) => setHourlyWage(e.target.value)}
              required
            />
          </label>
          <button className="bg-neutral-900 text-white rounded-lg px-4 py-2 text-sm h-fit">
            직원 추가
          </button>
        </form>

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        {notice && <p className="text-sm text-green-700 mb-3">{notice}</p>}

        <div className="bg-white rounded-2xl shadow-md overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left">
                <th className="px-4 py-3">이름</th>
                <th className="px-4 py-3">전화번호</th>
                <th className="px-4 py-3">현재 시급</th>
                <th className="px-4 py-3">시급 변경(오늘부터)</th>
                <th className="px-4 py-3">상태</th>
                <th className="px-4 py-3">작업</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-neutral-400">
                    불러오는 중...
                  </td>
                </tr>
              ) : (
                staffList.map((s) => (
                  <tr key={s.id} className="border-b border-neutral-100">
                    <td className="px-4 py-3">{s.name}</td>
                    <td className="px-4 py-3">{s.phone}</td>
                    <td className="px-4 py-3">
                      {s.hourly_wage != null ? `${s.hourly_wage.toLocaleString()}원` : "-"}
                    </td>
                    <td className="px-4 py-3 flex gap-2 items-center">
                      <input
                        type="number"
                        placeholder="새 시급"
                        className="w-24 border border-neutral-200 rounded px-2 py-1"
                        value={wageDrafts[s.id] ?? ""}
                        onChange={(e) =>
                          setWageDrafts((prev) => ({ ...prev, [s.id]: e.target.value }))
                        }
                      />
                      <button
                        onClick={() => updateWage(s)}
                        className="text-blue-600 underline text-xs"
                      >
                        변경
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      {s.is_active ? (
                        <span className="text-green-600">재직중</span>
                      ) : (
                        <span className="text-neutral-400">비활성</span>
                      )}
                    </td>
                    <td className="px-4 py-3 space-x-3">
                      <button
                        onClick={() => toggleActive(s)}
                        className="text-blue-600 underline"
                      >
                        {s.is_active ? "비활성화" : "활성화"}
                      </button>
                      <button onClick={() => resetPin(s)} className="text-neutral-500 underline">
                        PIN 초기화
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
