"use client";

import { useCallback, useEffect, useState } from "react";
import StaffGate from "@/components/StaffGate";
import { getCurrentPositionSafe } from "@/lib/geolocateClient";

type Result =
  | { type: "check_in"; name: string; time: string; outOfRange: boolean | null }
  | {
      type: "check_out";
      name: string;
      time: string;
      hoursWorked: number;
      amount: number;
      outOfRange: boolean | null;
    };

async function submitToggle(): Promise<Result> {
  const pos = await getCurrentPositionSafe();
  const res = await fetch("/api/attendance/toggle", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(pos ? { lat: pos.lat, lng: pos.lng } : {}),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "처리 중 오류가 발생했습니다.");
  return data as Result;
}

function CheckinFlow({ name }: { name: string }) {
  const [status, setStatus] = useState<"loading" | "confirmCheckout" | "done" | "error">(
    "loading"
  );
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");

  const doCheckIn = useCallback(async () => {
    try {
      const r = await submitToggle();
      setResult(r);
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
      setStatus("error");
    }
  }, []);

  async function doCheckOut() {
    setStatus("loading");
    try {
      const r = await submitToggle();
      setResult(r);
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
      setStatus("error");
    }
  }

  useEffect(() => {
    fetch("/api/attendance/status")
      .then((res) => res.json())
      .then((data) => {
        if (data.hasOpenShift) {
          setStatus("confirmCheckout");
        } else {
          doCheckIn();
        }
      });
  }, [doCheckIn]);

  if (status === "loading") {
    return <p className="text-neutral-400 text-sm">처리 중...</p>;
  }

  if (status === "confirmCheckout") {
    return (
      <div className="text-center">
        <p className="text-lg font-semibold mb-4">{name}님, 퇴근하시겠습니까?</p>
        <button
          onClick={doCheckOut}
          className="bg-neutral-900 text-white rounded-lg px-6 py-3 font-semibold"
        >
          퇴근하기
        </button>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="text-center">
        <p className="text-red-600 mb-3">{error}</p>
        <button onClick={() => window.location.reload()} className="text-sm underline">
          다시 시도
        </button>
      </div>
    );
  }

  if (!result) return null;

  return (
    <div className="text-center">
      <div className="text-3xl mb-3">{result.type === "check_in" ? "✅" : "👋"}</div>
      <p className="text-lg font-semibold">
        {result.name}님 {result.type === "check_in" ? "출근 완료" : "퇴근 완료"}
      </p>
      <p className="text-sm text-neutral-500 mt-1">{result.time}</p>
      {result.type === "check_out" && (
        <p className="text-sm text-neutral-500 mt-1">
          근무시간 {result.hoursWorked}시간 · {result.amount.toLocaleString()}원
        </p>
      )}
      {result.outOfRange && (
        <p className="text-sm text-amber-600 mt-2">
          ⚠️ 근무지 반경 밖에서 처리되어 관리자 확인이 필요합니다.
        </p>
      )}
    </div>
  );
}

export default function CheckinPage() {
  return <StaffGate>{(name) => <CheckinFlow name={name} />}</StaffGate>;
}
