"use client";

import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";

type Props = {
  expectedToken: string;
  onScanned: () => void;
};

export default function QrScanner({ expectedToken, onScanned }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState("");
  const [mismatchNotice, setMismatchNotice] = useState(false);

  const onScannedRef = useRef(onScanned);
  const tokenRef = useRef(expectedToken);

  useEffect(() => {
    onScannedRef.current = onScanned;
  }, [onScanned]);

  useEffect(() => {
    tokenRef.current = expectedToken;
  }, [expectedToken]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let rafId: number;
    let stopped = false;

    function tick() {
      if (stopped) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code) {
            if (code.data === tokenRef.current) {
              stopped = true;
              onScannedRef.current();
              return;
            } else {
              setMismatchNotice(true);
            }
          }
        }
      }
      rafId = requestAnimationFrame(tick);
    }

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        tick();
      } catch {
        setError("카메라를 사용할 수 없습니다. 카메라 권한을 허용해주세요.");
      }
    }

    start();

    return () => {
      stopped = true;
      cancelAnimationFrame(rafId);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div className="w-full flex flex-col items-center gap-4">
      <div className="relative w-full aspect-square max-w-[280px] rounded-2xl overflow-hidden bg-black">
        <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
      </div>
      <canvas ref={canvasRef} className="hidden" />
      <p className="text-[13px] text-muted text-center">
        숙소 입구의 QR 코드를 카메라에 비춰주세요
      </p>
      {mismatchNotice && !error && (
        <p className="text-brick text-xs text-center">
          이 숙소의 QR이 아닙니다. 다시 확인해주세요.
        </p>
      )}
      {error && <p className="text-brick text-xs text-center">{error}</p>}
    </div>
  );
}
