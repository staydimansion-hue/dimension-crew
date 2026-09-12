"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Category = "room" | "bathroom";

type Photo = { id: string; url: string | null; category: Category };

type Task = {
  id: string;
  status: "todo" | "done" | "carried_over";
  completed_at: string | null;
  source: string;
  rooms: { number: string; type_name: string } | { number: string; type_name: string }[] | null;
  photos: Photo[];
};

type AvailableRoom = { id: string; number: string; type_name: string };

const CATEGORIES: { key: Category; label: string }[] = [
  { key: "room", label: "객실" },
  { key: "bathroom", label: "욕실" },
];

function roomInfo(r: Task["rooms"]) {
  if (!r) return { number: "-", type_name: "-" };
  return Array.isArray(r) ? (r[0] ?? { number: "-", type_name: "-" }) : r;
}

function photoFor(photos: Photo[], category: Category): Photo | undefined {
  return photos.find((p) => p.category === category);
}

export default function RoomsChecklist({ name }: { name: string }) {
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [availableRooms, setAvailableRooms] = useState<AvailableRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [pickRoomId, setPickRoomId] = useState("");
  const [addRoomError, setAddRoomError] = useState("");
  const [modalTaskId, setModalTaskId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [capturingCategory, setCapturingCategory] = useState<Category | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  async function markDone(taskId: string) {
    await fetch("/api/rooms/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomTaskId: taskId }),
    });
    await load();
  }

  async function uploadPhoto(taskId: string, category: Category, file: File) {
    setUploading(true);
    const form = new FormData();
    form.append("roomTaskId", taskId);
    form.append("category", category);
    form.append("photo", file);
    await fetch("/api/rooms/photos", { method: "POST", body: form });
    setUploading(false);
    await load();
  }

  async function deletePhoto(photoId: string) {
    await fetch(`/api/rooms/photos/${photoId}`, { method: "DELETE" });
    await load();
  }

  async function carryOver(taskId: string) {
    await fetch("/api/rooms/carry-over", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomTaskId: taskId }),
    });
    setModalTaskId(null);
    await load();
  }

  async function addRoom() {
    if (!pickRoomId) return;
    setAddRoomError("");
    const res = await fetch("/api/rooms/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId: pickRoomId }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setAddRoomError(data?.error || "객실을 추가하지 못했습니다.");
      return;
    }
    setPickRoomId("");
    await load();
  }

  async function finishPhotoModal(taskId: string) {
    await markDone(taskId);
    setModalTaskId(null);
  }

  if (loading) {
    return <p className="text-muted text-sm text-center py-6">불러오는 중...</p>;
  }

  const modalTask = myTasks.find((t) => t.id === modalTaskId) ?? null;

  return (
    <div className="w-full">
      <h2 className="text-[15px] font-bold text-center mb-4">{name}님 오늘의 청소</h2>

      {myTasks.length === 0 ? (
        <p className="text-center text-muted text-sm mb-6">아직 배정된 객실이 없어요.</p>
      ) : (
        <div className="bg-card border border-line rounded-2xl overflow-hidden mb-6">
          <table className="w-full text-[13.5px]">
            <thead>
              <tr className="text-left bg-bg">
                <th className="px-3 py-2.5 text-[10.5px] tracking-[0.1em] text-muted uppercase font-semibold w-10">
                  번호
                </th>
                <th className="px-3 py-2.5 text-[10.5px] tracking-[0.1em] text-muted uppercase font-semibold">
                  방번호
                </th>
                <th className="px-3 py-2.5 text-[10.5px] tracking-[0.1em] text-muted uppercase font-semibold">
                  청소
                </th>
                <th className="px-3 py-2.5 text-[10.5px] tracking-[0.1em] text-muted uppercase font-semibold">
                  사진
                </th>
              </tr>
            </thead>
            <tbody>
              {myTasks.map((t, idx) => {
                const room = roomInfo(t.rooms);
                const isDone = t.status === "done";
                const isCarried = t.status === "carried_over";
                return (
                  <tr key={t.id} className="border-t border-line">
                    <td className="px-3 py-3 text-muted">{idx + 1}</td>
                    <td className="px-3 py-3 font-semibold">
                      {room.number}호
                      {isCarried && (
                        <span className="block text-[11px] text-muted font-normal">이월됨</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <button
                        onClick={() => setModalTaskId(t.id)}
                        disabled={isCarried}
                        className={`text-[12px] px-3 py-1.5 rounded-full font-semibold disabled:opacity-40 ${
                          isDone ? "bg-sage-tint text-sage" : "bg-[#ece2d0] text-ink"
                        }`}
                      >
                        {isDone ? "청소완료" : "청소전"}
                      </button>
                    </td>
                    <td className="px-3 py-3">
                      <button
                        onClick={() => setModalTaskId(t.id)}
                        disabled={isCarried}
                        className={`text-[12px] px-3 py-1.5 rounded-full font-semibold disabled:opacity-40 ${
                          t.photos.length >= CATEGORIES.length
                            ? "bg-sage-tint text-sage"
                            : "bg-[#ece2d0] text-ink"
                        }`}
                      >
                        사진{t.photos.length > 0 ? ` ${t.photos.length}` : ""}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

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
          {addRoomError && (
            <div className="text-[12px] text-brick mt-2">{addRoomError}</div>
          )}
        </div>
      )}

      {modalTask && (
        <div
          className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4"
          onClick={() => setModalTaskId(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-card rounded-2xl w-full max-w-sm p-6 flex flex-col gap-4"
          >
            <div className="text-[16px] font-bold">
              {roomInfo(modalTask.rooms).number}호 청소 사진
            </div>

            <div className="grid grid-cols-2 gap-3">
              {CATEGORIES.map((c) => {
                const p = photoFor(modalTask.photos, c.key);
                return (
                  <div key={c.key} className="flex flex-col gap-1.5">
                    <span className="text-[11px] tracking-[0.1em] text-muted uppercase text-center">
                      {c.label}
                    </span>
                    {p ? (
                      <div className="relative aspect-square rounded-lg overflow-hidden bg-bg">
                        {p.url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.url}
                            alt={`${c.label} 청소 사진`}
                            className="w-full h-full object-cover"
                          />
                        )}
                        <button
                          onClick={() => deletePhoto(p.id)}
                          className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-6 h-6 text-xs leading-none"
                          aria-label={`${c.label} 사진 삭제`}
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setCapturingCategory(c.key);
                          fileInputRef.current?.click();
                        }}
                        disabled={uploading}
                        className="aspect-square rounded-lg border border-dashed border-line flex items-center justify-center text-muted text-[13px] disabled:opacity-50"
                      >
                        {uploading && capturingCategory === c.key ? "업로드 중..." : "+ 촬영"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file && modalTaskId && capturingCategory) {
                  uploadPhoto(modalTaskId, capturingCategory, file);
                }
                e.target.value = "";
              }}
            />

            <button
              onClick={() => finishPhotoModal(modalTask.id)}
              className="bg-accent text-bg rounded-[10px] py-3 font-semibold text-[14px]"
            >
              사진 촬영 완료
            </button>

            {modalTask.status === "todo" && (
              <button
                onClick={() => carryOver(modalTask.id)}
                className="text-muted text-[12px] underline"
              >
                오늘 못 끝냄 → 다음날로 넘기기
              </button>
            )}

            <button onClick={() => setModalTaskId(null)} className="text-muted text-[12px]">
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
