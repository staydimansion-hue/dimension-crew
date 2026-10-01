"use client";

import { useEffect, useState, useCallback } from "react";
import AdminNav from "@/components/AdminNav";

type Room = {
  id: string;
  number: string;
  type_name: string;
  is_active: boolean;
};

export default function AdminRoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [number, setNumber] = useState("");
  const [typeName, setTypeName] = useState("");
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTypeName, setEditTypeName] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/rooms");
    const data = await res.json();
    if (res.ok) setRooms(data.rooms);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 최초 마운트 시 목록을 불러온다
    load();
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/admin/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ number, typeName }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "등록에 실패했습니다.");
      return;
    }
    setNumber("");
    setTypeName("");
    load();
  }

  async function toggleActive(room: Room) {
    await fetch(`/api/admin/rooms/${room.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !room.is_active }),
    });
    load();
  }

  function startEdit(room: Room) {
    setEditingId(room.id);
    setEditTypeName(room.type_name);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditTypeName("");
  }

  async function saveEdit(room: Room) {
    const trimmed = editTypeName.trim();
    if (!trimmed) return;
    setSavingEdit(true);
    await fetch(`/api/admin/rooms/${room.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ typeName: trimmed }),
    });
    setSavingEdit(false);
    setEditingId(null);
    load();
  }

  return (
    <div className="min-h-dvh bg-bg flex flex-col">
      <AdminNav active="rooms" />
      <div className="flex-1 px-10 sm:px-14 py-10">
        <div className="mb-6">
          <h1 className="text-[22px] font-bold">객실 관리</h1>
          <div className="w-7 h-0.5 bg-accent mt-2" />
        </div>

        <form
          onSubmit={handleCreate}
          className="bg-card border border-line rounded-2xl p-6 mb-6 grid grid-cols-1 sm:grid-cols-3 gap-5 items-end"
        >
          <label className="flex flex-col gap-2">
            <span className="text-[10.5px] tracking-[0.1em] text-muted uppercase">
              객실 번호
            </span>
            <input
              className="border-0 border-b border-line bg-transparent text-[14px] py-1.5 outline-none focus:border-accent"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="501"
              required
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-[10.5px] tracking-[0.1em] text-muted uppercase">
              타입
            </span>
            <input
              className="border-0 border-b border-line bg-transparent text-[14px] py-1.5 outline-none focus:border-accent"
              value={typeName}
              onChange={(e) => setTypeName(e.target.value)}
              placeholder="스탠다드룸"
              required
            />
          </label>
          <button className="bg-ink text-bg rounded-lg px-5 py-3 text-[13px] font-semibold h-fit whitespace-nowrap">
            객실 추가
          </button>
        </form>

        {error && <p className="text-sm text-brick mb-3">{error}</p>}

        <div className="bg-card border border-line rounded-2xl overflow-x-auto">
          <table className="w-full text-[13.5px] whitespace-nowrap">
            <thead>
              <tr className="text-left">
                {["객실 번호", "타입", "상태", "작업"].map((h) => (
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
                  <td colSpan={4} className="px-4 py-6 text-center text-muted">
                    불러오는 중...
                  </td>
                </tr>
              ) : (
                rooms.map((r) => {
                  const isEditing = editingId === r.id;
                  return (
                    <tr key={r.id} className="border-b border-line last:border-0">
                      <td className="px-4 py-3 font-semibold">{r.number}</td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input
                            autoFocus
                            className="border-0 border-b border-line bg-transparent text-[13.5px] py-0.5 outline-none focus:border-accent"
                            value={editTypeName}
                            onChange={(e) => setEditTypeName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveEdit(r);
                              if (e.key === "Escape") cancelEdit();
                            }}
                          />
                        ) : (
                          r.type_name
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {r.is_active ? (
                          <span className="text-sage">사용중</span>
                        ) : (
                          <span className="text-muted">비활성</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <div className="flex gap-3">
                            <button
                              onClick={() => saveEdit(r)}
                              disabled={savingEdit}
                              className="text-accent underline disabled:opacity-50"
                            >
                              저장
                            </button>
                            <button onClick={cancelEdit} className="text-muted underline">
                              취소
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-3">
                            <button onClick={() => startEdit(r)} className="text-ink underline">
                              수정
                            </button>
                            <button onClick={() => toggleActive(r)} className="text-ink underline">
                              {r.is_active ? "비활성화" : "활성화"}
                            </button>
                          </div>
                        )}
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
