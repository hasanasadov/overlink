"use client";

import { useState } from "react";
import { DAY, EXPIRY_PRESETS, type ExpiryChoice } from "@/lib/config";
import { useApp } from "./Providers";

export type ExpiryValue = { id: ExpiryChoice; seconds: number };
export const DEFAULT_EXPIRY: ExpiryValue = { id: "1d", seconds: DAY };

/** Presets, an optional "no expiry" choice, and a free-form amount of hours or days. No sign-in needed. */
export function ExpiryPicker({
  value, onChange, label, allowNever = false, maxDays = 365,
}: { value: ExpiryValue; onChange: (v: ExpiryValue) => void; label?: string; allowNever?: boolean; maxDays?: number }) {
  const { t } = useApp();
  const [amount, setAmount] = useState("3");
  const [unit, setUnit] = useState<"h" | "d">("d");

  const emitCustom = (a: string, u: "h" | "d") => {
    const n = Math.floor(Number(a));
    const seconds = Number.isFinite(n) && n > 0 ? Math.min(n * (u === "d" ? DAY : 3600), maxDays * DAY) : DAY;
    onChange({ id: "custom", seconds });
  };

  return (
    <div className="field">
      <label>{label ?? t("expiry.label")}</label>
      <div className="seg block" role="radiogroup" style={{ flexWrap: "wrap" }}>
        {EXPIRY_PRESETS.map((p) => (
          <button key={p.id} type="button" role="radio" aria-checked={value.id === p.id} className={value.id === p.id ? "on" : ""} onClick={() => onChange({ id: p.id, seconds: p.seconds })}>
            {t(`expiry.${p.id}` as const)}
          </button>
        ))}
        {allowNever && (
          <button type="button" role="radio" aria-checked={value.id === "never"} className={value.id === "never" ? "on" : ""} onClick={() => onChange({ id: "never", seconds: 0 })}>
            {t("expiry.never")}
          </button>
        )}
        <button type="button" role="radio" aria-checked={value.id === "custom"} className={value.id === "custom" ? "on" : ""} onClick={() => emitCustom(amount, unit)}>
          {t("expiry.custom")}
        </button>
      </div>
      {value.id === "custom" && (
        <div className="row-flex" style={{ gap: 8 }}>
          <input
            className="input"
            type="number"
            inputMode="numeric"
            min={1}
            max={unit === "d" ? maxDays : maxDays * 24}
            value={amount}
            style={{ flex: 1 }}
            aria-label={t("expiry.custom")}
            onChange={(e) => { setAmount(e.target.value); emitCustom(e.target.value, unit); }}
          />
          <select
            className="select"
            value={unit}
            style={{ flex: 1 }}
            onChange={(e) => { const u = e.target.value as "h" | "d"; setUnit(u); emitCustom(amount, u); }}
          >
            <option value="d">{t("expiry.days")}</option>
            <option value="h">{t("expiry.hours")}</option>
          </select>
        </div>
      )}
    </div>
  );
}
