import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold">dimension-crew 출퇴근</h1>
        <div className="flex flex-col gap-3 w-64 mx-auto">
          <Link
            href="/checkin"
            className="bg-neutral-900 text-white rounded-lg py-3 font-semibold"
          >
            출근 / 퇴근 체크
          </Link>
          <Link
            href="/calendar"
            className="border border-neutral-300 rounded-lg py-3 font-semibold"
          >
            내 근무 캘린더
          </Link>
          <Link
            href="/admin/login"
            className="border border-neutral-300 rounded-lg py-3 font-semibold"
          >
            관리자
          </Link>
        </div>
      </div>
    </div>
  );
}
