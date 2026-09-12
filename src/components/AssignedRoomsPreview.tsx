"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type AssignedRoom = { id: string; number: string; type_name: string };

export default function AssignedRoomsPreview() {
  const [rooms, setRooms] = useState<AssignedRoom[] | null>(null);

  useEffect(() => {
    fetch("/api/rooms/today")
      .then((res) => res.json())
      .then((data) => {
        const list = (data.myTasks ?? [])
          .map((t: { rooms: AssignedRoom | AssignedRoom[] | null }) =>
            Array.isArray(t.rooms) ? t.rooms[0] : t.rooms
          )
          .filter(Boolean);
        setRooms(list);
      });
  }, []);

  if (!rooms || rooms.length === 0) return null;

  return (
    <div className="w-full bg-card border border-line rounded-2xl px-6 py-5">
      <div className="text-[11px] tracking-[0.1em] text-muted uppercase mb-2.5">
        오늘 배정된 객실
      </div>
      <div className="flex flex-wrap gap-2 mb-3">
        {rooms.map((r) => (
          <span
            key={r.id}
            className="text-[12.5px] bg-bg border border-line rounded-full px-3 py-1"
          >
            {r.number}호 · {r.type_name}
          </span>
        ))}
      </div>
      <Link href="/rooms" className="text-[12.5px] text-accent underline">
        청소 탭에서 완료 처리하기
      </Link>
    </div>
  );
}
