"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "./Icon";
import { useApp } from "./Providers";
import { CopyField } from "./CopyField";
import { ExpiryPicker } from "./ExpiryPicker";
import type { ExpiryId } from "@/lib/config";
import { formatBytes } from "@/lib/i18n";
import { saveOwnerKey } from "@/lib/client-keys";
import { fileIcon } from "@/lib/file-icon";

type Props = { anonMax: number; userMax: number; maxFiles: number };

function putFile(url: string, file: File, headers: Record<string, string>, onProgress: (p: number) => void): Promise<number> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    for (const [k, v] of Object.entries(headers)) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => resolve(xhr.status);
    xhr.onerror = () => resolve(0); // 0 = network / CORS failure
    xhr.send(file);
  });
}

// Vercel functions reject request bodies over ~4.5 MB, so the server-side fallback is for small files only.
const PROXY_MAX = 4_400_000;

export function FilesClient({ anonMax, userMax, maxFiles }: Props) {
  const { t, user, lp } = useApp();
  const [files, setFiles] = useState<File[]>([]);
  const [expiry, setExpiry] = useState<ExpiryId>("1d");
  const [title, setTitle] = useState("");
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number[]>([]);
  const [error, setError] = useState("");
  const [link, setLink] = useState<{ code: string; url: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const max = user ? userMax : anonMax;

  const add = useCallback(
    (list: FileList | File[]) => {
      setError("");
      const next = [...files];
      for (const f of Array.from(list)) {
        if (f.size > max) return setError(t("files.tooBig", { name: f.name, size: formatBytes(max) }));
        if (next.length >= maxFiles) return setError(t("files.tooMany", { count: maxFiles }));
        next.push(f);
      }
      setFiles(next);
    },
    [files, max, maxFiles, t],
  );

  const submit = async () => {
    if (!files.length || busy) return;
    setBusy(true);
    setError("");
    setProgress(files.map(() => 0));
    try {
      const init = await fetch("/api/files/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: files.map((f) => ({ name: f.name, size: f.size, type: f.type })), expiresIn: expiry, title }),
      });
      const data = await init.json();
      if (!init.ok) throw new Error(data.error || "init");
      saveOwnerKey("f", data.code, data.ownerKey);
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const type = f.type || "application/octet-stream";
        const onProgress = (p: number) => setProgress((arr) => arr.map((v, idx) => (idx === i ? p : v)));

        // Direct to Cloudflare R2 (needs the bucket CORS policy); small files can fall back to the API.
        let status = await putFile(data.files[i].uploadUrl, f, { "Content-Type": type }, onProgress);
        if (status === 0 && f.size <= PROXY_MAX) {
          status = await putFile(`/api/files/upload/${data.code}/${data.files[i].id}`, f, { "Content-Type": type, ...(data.ownerKey ? { "x-owner-key": data.ownerKey } : {}) }, onProgress);
        }
        if (status === 0 && f.size > PROXY_MAX) throw new Error("cors");
        if (status < 200 || status >= 300) throw new Error(`upload ${status}`);
        onProgress(1);
      }

      const done = await fetch("/api/files/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(data.ownerKey ? { "x-owner-key": data.ownerKey } : {}) },
        body: JSON.stringify({ code: data.code }),
      });
      if (!done.ok) throw new Error("complete");
      setLink({ code: data.code, url: `${window.location.origin}/f/${data.code}` });
    } catch (e) {
      setError(e instanceof Error && e.message === "cors" ? t("files.corsHint") : t("files.uploadFailed"));
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setFiles([]);
    setLink(null);
    setProgress([]);
    setTitle("");
    setError("");
  };

  if (link) {
    return (
      <div className="stack" style={{ gap: 20 }}>
        <div className="stack" style={{ gap: 10 }}>
          <span className="tile-icon lg bg-green"><Icon name="check" size={30} strokeWidth={2} /></span>
          <h2 className="title2">{t("files.done.title")}</h2>
          <p className="muted">{t("files.done.sub")}</p>
        </div>
        <CopyField value={link.url} display={link.url.replace(/^https?:\/\//, "")} />
        <div className="row-flex">
          <Link href={lp(`/f/${link.code}`)} className="btn gray block">{t("files.openLink")}</Link>
          <button className="btn tinted block" onClick={reset}>{t("files.another")}</button>
        </div>
        <p className="footnote muted">{t("view.autoDelete")}</p>
      </div>
    );
  }

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div
        className={`drop ${over ? "over" : ""}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); if (!busy) add(e.dataTransfer.files); }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
      >
        <span className="tile-icon lg bg-blue"><Icon name="upload" size={28} /></span>
        <div className="headline">{t("files.drop")}</div>
        <div className="subhead muted">{t("common.or")} <span style={{ color: "var(--blue)" }}>{t("files.browse").toLowerCase()}</span></div>
        <div className="footnote muted">{t("files.limit", { size: formatBytes(max), count: maxFiles })}</div>
        <input ref={inputRef} type="file" multiple hidden onChange={(e) => { if (e.target.files) add(e.target.files); e.target.value = ""; }} />
      </div>

      {files.length > 0 && (
        <div className="group">
          {files.map((f, i) => {
            const fi = fileIcon(f.type, f.name);
            return (
              <div key={`${f.name}-${i}`} className="item has-icon">
                <span className={`tile-icon ${fi.color}`}><Icon name={fi.icon} size={20} /></span>
                <div className="grow">
                  <div className="ellipsis headline" style={{ fontSize: 16 }}>{f.name}</div>
                  <div className="footnote muted">{formatBytes(f.size)}</div>
                  {busy && <div className="progress" style={{ marginTop: 6 }}><i style={{ width: `${(progress[i] ?? 0) * 100}%` }} /></div>}
                </div>
                {!busy && (
                  <button className="icon-btn" aria-label={t("files.remove")} onClick={() => setFiles(files.filter((_, idx) => idx !== i))}>
                    <Icon name="xmarkCircle" size={22} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="stack">
        <ExpiryPicker value={expiry} onChange={setExpiry} />
        <div className="field">
          <label>{t("files.titleField")}</label>
          <input className="input" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} />
        </div>
        {error && <div className="form-error" role="alert">{error}</div>}
        <button className="btn primary lg block" disabled={!files.length || busy} onClick={submit}>
          <Icon name={busy ? "clock" : "link"} size={20} />
          {busy ? t("files.uploading") : t("files.share")}
        </button>
        {!user && <p className="footnote muted center">{t("files.signInHint")}</p>}
      </div>
    </div>
  );
}
