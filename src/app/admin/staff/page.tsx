"use client";

import { useEffect, useState, useCallback } from "react";
import AdminNav from "@/components/AdminNav";

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
      setNotice(`⚠ ${staff.name}님 시급이 최저시급보다 낮습니다. 확인해주세요.`);
    } else {
      setNotice(`${staff.name}님 시급이 오늘부터 ${hourlyWage.toLocaleString()}원으로 변경됩니다.`);
    }
    load();
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <AdminNav active="staff" />
      <div className="flex-1 px-10 sm:px-14 py-10">
        <div className="mb-6">
          <h1 className="text-[22px] font-bold">직원 관리</h1>
          <div className="w-7 h-0.5 bg-accent mt-2" />
        </div>

        <form
          onSubmit={handleCreate}
          className="bg-card border border-line rounded-2xl p-6 mb-6 grid grid-cols-1 sm:grid-cols-4 gap-5 items-end"
        >
          <label className="flex flex-col gap-2">
            <span className="text-[10.5px] tracking-[0.1em] text-muted uppercase">이름</span>
            <input
              className="border-0 border-b border-line bg-transparent text-[14px] py-1.5 outline-none focus:border-accent"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-[10.5px] tracking-[0.1em] text-muted uppercase">전화번호</span>
            <input
              className="border-0 border-b border-line bg-transparent text-[14px] py-1.5 outline-none focus:border-accent"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="010 0000 0000"
              required
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-[10.5px] tracking-[0.1em] text-muted uppercase">시급(원)</span>
            <input
              type="number"
              className="border-0 border-b border-line bg-transparent text-[14px] py-1.5 outline-none focus:border-accent"
              value={hourlyWage}
              onChange={(e) => setHourlyWage(e.target.value)}
              required
            />
          </label>
          <button className="bg-ink text-bg rounded-lg px-5 py-3 text-[13px] font-semibold h-fit whitespace-nowrap">
            직원 추가
          </button>
        </form>

        {error && <p className="text-sm text-brick mb-3">{error}</p>}
        {notice && <p className="text-sm text-sage mb-3">{notice}</p>}

        <div className="bg-card border border-line rounded-2xl overflow-x-auto">
          <table className="w-full text-[13.5px]">
            <thead>
              <tr className="text-left">
                {["이름", "전화번호", "현재 시급", "시급 변경 (오늘부터)", "상태", "작업"].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-[11px] tracking-[0.1em] text-muted uppercase font-semibold border-b border-line"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-muted">
                    불러오는 중...
                  </td>
                </tr>
              ) : (
                staffList.map((s) => (
                  <tr key={s.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3 font-semibold">{s.name}</td>
                    <td className="px-4 py-3 text-muted">{s.phone}</td>
                    <td className="px-4 py-3">
                      {s.hourly_wage != null ? `${s.hourly_wage.toLocaleString()}원` : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 items-center">
                        <input
                          type="number"
                          placeholder="새 시급"
                          className="w-24 border border-line rounded px-2 py-1.5 bg-bg"
                          value={wageDrafts[s.id] ?? ""}
                          onChange={(e) =>
                            setWageDrafts((prev) => ({ ...prev, [s.id]: e.target.value }))
                          }
                        />
                        <button
                          onClick={() => updateWage(s)}
                          className="text-accent underline text-xs whitespace-nowrap"
                        >
                          변경
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {s.is_active ? (
                        <span className="text-sage">재직중</span>
                      ) : (
                        <span className="text-muted">비활성</span>
                      )}
                    </td>
                    <td className="px-4 py-3 space-x-3 whitespace-nowrap">
                      <button onClick={() => toggleActive(s)} className="text-ink underline">
                        {s.is_active ? "비활성화" : "활성화"}
                      </button>
                      <button onClick={() => resetPin(s)} className="text-muted underline">
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
