"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

type Settings = {
  geo_center_lat: number | null;
  geo_center_lng: number | null;
  geo_radius_m: number;
  deduction_rate: number;
  min_wage_krw: number | null;
};

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [radius, setRadius] = useState("");
  const [deductionRate, setDeductionRate] = useState("");
  const [minWage, setMinWage] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/settings");
    const data = await res.json();
    if (res.ok) {
      setSettings(data.settings);
      setLat(data.settings.geo_center_lat != null ? String(data.settings.geo_center_lat) : "");
      setLng(data.settings.geo_center_lng != null ? String(data.settings.geo_center_lng) : "");
      setRadius(String(data.settings.geo_radius_m));
      setDeductionRate(String(data.settings.deduction_rate));
      setMinWage(data.settings.min_wage_krw != null ? String(data.settings.min_wage_krw) : "");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 최초 마운트 시 설정을 불러온다
    load();
  }, [load]);

  function useCurrentLocation() {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(String(pos.coords.latitude));
        setLng(String(pos.coords.longitude));
      },
      () => setError("현재 위치를 가져오지 못했습니다. 위치 권한을 확인해주세요.")
    );
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        geoCenterLat: lat ? Number(lat) : null,
        geoCenterLng: lng ? Number(lng) : null,
        geoRadiusM: Number(radius),
        deductionRate: Number(deductionRate),
        minWageKrw: minWage ? Number(minWage) : null,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "저장에 실패했습니다.");
      return;
    }
    setNotice("저장되었습니다.");
    load();
  }

  if (!settings) {
    return <div className="min-h-screen bg-neutral-50 px-4 py-8" />;
  }

  return (
    <div className="min-h-screen bg-neutral-50 px-4 py-8">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold">설정</h1>
          <Link href="/admin" className="text-blue-600 underline text-sm">
            돌아가기
          </Link>
        </div>

        <form onSubmit={handleSave} className="bg-white rounded-2xl shadow-md p-5 space-y-4">
          <div>
            <p className="text-sm font-semibold mb-2">근무지 GPS 중심 좌표</p>
            <div className="flex gap-2">
              <input
                placeholder="위도"
                className="flex-1 border border-neutral-300 rounded-lg px-3 py-2"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
              />
              <input
                placeholder="경도"
                className="flex-1 border border-neutral-300 rounded-lg px-3 py-2"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
              />
            </div>
            <button
              type="button"
              onClick={useCurrentLocation}
              className="text-xs text-blue-600 underline mt-2"
            >
              지금 이 위치(숙소)를 좌표로 사용
            </button>
          </div>

          <label className="block text-sm">
            허용 반경(m)
            <input
              type="number"
              className="block w-full border border-neutral-300 rounded-lg px-3 py-2 mt-1"
              value={radius}
              onChange={(e) => setRadius(e.target.value)}
              required
            />
          </label>

          <label className="block text-sm">
            공제율 (예: 0.033 = 3.3%)
            <input
              type="number"
              step="0.001"
              className="block w-full border border-neutral-300 rounded-lg px-3 py-2 mt-1"
              value={deductionRate}
              onChange={(e) => setDeductionRate(e.target.value)}
              required
            />
          </label>

          <label className="block text-sm">
            최저시급 (경고 기준, 비워두면 경고 안 함)
            <input
              type="number"
              className="block w-full border border-neutral-300 rounded-lg px-3 py-2 mt-1"
              value={minWage}
              onChange={(e) => setMinWage(e.target.value)}
            />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {notice && <p className="text-sm text-green-700">{notice}</p>}

          <button className="w-full bg-neutral-900 text-white rounded-lg py-3 font-semibold">
            저장
          </button>
        </form>
      </div>
    </div>
  );
}
