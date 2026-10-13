"use client";

import { EXPIRY_PRESETS, type ExpiryId } from "@/lib/config";
import { useApp } from "./Providers";
import Link from "next/link";

export function ExpiryPicker({ value, onChange, label }: { value: ExpiryId; onChange: (v: ExpiryId) => void; label?: string }) {
  const { t, user, lp } = useApp();
  const allowed = (id: string) => user || !["30d"].includes(id);
  return (
    <div className="field">
      <label>{label ?? t("expiry.label")}</label>
      <div className="seg block" role="radiogroup" style={{ flexWrap: "wrap" }}>
        {EXPIRY_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={value === p.id}
            className={value === p.id ? "on" : ""}
            disabled={!allowed(p.id)}
            style={!allowed(p.id) ? { opacity: 0.35, cursor: "not-allowed" } : undefined}
            onClick={() => allowed(p.id) && onChange(p.id)}
          >
            {t(`expiry.${p.id}` as const)}
          </button>
        ))}
      </div>
      {!user && (
        <span className="footnote muted" style={{ paddingLeft: 4 }}>
          <Link href={lp("/login")}>{t("nav.signIn")}</Link> — {t("expiry.signInForMore")}
        </span>
      )}
    </div>
  );
}
