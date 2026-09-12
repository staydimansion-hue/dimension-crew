"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import StaffGate from "@/components/StaffGate";
import AssignedRoomsPreview from "@/components/AssignedRoomsPreview";

function HomeFlow({ name }: { name: string }) {
  const [hasOpenShift, setHasOpenShift] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/attendance/status")
      .then((res) => res.json())
      .then((data) => setHasOpenShift(Boolean(data.hasOpenShift)));
  }, []);

  return (
    <div className="w-full flex flex-col gap-5 items-center">
      <div className="text-center">
        <div className="text-[19px] font-bold">
          {hasOpenShift == null
            ? "확인 중..."
            : hasOpenShift
              ? `${name}님, 출근 중이에요`
              : `${name}님, 출근 전이에요`}
        </div>
      </div>

      <Link
        href="/checkin"
        className="w-full bg-accent text-bg rounded-[10px] py-3.5 font-semibold text-center text-[15px]"
      >
        QR 스캔하기
      </Link>

      {hasOpenShift && <AssignedRoomsPreview />}
    </div>
  );
}

export default function Home() {
  return (
    <StaffGate cardClassName="w-full max-w-md" activeTab="home">
      {(name) => <HomeFlow name={name} />}
    </StaffGate>
  );
}
