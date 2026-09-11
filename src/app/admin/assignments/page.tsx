"use client";

import { useEffect, useState, useCallback } from "react";
import AdminNav from "@/components/AdminNav";
import { kstDateString } from "@/lib/kst";

type Row = {
  room: { id: string; number: string; type_name: string };
  task: {
    id: string;
    staff_id: string | null;
    status: string;
    source: string;
    staff: { name: string } | { name: string }[] | null;
  } | null;
};

type Staff = { id: string; name: string; is_active: boolean };

function statusLabel(status: string | undefined) {
  if (status === "done") return { text: "완료", cls: "text-sage" };
  if (status === "carried_over") return { text: "이월됨", cls: "text-muted" };
  return { text: "대기", cls: "text-brick" };
}

export default function AdminAssignmentsPage() {
  const [date, setDate] = useState(kstDateString());
  const [rows, setRows] = useState<Row[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [assignRes, staffRes] = await Promise.all([
      fetch(`/api/admin/assignments?date=${date}`),
      fetch("/api/admin/staff"),
    ]);
    const assignData = await assignRes.json();
    const staffData = await staffRes.json();
    if (assignRes.ok) setRows(assignData.rows);
    if (staffRes.ok) setStaffList(staffData.staff.filter((s: Staff) => s.is_active));
    setLoading(false);
  }, [date]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 날짜가 바뀔 때마다 다시 불러온다
    load();
  }, [load]);

  async function assign(roomId: string, staffId: string) {
    await fetch("/api/admin/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, roomId, staffId: staffId || null }),
    });
    load();
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <AdminNav active="assignments" />
      <div className="flex-1 px-10 sm:px-14 py-10">
        <div className="flex items-baseline justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-[22px] font-bold">객실 배정</h1>
            <div className="w-7 h-0.5 bg-accent mt-2" />
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-[10.5px] tracking-[0.1em] text-muted uppercase">날짜</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="border border-line rounded-lg px-3 py-2 text-[13px] bg-card"
            />
          </label>
        </div>

        <div className="bg-card border border-line rounded-2xl overflow-x-auto">
          <table className="w-full text-[13.5px]">
            <thead>
              <tr className="text-left">
                {["객실", "타입", "담당자", "상태", "경로"].map((h) => (
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
                  <td colSpan={5} className="px-4 py-6 text-center text-muted">
                    불러오는 중...
                  </td>
                </tr>
              ) : (
                rows.map(({ room, task }) => {
                  const st = statusLabel(task?.status);
                  return (
                    <tr key={room.id} className="border-b border-line last:border-0">
                      <td className="px-4 py-3 font-semibold">{room.number}</td>
                      <td className="px-4 py-3 text-muted">{room.type_name}</td>
                      <td className="px-4 py-3">
                        <select
                          value={task?.staff_id ?? ""}
                          onChange={(e) => assign(room.id, e.target.value)}
                          className="border border-line rounded-lg px-2 py-1.5 bg-bg text-[13px]"
                        >
                          <option value="">미배정</option>
                          {staffList.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className={`px-4 py-3 ${st.cls}`}>{st.text}</td>
                      <td className="px-4 py-3 text-muted">
                        {task?.source === "self_added"
                          ? "알바 추가"
                          : task?.source === "slack"
                            ? "슬랙"
                            : "어드민"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
