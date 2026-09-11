"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import BrandKicker from "@/components/BrandKicker";

export default function AdminLoginPage() {
  const router = useRouter();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loginId, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "로그인에 실패했습니다.");
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-bg px-4">
      <BrandKicker />
      <div className="w-full max-w-sm bg-card border border-line rounded-2xl px-7 py-8">
        <h1 className="text-[21px] font-bold text-center mb-6">관리자 로그인</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-2">
            <span className="text-[11px] tracking-[0.15em] text-muted uppercase">
              관리자 아이디
            </span>
            <input
              type="text"
              className="border-0 border-b border-line bg-transparent text-base py-1.5 outline-none focus:border-accent"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              required
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-[11px] tracking-[0.15em] text-muted uppercase">
              비밀번호
            </span>
            <input
              type="password"
              className="border-0 border-b border-line bg-transparent text-base py-1.5 outline-none focus:border-accent"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          {error && <p className="text-sm text-brick">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="bg-accent text-bg rounded-[10px] py-3.5 font-semibold text-[15px] mt-1 disabled:opacity-50"
          >
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>
      </div>
    </div>
  );
}
