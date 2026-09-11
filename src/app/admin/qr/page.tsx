"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import AdminNav from "@/components/AdminNav";

export default function AdminQrPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [url, setUrl] = useState("");

  useEffect(() => {
    const checkinUrl = `${window.location.origin}/checkin`;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 브라우저 URL은 마운트 후에만 알 수 있다
    setUrl(checkinUrl);
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, checkinUrl, {
        width: 280,
        margin: 2,
        color: { dark: "#2b241d", light: "#fffdf9" },
      });
    }
  }, []);

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <AdminNav active="qr" />
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4 py-10 text-center">
        <div>
          <h1 className="text-[22px] font-bold">출퇴근 QR 코드</h1>
          <div className="w-7 h-0.5 bg-accent mt-2.5 mx-auto" />
        </div>
        <p className="text-[13.5px] text-muted max-w-sm leading-relaxed">
          이 QR을 인쇄해서 숙소 입구에 붙여두세요. 출근·퇴근 공용이며, 스캔하면
          자동으로 출근/퇴근이 판별됩니다.
        </p>
        <div className="bg-card border border-line rounded-[20px] p-9 inline-block">
          <canvas ref={canvasRef} />
        </div>
        <p className="text-xs text-muted">{url}</p>
      </div>
    </div>
  );
}
