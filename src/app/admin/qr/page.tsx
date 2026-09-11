"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";

export default function AdminQrPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [url, setUrl] = useState("");

  useEffect(() => {
    const checkinUrl = `${window.location.origin}/checkin`;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 브라우저 URL은 마운트 후에만 알 수 있다
    setUrl(checkinUrl);
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, checkinUrl, { width: 320, margin: 2 });
    }
  }, []);

  return (
    <div className="min-h-screen bg-neutral-50 px-4 py-8">
      <div className="max-w-md mx-auto text-center">
        <div className="flex items-center justify-between mb-6 text-left">
          <h1 className="text-xl font-bold">출퇴근 QR 코드</h1>
          <Link href="/admin" className="text-blue-600 underline text-sm">
            돌아가기
          </Link>
        </div>
        <p className="text-sm text-neutral-500 mb-4">
          이 QR을 인쇄해서 숙소 입구에 붙여두세요. 출근·퇴근 공용이며, 근로자가
          폰으로 스캔하면 자동으로 출근/퇴근이 판별됩니다.
        </p>
        <div className="bg-white rounded-2xl shadow-md p-6 inline-block">
          <canvas ref={canvasRef} />
        </div>
        <p className="text-xs text-neutral-400 mt-4 break-all">{url}</p>
      </div>
    </div>
  );
}
