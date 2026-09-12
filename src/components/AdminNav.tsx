"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

type Tab =
  | "dashboard"
  | "payroll"
  | "staff"
  | "assignments"
  | "rooms"
  | "records"
  | "settings"
  | "qr";

const TABS: { key: Tab; label: string; href: string }[] = [
  { key: "dashboard", label: "출퇴근 관리", href: "/admin" },
  { key: "payroll", label: "인건비", href: "/admin/payroll" },
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
    <div className="border-b border-line shrink-0">
      <div className="flex items-center justify-between px-5 sm:px-14 h-14 sm:h-[76px]">
        <div className="flex items-baseline gap-2.5 min-w-0 overflow-hidden">
          <div className="font-display text-[15px] sm:text-[17px] font-bold tracking-[0.1em] text-ink whitespace-nowrap">
            STAY DIMANSION
          </div>
          <div className="text-[10px] sm:text-[11px] tracking-[0.15em] text-muted whitespace-nowrap">
            CREW · ADMIN
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="text-muted text-[12px] sm:text-[13px] shrink-0 ml-3"
        >
          로그아웃
        </button>
      </div>
      <div className="flex items-center gap-5 text-[13px] px-5 sm:px-14 pb-3 overflow-x-auto whitespace-nowrap [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={tab.href}
            className={`shrink-0 pb-1 ${
              tab.key === active
                ? "text-ink font-semibold border-b-2 border-accent"
                : "text-muted"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
