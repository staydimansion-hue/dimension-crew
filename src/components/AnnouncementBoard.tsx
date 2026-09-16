"use client";

import { useEffect, useState } from "react";

type Announcement = { id: string; message: string; created_at: string };

function toKstShort(iso: string): string {
  return new Date(iso).toLocaleDateString("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
  });
}

export default function AnnouncementBoard() {
  const [list, setList] = useState<Announcement[]>([]);

  useEffect(() => {
    fetch("/api/staff/announcements")
      .then((res) => res.json())
      .then((data) => setList(data.announcements ?? []))
      .catch(() => {});
  }, []);

  if (list.length === 0) return null;

  return (
    <div className="w-full bg-sage-tint rounded-2xl px-5 py-4 mb-4 flex flex-col gap-3">
      <div className="text-[11px] tracking-[0.1em] text-sage uppercase font-semibold">
        공지사항
      </div>
      <div className="flex flex-col gap-2.5">
        {list.map((a) => (
          <div key={a.id} className="border-t border-sage/20 pt-2.5 first:border-0 first:pt-0">
            <div className="text-[13px] whitespace-pre-wrap">{a.message}</div>
            <div className="text-[11px] text-muted mt-1">{toKstShort(a.created_at)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
