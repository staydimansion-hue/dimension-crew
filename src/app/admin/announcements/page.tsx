"use client";

import { useEffect, useState, useCallback } from "react";
import AdminNav from "@/components/AdminNav";

type Announcement = { id: string; message: string; created_at: string };

function toKstLocal(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
}

export default function AdminAnnouncementsPage() {
  const [list, setList] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/announcements");
    const data = await res.json();
    if (res.ok) setList(data.announcements);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 최초 마운트 시 목록을 불러온다
    load();
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const res = await fetch("/api/admin/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error || "등록에 실패했습니다.");
      return;
    }
    setMessage("");
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("이 공지사항을 삭제할까요?")) return;
    await fetch(`/api/admin/announcements/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="min-h-dvh bg-bg flex flex-col">
      <AdminNav active="announcements" />
      <div className="flex-1 px-10 sm:px-14 py-10">
        <div className="mb-6">
          <h1 className="text-[22px] font-bold">공지사항</h1>
          <div className="w-7 h-0.5 bg-accent mt-2" />
          <p className="text-[12.5px] text-muted mt-2">
            등록하면 전체 근로자 앱에 바로 노출됩니다.
          </p>
        </div>

        <form
          onSubmit={handleCreate}
          className="bg-card border border-line rounded-2xl p-6 mb-6 flex flex-col gap-3"
        >
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="예: 9/20(일)은 명절 연휴로 체크아웃 시간이 오전 10시로 앞당겨집니다."
            rows={3}
            required
            className="w-full border border-line rounded-lg px-3 py-2.5 text-[14px] bg-bg resize-none"
          />
          {error && <p className="text-sm text-brick">{error}</p>}
          <button
            disabled={submitting}
            className="self-end bg-ink text-bg rounded-lg px-5 py-2.5 text-[13px] font-semibold disabled:opacity-50"
          >
            {submitting ? "등록 중..." : "등록"}
          </button>
        </form>

        <div className="flex flex-col gap-3">
          {loading ? (
            <p className="text-muted text-[13px]">불러오는 중...</p>
          ) : list.length === 0 ? (
            <p className="text-muted text-[13px]">등록된 공지사항이 없습니다.</p>
          ) : (
            list.map((a) => (
              <div
                key={a.id}
                className="bg-card border border-line rounded-xl p-4 flex items-start justify-between gap-4"
              >
                <div>
                  <div className="text-[13.5px] whitespace-pre-wrap">{a.message}</div>
                  <div className="text-[11px] text-muted mt-1.5">{toKstLocal(a.created_at)}</div>
                </div>
                <button
                  onClick={() => handleDelete(a.id)}
                  className="text-brick underline text-[12px] shrink-0"
                >
                  삭제
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
