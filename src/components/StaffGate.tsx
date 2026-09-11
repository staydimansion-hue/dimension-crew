"use client";

import { useEffect, useState, type ReactNode } from "react";

type Props = {
  children: (name: string) => ReactNode;
  /** 로그인 폼과 children을 감싸는 카드의 너비 클래스 (기본: 좁은 폼용) */
  cardClassName?: string;
};

export default function StaffGate({
  children,
  cardClassName = "w-full max-w-sm bg-white rounded-2xl shadow-md p-6",
}: Props) {
  const [phase, setPhase] = useState<"checking" | "login" | "ready">("checking");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/staff/me")
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          setName(data.name);
          setPhase("ready");
        } else {
          setPhase("login");
        }
      })
      .catch(() => setPhase("login"));
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/staff/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "로그인에 실패했습니다.");
        return;
      }
      setName(data.name);
      setPhase("ready");
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <div className={cardClassName}>
        {phase === "checking" && (
          <p className="text-neutral-400 text-sm text-center">확인 중...</p>
        )}

        {phase === "login" && (
          <>
            <h1 className="text-xl font-bold text-center mb-1">최초 로그인</h1>
            <p className="text-sm text-neutral-500 text-center mb-6">
              전화번호와 PIN을 입력해주세요 (이 폰에서는 다음부터 자동으로 유지됩니다)
            </p>
            <form onSubmit={handleLogin} className="space-y-3">
              <input
                type="tel"
                inputMode="numeric"
                placeholder="전화번호 (- 없이)"
                className="w-full border border-neutral-300 rounded-lg px-4 py-3 text-base"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
              <input
                type="password"
                inputMode="numeric"
                placeholder="PIN 4자리"
                maxLength={4}
                className="w-full border border-neutral-300 rounded-lg px-4 py-3 text-base"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                required
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-neutral-900 text-white rounded-lg py-3 font-semibold disabled:opacity-50"
              >
                {loading ? "확인 중..." : "로그인"}
              </button>
            </form>
          </>
        )}

        {phase === "ready" && children(name)}
      </div>
    </div>
  );
}
