"use client";

import { useState, type InputHTMLAttributes } from "react";

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M3 3l18 18M10.6 5.2C11.05 5.07 11.52 5 12 5c7 0 10.5 7 10.5 7-.68 1.36-1.65 2.87-2.96 4.14M6.7 6.7C4.3 8.2 2.6 10.6 1.5 12c0 0 3.5 7 10.5 7 1.7 0 3.2-.42 4.5-1.1M9.9 9.9a3 3 0 0 0 4.2 4.2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** 마스킹된 자리(●●●●)를 더 넓게 벌려 보여줄지 (PIN 입력용) */
  wideSpacing?: boolean;
} & Pick<
  InputHTMLAttributes<HTMLInputElement>,
  "placeholder" | "inputMode" | "maxLength" | "autoComplete" | "required"
>;

export default function PasswordField({
  label,
  value,
  onChange,
  wideSpacing,
  ...inputProps
}: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <label className="flex flex-col gap-2">
      <span className="text-[11px] tracking-[0.15em] text-muted uppercase">{label}</span>
      <div className="flex items-center gap-2 border-b border-line focus-within:border-accent">
        <input
          {...inputProps}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`flex-1 min-w-0 border-0 bg-transparent text-base py-1.5 outline-none ${
            wideSpacing && !visible ? "tracking-[0.5em]" : ""
          }`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="text-muted shrink-0 pb-1.5"
          aria-label={visible ? "비밀번호 숨기기" : "비밀번호 보이기"}
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
    </label>
  );
}
