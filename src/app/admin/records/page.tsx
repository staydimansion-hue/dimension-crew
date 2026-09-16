"use client";

import { useEffect, useState, useCallback } from "react";
import AdminNav from "@/components/AdminNav";

type Photo = { category: string; url: string };

type RecordRow = {
  id: string;
  workDate: string;
  roomNumber: string;
  roomType: string;
  staffName: string;
  source: string;
  completedAt: string | null;
  durationMinutes: number | null;
  notes: string | null;
  photos: Photo[];
};

function categoryLabel(category: string): string {
  return category === "room" ? "객실" : category === "bathroom" ? "욕실" : category;
}

type Summary = {
  staffName: string;
  roomCount: number;
  totalMinutes: number;
  avgMinutes: number;
};

type Staff = { id: string; name: string };

function toKstLocal(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
}

function monthAgo(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 10);
}
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function AdminRecordsPage() {
  const [from, setFrom] = useState(monthAgo());
  const [to, setTo] = useState(today());
  const [staffId, setStaffId] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [rows, setRows] = useState<RecordRow[]>([]);
  const [summary, setSummary] = useState<Summary[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [notesModal, setNotesModal] = useState<{
    roomNumber: string;
    workDate: string;
    text: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/admin/staff")
      .then((res) => res.json())
      .then((data) => setStaffList(data.staff ?? []));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ from, to });
    if (staffId) params.set("staffId", staffId);
    if (roomNumber) params.set("roomNumber", roomNumber);
    const res = await fetch(`/api/admin/records?${params.toString()}`);
    const data = await res.json();
    if (res.ok) {
      setRows(data.rows);
      setSummary(data.summary);
    }
    setLoading(false);
  }, [from, to, staffId, roomNumber]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 필터가 바뀔 때마다 다시 불러온다
    load();
  }, [load]);

  return (
    <div className="min-h-dvh bg-bg flex flex-col">
      <AdminNav active="records" />
      <div className="flex-1 px-10 sm:px-14 py-10">
        <div className="mb-6">
          <h1 className="text-[22px] font-bold">청소 기록</h1>
          <div className="w-7 h-0.5 bg-accent mt-2" />
        </div>

        <div className="flex items-end gap-3 mb-6 flex-wrap">
          <label className="flex flex-col gap-1">
            <span className="text-[10.5px] tracking-[0.1em] text-muted uppercase">시작일</span>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="border border-line rounded-lg px-3 py-2 text-[13px] bg-card"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10.5px] tracking-[0.1em] text-muted uppercase">종료일</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="border border-line rounded-lg px-3 py-2 text-[13px] bg-card"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10.5px] tracking-[0.1em] text-muted uppercase">알바</span>
            <select
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              className="border border-line rounded-lg pl-3 pr-8 py-2 text-[13px] bg-card"
            >
              <option value="">전체</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10.5px] tracking-[0.1em] text-muted uppercase">객실 번호</span>
            <input
              value={roomNumber}
              onChange={(e) => setRoomNumber(e.target.value)}
              placeholder="예: 301"
              className="border border-line rounded-lg px-3 py-2 text-[13px] bg-card w-28"
            />
          </label>
        </div>

        {summary.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {summary.map((s) => (
              <div key={s.staffName} className="bg-card border border-line rounded-xl p-4">
                <div className="text-[13px] font-semibold mb-1">{s.staffName}</div>
                <div className="text-[12px] text-muted">청소 {s.roomCount}건 · 평균 {s.avgMinutes}분</div>
              </div>
            ))}
          </div>
        )}

        <div className="bg-card border border-line rounded-2xl overflow-x-auto">
          <table className="w-full text-[13.5px] whitespace-nowrap">
            <thead>
              <tr className="text-left">
                {["날짜", "객실", "타입", "담당자", "경로", "완료시각", "소요시간", "사진", "특이사항"].map(
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
                  <td colSpan={9} className="px-4 py-6 text-center text-muted">
                    불러오는 중...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-6 text-center text-muted">
                    기록이 없습니다.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3 text-muted">{r.workDate}</td>
                    <td className="px-4 py-3 font-semibold">{r.roomNumber}</td>
                    <td className="px-4 py-3 text-muted">{r.roomType}</td>
                    <td className="px-4 py-3">{r.staffName}</td>
                    <td className="px-4 py-3 text-muted">
                      {r.source === "self_added" ? "알바 추가" : r.source === "slack" ? "슬랙" : "어드민"}
                    </td>
                    <td className="px-4 py-3">{r.completedAt ? toKstLocal(r.completedAt) : "-"}</td>
                    <td className="px-4 py-3">
                      {r.durationMinutes != null ? `${r.durationMinutes}분` : "-"}
                    </td>
                    <td className="px-4 py-3">
                      {r.photos.length > 0 ? (
                        <div className="flex gap-3">
                          {r.photos.map((p) => (
                            <button
                              key={p.category}
                              onClick={() => setLightbox(p.url)}
                              className="text-accent underline"
                            >
                              {categoryLabel(p.category)}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {r.notes ? (
                        <button
                          onClick={() =>
                            setNotesModal({
                              roomNumber: r.roomNumber,
                              workDate: r.workDate,
                              text: r.notes as string,
                            })
                          }
                          className="text-accent underline"
                        >
                          보기
                        </button>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          className="fixed inset-0 bg-black/60 flex items-center justify-center p-8 z-50"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox}
            alt="청소 완료 사진"
            className="max-w-full max-h-full rounded-xl"
          />
        </div>
      )}

      {notesModal && (
        <div
          onClick={() => setNotesModal(null)}
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-card rounded-2xl w-full max-w-sm p-6 flex flex-col gap-4"
          >
            <div>
              <div className="text-[15px] font-bold">{notesModal.roomNumber}호 특이사항</div>
              <div className="text-[11.5px] text-muted mt-0.5">{notesModal.workDate}</div>
            </div>
            <div className="text-[13.5px] whitespace-pre-wrap">{notesModal.text}</div>
            <button
              onClick={() => setNotesModal(null)}
              className="bg-ink text-bg rounded-[10px] py-2.5 font-semibold text-[13px]"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
