"use client";

import { useState } from "react";

type Section = { title: string; items: string[] };
type RoomManual = {
  key: string;
  label: string;
  sub: string;
  intro: string;
  sections: Section[];
};

const ROOM_TASK_ITEMS = [
  "쓰레기를 수거해주시고 새로운 비닐로 갈아주세요.",
  "드라이기 및 비품을 제자리에 놔주세요.",
  "이불은 뒤집어서, 나머지 매트리스/베개 커버는 그대로 벗겨주세요.",
  "이불과 수건은 항상 분리해서 수거망에 넣어주세요.",
  "청소기와 물걸레질로 바닥을 깨끗이 해주세요.",
  "매트리스, 이불, 베개 순으로 씌워줍니다.",
];

const BATHROOM_TASK_ITEMS = [
  "쓰레기를 수거해주시고, 새로운 비닐로 갈아주세요.",
  "물청소를 전체적으로 해주세요.",
  "물기가 마르기 전, 거울을 세정제와 극세사천으로 닦아주세요.",
  "배수구에 머리카락을 꼭 제거해주시고 솔로 닦아주세요.",
  "변기와 바닥에 락스를 뿌리고 물때가 없게 솔로 꼼꼼이 닦아주세요.",
  "물로 청소 해주시고 스크래퍼로 물기를 제거해줍니다.",
  "변기와 세면대 바닥에 잔여 물기를 발매트나 수건으로 닦아주세요.",
];

const MANUALS: RoomManual[] = [
  {
    key: "private",
    label: "프라이빗",
    sub: "2층",
    intro: "입실 시 노크 필수, 머리카락, 변기 청결, 비품 체크. 청소 후 문 닫혔나 꼭 체크.",
    sections: [
      {
        title: "객실",
        items: [
          ...ROOM_TASK_ITEMS,
          "물 2개를 냉장고에 넣어주세요.",
          "모든 객실 내 비품과 가구에 먼지가 있지 않도록 물티슈로 닦아주세요.",
          "디퓨저를 뿌리면서 놓친 부분은 없는지 체크해주세요.",
        ],
      },
      {
        title: "욕실",
        items: [
          ...BATHROOM_TASK_ITEMS,
          "입구에 슬리퍼를 가지런히 놓고 수건(4), 발매트(1), 휴지를 비치해주세요.",
          "디퓨저로 휴지와 수건에 뿌려주세요.",
        ],
      },
    ],
  },
  {
    key: "standard",
    label: "스탠다드",
    sub: "3층",
    intro: "입실 시 노크 필수, 머리카락, 변기 청결, 비품 체크. 청소 후 문 닫혔나 꼭 체크.",
    sections: [
      {
        title: "객실",
        items: [
          ...ROOM_TASK_ITEMS,
          "물 2개를 냉장고에 넣어주세요.",
          "가구 윗 서랍에 비품을 넣고 객실 전체 먼지가 있지 않도록 물티슈로 닦아주세요.",
          "디퓨저를 뿌리면서 놓친 부분은 없는지 체크해주세요.",
        ],
      },
      {
        title: "욕실",
        items: [
          ...BATHROOM_TASK_ITEMS,
          "입구에 슬리퍼를 가지런히 놓고 수건(4), 발매트(1), 휴지를 비치해주세요.",
          "디퓨저로 휴지와 수건에 뿌려주세요.",
        ],
      },
    ],
  },
  {
    key: "relax",
    label: "릴렉스",
    sub: "303호",
    intro: "입실 시 노크 필수, 머리카락, 변기 청결, 비품 체크. 청소 후 문 닫혔나 꼭 체크.",
    sections: [
      {
        title: "객실",
        items: [
          ...ROOM_TASK_ITEMS,
          "물 2개를 냉장고에 넣어주세요.",
          "가구 윗 서랍에 비품을 넣고 객실 전체 먼지가 있지 않도록 물티슈로 닦아주세요.",
          "디퓨저를 뿌리면서 놓친 부분은 없는지 체크해주세요.",
        ],
      },
      {
        title: "욕실",
        items: [
          ...BATHROOM_TASK_ITEMS,
          "입구에 슬리퍼를 가지런히 놓고 수건(4), 발매트(1), 휴지를 비치해주세요.",
          "디퓨저로 휴지와 수건에 뿌려주세요.",
        ],
      },
    ],
  },
  {
    key: "dormitory",
    label: "도미토리",
    sub: "4층",
    intro: "입실 시 노크 필수, 머리카락, 변기 청결, 비품 체크. 청소 후 문 닫혔나 꼭 체크.",
    sections: [
      {
        title: "객실",
        items: [
          ...ROOM_TASK_ITEMS,
          "어매니티와 비품 체크해주세요. 수건 2개, 물 1개, 칫솔 세트 1개를 바구니에 넣어주세요.",
          "모든 객실 내 비품과 가구에 먼지가 있지 않도록 물티슈로 닦아주세요.",
          "디퓨저를 뿌리면서 놓친 부분은 없는지 체크해주세요.",
        ],
      },
      {
        title: "욕실",
        items: [
          ...BATHROOM_TASK_ITEMS,
          "수전을 시선 높이로 해주고 분사구가 벽쪽을 보게 해주세요.",
          "입구에 슬리퍼를 가지런히 놓고 발매트(1), 휴지를 비치해주세요.",
          "디퓨저로 휴지와 수건에 뿌려주세요.",
        ],
      },
    ],
  },
];

function ManualIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M5 4.5c0-.55.45-1 1-1h9.5L19 7v12.5c0 .55-.45 1-1 1H6c-.55 0-1-.45-1-1V4.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M14.5 3.5V7H19" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M8 12h8M8 15.5h8M8 8.5h3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export default function RoomManualFab() {
  const [open, setOpen] = useState(false);
  const [activeManual, setActiveManual] = useState<RoomManual | null>(null);

  return (
    <>
      <div className="fixed right-5 bottom-24 z-40 flex flex-col items-end gap-3">
        {MANUALS.map((m, i) => (
          <button
            key={m.key}
            onClick={() => {
              setActiveManual(m);
              setOpen(false);
            }}
            className="bg-card border border-line rounded-full pl-4 pr-4 py-2.5 text-[13px] font-semibold shadow-md transition-all duration-300 ease-out"
            style={{
              transitionDelay: open ? `${i * 70}ms` : "0ms",
              opacity: open ? 1 : 0,
              transform: open ? "translateY(0) scale(1)" : "translateY(10px) scale(0.92)",
              pointerEvents: open ? "auto" : "none",
            }}
          >
            {m.label} <span className="text-muted font-normal">{m.sub}</span>
          </button>
        ))}

        <button
          onClick={() => setOpen((v) => !v)}
          aria-label="청소 매뉴얼"
          className="w-14 h-14 rounded-full bg-accent text-bg shadow-lg flex items-center justify-center transition-transform duration-300"
          style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)" }}
        >
          <ManualIcon />
        </button>
      </div>

      {activeManual && (
        <div
          onClick={() => setActiveManual(null)}
          className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-card rounded-2xl w-full max-w-sm max-h-[80dvh] overflow-y-auto p-6 flex flex-col gap-4"
          >
            <div>
              <div className="text-[16px] font-bold">
                {activeManual.label} <span className="text-muted font-normal">{activeManual.sub}</span>
              </div>
              <div className="text-[12.5px] text-muted mt-1.5 leading-relaxed">
                {activeManual.intro}
              </div>
            </div>

            {activeManual.sections.map((s) => (
              <div key={s.title}>
                <div className="text-[11px] tracking-[0.1em] text-accent uppercase font-semibold mb-2">
                  {s.title}
                </div>
                <ul className="flex flex-col gap-1.5">
                  {s.items.map((item, idx) => (
                    <li key={idx} className="text-[13px] leading-relaxed pl-3 relative">
                      <span className="absolute left-0 text-muted">·</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            <button
              onClick={() => setActiveManual(null)}
              className="text-muted text-[12px] text-center mt-1"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </>
  );
}
