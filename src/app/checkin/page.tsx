"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import StaffGate from "@/components/StaffGate";

type AssignedRoom = { id: string; number: string; type_name: string };

function AssignedRoomsPreview() {
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

type Result =
  | { type: "check_in"; name: string; time: string }
  | {
      type: "check_out";
      name: string;
      time: string;
      hoursWorked: number;
      amount: number;
    };

async function submitToggle(): Promise<Result> {
  const res = await fetch("/api/attendance/toggle", { method: "POST" });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "처리 중 오류가 발생했습니다.");
  return data as Result;
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full bg-card border border-line rounded-2xl px-7 py-10 min-h-[320px] flex flex-col items-center justify-center gap-4">
      {children}
    </div>
  );
}

function BackArrowIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M15 5L8 12L15 19"
        stroke="#2b241d"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 12.5L9.5 18L20 6"
        stroke="#2b241d"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckinFlow({ name }: { name: string }) {
  const [status, setStatus] = useState<
    "loading" | "confirmCheckin" | "confirmCheckout" | "processing" | "done" | "error"
  >("loading");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");

  const refreshStatus = useCallback(() => {
    fetch("/api/attendance/status")
      .then((res) => res.json())
      .then((data) => {
        setStatus(data.hasOpenShift ? "confirmCheckout" : "confirmCheckin");
      });
  }, []);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  async function handleToggle() {
    setStatus("processing");
    try {
      const r = await submitToggle();
      setResult(r);
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
      setStatus("error");
    }
  }

  if (status === "loading" || status === "processing") {
    return (
      <Card>
        <p className="text-muted text-sm">처리 중...</p>
      </Card>
    );
  }

  if (status === "confirmCheckin") {
    return (
      <Card>
        <div className="w-14 h-14 rounded-full border-[1.6px] border-ink flex items-center justify-center">
          <CheckIcon />
        </div>
        <div className="text-center">
          <div className="text-[19px] font-bold">{name}님, 출근하셨나요?</div>
        </div>
        <button
          onClick={handleToggle}
          className="w-full bg-accent text-bg rounded-[10px] py-3.5 font-semibold text-[15px] mt-2"
        >
          출근 확인
        </button>
      </Card>
    );
  }

  if (status === "confirmCheckout") {
    return (
      <Card>
        <div className="w-14 h-14 rounded-full border-[1.6px] border-ink flex items-center justify-center">
          <BackArrowIcon />
        </div>
        <div className="text-center">
          <div className="text-[19px] font-bold">{name}님, 퇴근하시겠습니까?</div>
        </div>
        <button
          onClick={handleToggle}
          className="w-full bg-accent text-bg rounded-[10px] py-3.5 font-semibold text-[15px] mt-2"
        >
          퇴근 확인
        </button>
      </Card>
    );
  }

  if (status === "error") {
    return (
      <Card>
        <p className="text-brick text-sm">{error}</p>
        <button onClick={() => window.location.reload()} className="text-sm underline text-muted">
          다시 시도
        </button>
      </Card>
    );
  }

  if (!result) return null;

  const isCheckOut = result.type === "check_out";

  return (
    <div className="w-full flex flex-col gap-6">
      <Card>
        <div
          className={`w-16 h-16 rounded-full flex items-center justify-center ${
            isCheckOut ? "bg-[#ece2d0]" : "bg-sage-tint"
          }`}
        >
          <CheckIcon />
        </div>
        <div className="text-center">
          <div className="text-[21px] font-bold">
            {result.name}님 {isCheckOut ? "퇴근" : "출근"} 처리되었습니다
          </div>
          {isCheckOut && (
            <div className="text-[14px] text-muted mt-1">오늘도 수고했습니다!</div>
          )}
          <div className="text-[13px] text-muted mt-1.5">{result.time}</div>
        </div>
        {result.type === "check_out" && (
          <div className="flex gap-5 pt-4 mt-1 border-t border-line w-full justify-center">
            <div className="text-center">
              <div className="font-display text-xl font-bold">{result.hoursWorked}h</div>
              <div className="text-[10.5px] tracking-[0.1em] text-muted uppercase mt-0.5">
                근무시간
              </div>
            </div>
            <div className="w-px bg-line" />
            <div className="text-center">
              <div className="font-display text-xl font-bold">
                {result.amount.toLocaleString()}
              </div>
              <div className="text-[10.5px] tracking-[0.1em] text-muted uppercase mt-0.5">
                금액
              </div>
            </div>
          </div>
        )}
      </Card>

      {result.type === "check_in" && <AssignedRoomsPreview />}
    </div>
  );
}

export default function CheckinPage() {
  return (
    <StaffGate cardClassName="w-full max-w-md">
      {(name) => <CheckinFlow name={name} />}
    </StaffGate>
  );
}
