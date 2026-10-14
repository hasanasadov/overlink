"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "./Icon";
import { useApp } from "./Providers";
import { DEFAULT_EXPIRY, ExpiryPicker, type ExpiryValue } from "./ExpiryPicker";
import { saveOwnerKey } from "@/lib/client-keys";

export function ScreenCreate() {
  const { t, lp } = useApp();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [password, setPassword] = useState("");
  const [expiry, setExpiry] = useState<ExpiryValue>(DEFAULT_EXPIRY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const create = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, password, expiresIn: expiry }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error();
      saveOwnerKey("s", data.code, data.ownerKey);
      router.push(lp(`/s/${data.code}`));
    } catch {
      setError(t("common.error"));
      setBusy(false);
    }
  };

  return (
    <div className="stack">
      <div className="field">
        <label>{t("screen.roomTitle")}</label>
        <input className="input" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="field">
        <label>{t("screen.password")}</label>
        <input className="input" type="text" autoComplete="off" value={password} maxLength={100} onChange={(e) => setPassword(e.target.value)} />
        <span className="footnote muted" style={{ paddingLeft: 4 }}>{t("screen.passwordHint")}</span>
      </div>
      <ExpiryPicker value={expiry} onChange={setExpiry} label={t("screen.duration")} />
      {error && <div className="form-error">{error}</div>}
      <button className="btn primary lg block" disabled={busy} onClick={create}>
        <Icon name="screenShare" size={20} /> {t("screen.create")}
      </button>
    </div>
  );
}
