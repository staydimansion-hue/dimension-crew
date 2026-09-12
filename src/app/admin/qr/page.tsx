"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import AdminNav from "@/components/AdminNav";

export default function AdminQrPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [token, setToken] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.settings?.qr_token) {
          setToken(data.settings.qr_token);
        } else {
          setError("QR 토큰을 불러오지 못했습니다.");
        }
      });
  }, []);

  useEffect(() => {
    if (token && canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, token, {
        width: 280,
        margin: 2,
        color: { dark: "#2b241d", light: "#fffdf9" },
      });
    }
  }, [token]);

  return (
    <div className="min-h-dvh bg-bg flex flex-col">
      <AdminNav active="qr" />
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4 py-10 text-center">
        <div>
          <h1 className="text-[22px] font-bold">출퇴근 QR 코드</h1>
          <div className="w-7 h-0.5 bg-accent mt-2.5 mx-auto" />
        </div>
        <p className="text-[13.5px] text-muted max-w-sm leading-relaxed">
          이 QR을 인쇄해서 숙소 입구에 붙여두세요. 링크가 아니라서 휴대폰 기본
          카메라로 찍어도 아무 일도 안 일어나고, 앱 안의 &ldquo;QR 스캔하기&rdquo; 버튼으로
          비춰야만 출근·퇴근이 처리됩니다.
        </p>
        <div className="bg-card border border-line rounded-[20px] p-9 inline-block">
          <canvas ref={canvasRef} />
        </div>
        {error && <p className="text-brick text-xs">{error}</p>}
      </div>
    </div>
  );
}
