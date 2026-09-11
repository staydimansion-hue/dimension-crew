"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import StaffGate from "@/components/StaffGate";

type Task = {
  id: string;
  status: "todo" | "done" | "carried_over";
  completed_at: string | null;
  source: string;
  rooms: { number: string; type_name: string } | { number: string; type_name: string }[] | null;
};

type AvailableRoom = { id: string; number: string; type_name: string };

function roomInfo(r: Task["rooms"]) {
  if (!r) return { number: "-", type_name: "-" };
  return Array.isArray(r) ? (r[0] ?? { number: "-", type_name: "-" }) : r;
}

function RoomsFlow({ name }: { name: string }) {
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [availableRooms, setAvailableRooms] = useState<AvailableRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [pickRoomId, setPickRoomId] = useState("");
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/rooms/today");
    const data = await res.json();
    if (res.ok) {
      setMyTasks(data.myTasks);
      setAvailableRooms(data.availableRooms);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 최초 마운트 시 오늘 목록을 불러온다
    load();
  }, [load]);

  async function complete(taskId: string, file: File | null) {
    setBusyTaskId(taskId);
    const form = new FormData();
    form.append("roomTaskId", taskId);
    if (file) form.append("photo", file);
    await fetch("/api/rooms/complete", { method: "POST", body: form });
    setBusyTaskId(null);
    load();
  }

  async function carryOver(taskId: string) {
    setBusyTaskId(taskId);
    await fetch("/api/rooms/carry-over", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomTaskId: taskId }),
    });
    setBusyTaskId(null);
    load();
  }

  async function addRoom() {
    if (!pickRoomId) return;
    await fetch("/api/rooms/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId: pickRoomId }),
    });
    setPickRoomId("");
    load();
  }

  if (loading) {
    return <p className="text-muted text-sm text-center py-10">불러오는 중...</p>;
  }

  return (
    <div className="w-full">
      <h1 className="text-lg font-bold text-center mb-6">{name}님 오늘의 청소</h1>

      {myTasks.length === 0 && (
        <p className="text-center text-muted text-sm mb-6">아직 배정된 객실이 없어요.</p>
      )}

      <div className="flex flex-col gap-3 mb-6">
        {myTasks.map((t) => {
          const room = roomInfo(t.rooms);
          const isBusy = busyTaskId === t.id;
          return (
            <div
              key={t.id}
              className="bg-card border border-line rounded-xl px-5 py-4 flex items-center justify-between gap-3"
            >
              <div>
                <div className="font-semibold text-[15px]">
                  {room.number}호{" "}
                  <span className="text-muted font-normal text-[13px]">{room.type_name}</span>
                </div>
                {t.status === "done" && t.completed_at && (
                  <div className="text-xs text-sage mt-1">
                    완료 · {new Date(t.completed_at).toLocaleTimeString("ko-KR", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit" })}
                  </div>
                )}
                {t.status === "carried_over" && (
                  <div className="text-xs text-muted mt-1">다음날로 이월됨</div>
                )}
                {t.source === "self_added" && t.status === "todo" && (
                  <div className="text-xs text-accent mt-1">직접 추가</div>
                )}
              </div>

              {t.status === "todo" && (
                <div className="flex gap-2 shrink-0">
                  <input
                    ref={(el) => {
                      fileInputs.current[t.id] = el;
                    }}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => complete(t.id, e.target.files?.[0] ?? null)}
                  />
                  <button
                    disabled={isBusy}
                    onClick={() => fileInputs.current[t.id]?.click()}
                    className="bg-accent text-bg rounded-lg px-4 py-2 text-[13px] font-semibold disabled:opacity-50"
                  >
                    완료
                  </button>
                  <button
                    disabled={isBusy}
                    onClick={() => carryOver(t.id)}
                    className="text-muted text-[12px] underline"
                  >
                    미완료로 넘기기
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {availableRooms.length > 0 && (
        <div className="bg-sage-tint rounded-xl px-5 py-4">
          <div className="text-[13px] font-semibold mb-2.5">+ 객실 추가</div>
          <div className="flex gap-2">
            <select
              value={pickRoomId}
              onChange={(e) => setPickRoomId(e.target.value)}
              className="flex-1 border border-line rounded-lg px-3 py-2 text-[13px] bg-card"
            >
              <option value="">객실 선택</option>
              {availableRooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.number}호 · {r.type_name}
                </option>
              ))}
            </select>
            <button
              onClick={addRoom}
              disabled={!pickRoomId}
              className="bg-ink text-bg rounded-lg px-4 py-2 text-[13px] font-semibold disabled:opacity-50"
            >
              추가
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RoomsPage() {
  return (
    <StaffGate cardClassName="w-full max-w-md">
      {(name) => <RoomsFlow name={name} />}
    </StaffGate>
  );
}
