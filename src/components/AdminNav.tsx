"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

type Tab =
  | "dashboard"
  | "staff"
  | "assignments"
  | "rooms"
  | "records"
  | "settings"
  | "qr";

const TABS: { key: Tab; label: string; href: string }[] = [
  { key: "dashboard", label: "출퇴근 관리", href: "/admin" },
  { key: "staff", label: "직원 관리", href: "/admin/staff" },
  { key: "assignments", label: "객실 배정", href: "/admin/assignments" },
  { key: "rooms", label: "객실 관리", href: "/admin/rooms" },
  { key: "records", label: "청소 기록", href: "/admin/records" },
  { key: "settings", label: "설정", href: "/admin/settings" },
  { key: "qr", label: "QR 코드", href: "/admin/qr" },
];

export default function AdminNav({ active }: { active: Tab }) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div className="flex items-center justify-between px-10 sm:px-14 h-[76px] border-b border-line shrink-0 flex-wrap gap-3 py-3">
      <div className="flex items-baseline gap-2.5">
        <div className="font-display text-[17px] font-bold tracking-[0.1em] text-ink">
          STAY DIMANSION
        </div>
        <div className="text-[11px] tracking-[0.15em] text-muted">
          CREW · ADMIN
        </div>
      </div>
      <div className="flex items-center gap-5 text-[13px] flex-wrap">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={tab.href}
            className={
              tab.key === active
                ? "text-ink font-semibold pb-1 border-b-2 border-accent"
                : "text-muted"
            }
          >
            {tab.label}
          </Link>
        ))}
        <button onClick={handleLogout} className="text-muted ml-2">
          로그아웃
        </button>
      </div>
    </div>
  );
}
