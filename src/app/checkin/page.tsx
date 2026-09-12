"use client";

import { useCallback, useEffect, useState } from "react";
import StaffGate from "@/components/StaffGate";
import QrScanner from "@/components/QrScanner";
import AssignedRoomsPreview from "@/components/AssignedRoomsPreview";

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

function PersonIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="7.5" r="3.5" stroke="#2b241d" strokeWidth="1.8" />
      <path
        d="M4.5 20c0-4.14 3.36-7 7.5-7s7.5 2.86 7.5 7"
        stroke="#2b241d"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CheckinFlow({
  name,
  onCheckedIn,
}: {
  name: string;
  onCheckedIn: () => void;
}) {
  const [status, setStatus] = useState<
    | "loadingToken"
    | "scanning"
    | "confirmCheckin"
    | "confirmCheckout"
    | "processing"
    | "done"
    | "error"
  >("loadingToken");
  const [qrToken, setQrToken] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/staff/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.qrToken) {
          setQrToken(data.qrToken);
          setStatus("scanning");
        } else {
          setError("QR 인식 정보를 불러오지 못했습니다.");
          setStatus("error");
        }
      });
  }, []);

  const refreshStatus = useCallback(() => {
    fetch("/api/attendance/status")
      .then((res) => res.json())
      .then((data) => {
        setStatus(data.hasOpenShift ? "confirmCheckout" : "confirmCheckin");
      });
  }, []);

  async function handleToggle() {
    setStatus("processing");
    try {
      const r = await submitToggle();
      setResult(r);
      setStatus("done");
      if (r.type === "check_in") onCheckedIn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
      setStatus("error");
    }
  }

  if (status === "loadingToken" || status === "processing") {
    return (
      <Card>
        <p className="text-muted text-sm">처리 중...</p>
      </Card>
    );
  }

  if (status === "scanning") {
    return (
      <Card>
        <QrScanner expectedToken={qrToken} onScanned={refreshStatus} />
      </Card>
    );
  }

  if (status === "confirmCheckin") {
    return (
      <Card>
        <div className="w-14 h-14 rounded-full border-[1.6px] border-ink flex items-center justify-center">
          <PersonIcon />
        </div>
        <div className="text-center">
          <div className="text-[19px] font-bold">{name}님, 출근하셨나요?</div>
        </div>
        <button
          onClick={handleToggle}
          className="w-full bg-accent text-bg rounded-[10px] py-3.5 font-semibold text-[15px] mt-2"
        >
          출근하기
        </button>
      </Card>
    );
  }

  if (status === "confirmCheckout") {
    return (
      <Card>
        <div className="w-14 h-14 rounded-full border-[1.6px] border-ink flex items-center justify-center">
          <PersonIcon />
        </div>
        <div className="text-center">
          <div className="text-[19px] font-bold">{name}님, 퇴근하시겠습니까?</div>
        </div>
        <button
          onClick={handleToggle}
          className="w-full bg-accent text-bg rounded-[10px] py-3.5 font-semibold text-[15px] mt-2"
        >
          퇴근하기
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
          <PersonIcon />
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
    <StaffGate cardClassName="w-full max-w-md" activeTab="home">
      {(name, refreshNavStatus) => (
        <CheckinFlow name={name} onCheckedIn={refreshNavStatus} />
      )}
    </StaffGate>
  );
}
