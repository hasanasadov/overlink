"use client";

import { useState } from "react";
import { Icon } from "./Icon";
import { useApp } from "./Providers";

export function useCopy() {
  const { t, toast } = useApp();
  return async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    toast(t("common.copied"));
  };
}

export function CopyField({ value, display }: { value: string; display?: string }) {
  const { t } = useApp();
  const copy = useCopy();
  const [done, setDone] = useState(false);
  return (
    <div className="linkbox">
      <span className="url" dir="ltr">{display ?? value}</span>
      <button
        className="btn primary sm"
        onClick={async () => {
          await copy(value);
          setDone(true);
          setTimeout(() => setDone(false), 1800);
        }}
      >
        <Icon name={done ? "check" : "copy"} size={15} strokeWidth={2.2} />
        {done ? t("common.copied") : t("common.copy")}
      </button>
    </div>
  );
}
