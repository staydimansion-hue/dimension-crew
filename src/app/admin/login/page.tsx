"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-md p-6">
        <h1 className="text-xl font-bold text-center mb-6">관리자 로그인</h1>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            placeholder="관리자 아이디"
            className="w-full border border-neutral-300 rounded-lg px-4 py-3 text-base"
            value={loginId}
            onChange={(e) => setLoginId(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="비밀번호"
            className="w-full border border-neutral-300 rounded-lg px-4 py-3 text-base"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-neutral-900 text-white rounded-lg py-3 font-semibold disabled:opacity-50"
          >
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>
      </div>
    </div>
  );
}
