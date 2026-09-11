import Link from "next/link";
import BrandKicker from "@/components/BrandKicker";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-bg px-4">
      <BrandKicker />
      <div className="flex flex-col gap-3 w-64">
        <Link
          href="/checkin"
          className="bg-accent text-bg rounded-[10px] py-3.5 font-semibold text-center text-[15px]"
        >
          출근 / 퇴근 체크
        </Link>
        <Link
          href="/rooms"
          className="border border-line rounded-[10px] py-3.5 font-semibold text-center text-[15px] bg-card"
        >
          오늘의 청소 목록
        </Link>
        <Link
          href="/calendar"
          className="border border-line rounded-[10px] py-3.5 font-semibold text-center text-[15px] bg-card"
        >
          내 근무 캘린더
        </Link>
        <Link
          href="/admin/login"
          className="text-muted text-center text-sm mt-2"
        >
          관리자
        </Link>
      </div>
    </div>
  );
}
