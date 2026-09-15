"use client";

import { useEffect, useState, useCallback } from "react";
import AdminNav from "@/components/AdminNav";

type ChecklistStatus = "todo" | "in_progress" | "done";

type ChecklistItem = {
  id: string;
  title: string;
  due_date: string | null;
  status: ChecklistStatus;
  completed_at: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

const STATUS_EMOJI: Record<ChecklistStatus, string> = {
  done: "🟥",
  in_progress: "🟨",
  todo: "⬜",
};

const STATUS_OPTIONS: { value: ChecklistStatus; label: string }[] = [
  { value: "todo", label: "미진행" },
  { value: "in_progress", label: "진행중" },
  { value: "done", label: "완료" },
];

export default function AdminChecklistPage() {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/checklist");
    const data = await res.json();
    if (res.ok) setItems(data.items);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 최초 마운트 시 목록을 불러온다
    load();
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/admin/checklist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, due_date: dueDate || null }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "등록에 실패했습니다.");
      return;
    }
    setTitle("");
    setDueDate("");
    load();
  }

  async function changeStatus(item: ChecklistItem, status: ChecklistStatus) {
    if (status === item.status) return;
    await fetch(`/api/admin/checklist/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  }

  async function handleDelete(item: ChecklistItem) {
    if (!confirm("이 항목을 삭제할까요?")) return;
    await fetch(`/api/admin/checklist/${item.id}`, { method: "DELETE" });
    load();
  }

  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Seoul",
  });

  return (
    <div className="min-h-dvh bg-bg flex flex-col">
      <AdminNav active="checklist" />
      <div className="flex-1 px-5 sm:px-14 py-10">
        <div className="mb-6">
          <h1 className="text-[22px] font-bold">마감 체크리스트</h1>
          <div className="w-7 h-0.5 bg-accent mt-2" />
          <p className="text-[12px] text-muted mt-3">
            🟥 완료 · 🟨 진행중 · ⬜ 미진행
          </p>
        </div>

        <form
          onSubmit={handleCreate}
          className="bg-card border border-line rounded-2xl p-6 mb-6 grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-5 items-end"
        >
          <label className="flex flex-col gap-2">
            <span className="text-[10.5px] tracking-[0.1em] text-muted uppercase">
              제목
            </span>
            <input
              className="border-0 border-b border-line bg-transparent text-[14px] py-1.5 outline-none focus:border-accent"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 세탁물 수거 확인"
              required
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-[10.5px] tracking-[0.1em] text-muted uppercase">
              마감일
            </span>
            <input
              type="date"
              className="border-0 border-b border-line bg-transparent text-[14px] py-1.5 outline-none focus:border-accent"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </label>
          <button className="bg-ink text-bg rounded-lg px-5 py-3 text-[13px] font-semibold h-fit whitespace-nowrap">
            항목 추가
          </button>
        </form>

        {error && <p className="text-sm text-brick mb-3">{error}</p>}

        {loading ? (
          <p className="text-muted text-center py-6">불러오는 중...</p>
        ) : (
          <div className="bg-card border border-line rounded-2xl">
            {items.length === 0 ? (
              <p className="px-4 py-6 text-center text-muted">
                항목이 없습니다.
              </p>
            ) : (
              items.map((item) => {
                const overdue =
                  item.status !== "done" &&
                  item.due_date &&
                  item.due_date < today;
                return (
                  <div
                    key={item.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 border-b border-line last:border-0"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="shrink-0 text-[16px]">
                        {STATUS_EMOJI[item.status]}
                      </span>
                      <span className="min-w-0">
                        <span className="text-[14px] text-ink">
                          {item.title}
                        </span>
                        {item.due_date && (
                          <span className="ml-2 text-[12px] text-muted">
                            {item.due_date}
                            {overdue && (
                              <span className="ml-1 text-brick">
                                ⚠️ 기한 지남
                              </span>
                            )}
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex rounded-lg border border-line overflow-hidden">
                        {STATUS_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => changeStatus(item, opt.value)}
                            className={`px-3 py-1.5 text-[12px] ${
                              item.status === opt.value
                                ? "bg-ink text-bg font-semibold"
                                : "text-muted"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => handleDelete(item)}
                        className="text-muted underline text-[12px]"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
