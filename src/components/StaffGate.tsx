"use client";

import { useEffect, useState, type ReactNode } from "react";
import BrandKicker from "./BrandKicker";
import PasswordField from "./PasswordField";

type Props = {
  children: (name: string) => ReactNode;
  /** 로그인 폼과 children을 감싸는 카드의 너비 클래스 (기본: 좁은 폼용) */
  cardClassName?: string;
};

export default function StaffGate({
  children,
  cardClassName = "w-full max-w-sm",
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-bg px-6 py-10">
      <BrandKicker />
      <div className={cardClassName}>
        {phase === "checking" && (
          <p className="text-muted text-sm text-center">확인 중...</p>
        )}

        {phase === "login" && (
          <div className="bg-card border border-line rounded-2xl px-7 py-8 flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <h1 className="text-[21px] font-bold">최초 로그인</h1>
              <p className="text-[13px] text-muted leading-relaxed">
                전화번호와 PIN을 입력해주세요.
                <br />이 폰에서는 다음부터 자동으로 로그인이 유지돼요.
              </p>
              <div className="w-7 h-0.5 bg-accent mt-1" />
            </div>
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <label className="flex flex-col gap-2">
                <span className="text-[11px] tracking-[0.15em] text-muted uppercase">
                  전화번호
                </span>
                <input
                  type="tel"
                  inputMode="numeric"
                  placeholder="010 0000 0000"
                  className="border-0 border-b border-line bg-transparent text-base py-1.5 outline-none focus:border-accent"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </label>
              <PasswordField
                label="PIN 4자리"
                value={pin}
                onChange={setPin}
                inputMode="numeric"
                placeholder="••••"
                maxLength={4}
                wideSpacing
                required
              />
              {error && <p className="text-sm text-brick">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="bg-accent text-bg rounded-[10px] py-3.5 font-semibold text-[15px] mt-1 disabled:opacity-50"
              >
                {loading ? "확인 중..." : "로그인"}
              </button>
            </form>
          </div>
        )}

        {phase === "ready" && children(name)}
      </div>
      {phase === "login" && (
        <p className="mt-7 text-xs text-muted text-center leading-relaxed">
          비밀번호를 잊으셨다면
          <br />
          매니저에게 초기화를 요청하세요
        </p>
      )}
    </div>
  );
}
