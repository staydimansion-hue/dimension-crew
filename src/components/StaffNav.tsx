"use client";

import Link from "next/link";

type Tab = "home" | "rooms" | "calendar";

const TABS: { key: Tab; label: string; href: string }[] = [
  { key: "home", label: "홈", href: "/checkin" },
  { key: "rooms", label: "청소", href: "/rooms" },
  { key: "calendar", label: "캘린더", href: "/calendar" },
];

export default function StaffNav({ active }: { active: Tab }) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-card border-t border-line flex z-40"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {TABS.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          className={`flex-1 text-center py-3 text-[13px] font-semibold ${
            tab.key === active ? "text-accent" : "text-muted"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
