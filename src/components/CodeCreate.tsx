"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "./Icon";
import { useApp } from "./Providers";
import { DEFAULT_EXPIRY, ExpiryPicker, type ExpiryValue } from "./ExpiryPicker";
import { CODE_LANGUAGES, LANGUAGE_LABELS } from "@/lib/config";
import { saveOwnerKey } from "@/lib/client-keys";

export function CodeCreate() {
  const { t, lp } = useApp();
  const router = useRouter();
  const [language, setLanguage] = useState("javascript");
  const [title, setTitle] = useState("");
  const [expiry, setExpiry] = useState<ExpiryValue>(DEFAULT_EXPIRY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const create = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language, title, expiresIn: expiry }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error();
      saveOwnerKey("c", data.code, data.ownerKey);
      router.push(lp(`/c/${data.code}`));
    } catch {
      setError(t("common.error"));
      setBusy(false);
    }
  };

  return (
    <div className="stack">
      <div className="field">
        <label>{t("code.language")}</label>
        <select className="select" value={language} onChange={(e) => setLanguage(e.target.value)}>
          {CODE_LANGUAGES.map((l) => (
            <option key={l} value={l}>{LANGUAGE_LABELS[l]}</option>
          ))}
        </select>
      </div>
      <div className="field">
        <label>{t("code.titleField")}</label>
        <input className="input" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <ExpiryPicker value={expiry} onChange={setExpiry}  />
      {error && <div className="form-error">{error}</div>}
      <button className="btn primary lg block" disabled={busy} onClick={create}>
        <Icon name="code" size={20} /> {t("code.create")}
      </button>
    </div>
  );
}
