"use client";

import { useEffect, useState } from "react";
import { Icon } from "./Icon";
import { useApp } from "./Providers";
import { useRemaining } from "./Countdown";
import { CopyField } from "./CopyField";
import { formatBytes, formatRemaining } from "@/lib/i18n";
import { fileIcon } from "@/lib/file-icon";

type F = { id: string; name: string; size: number; mime: string };

export function FileShareView(props: {
  code: string;
  title: string | null;
  expiresAt: string;
  downloads: number;
  ownerSignedIn: boolean;
  anonOwned: boolean;
  files: F[];
}) {
  const { t } = useApp();
  const [url, setUrl] = useState(`/f/${props.code}`);
  const remaining = useRemaining(props.expiresAt);

  useEffect(() => {
    setUrl(`${window.location.origin}/f/${props.code}`);
  }, [props.code]);

  const total = props.files.reduce((n, f) => n + f.size, 0);

  const downloadAll = () => {
    props.files.forEach((f, i) =>
      setTimeout(() => {
        const a = document.createElement("a");
        a.href = `/f/${props.code}/d/${f.id}`;
        a.download = f.name;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }, i * 400),
    );
  };

  return (
    <div className="container split">
      <div className="split-head">
        <span className="eyebrow">{t("nav.files")}</span>
        <h1 className="large-title" style={{ wordBreak: "break-word" }}>{props.title || t("view.sharedFiles")}</h1>
        <div className="row-flex" style={{ flexWrap: "wrap", gap: 8 }}>
          <span className="pill">{t("view.filesCount", { n: props.files.length })} · {formatBytes(total)}</span>
          <span className="pill orange"><Icon name="clock" size={13} strokeWidth={2} /> {remaining <= 0 ? t("account.expired") : t("view.expiresIn", { time: formatRemaining(remaining, t) })}</span>
          <span className="pill">{t("view.downloadsCount", { n: props.downloads })}</span>
        </div>
        <CopyField value={url} display={url.replace(/^https?:\/\//, "")} />
        <p className="footnote muted">{t("view.autoDelete")}</p>
      </div>

      <div className="split-body">
        <div className="group">
          {props.files.map((f) => {
            const fi = fileIcon(f.mime, f.name);
            const previewable = /^(image\/(png|jpe?g|gif|webp|avif)|video\/(mp4|webm)|audio\/|application\/pdf)/.test(f.mime);
            return (
              <div key={f.id} className="item has-icon">
                <span className={`tile-icon ${fi.color}`}><Icon name={fi.icon} size={21} /></span>
                <div className="grow">
                  <div className="ellipsis headline" style={{ fontSize: 16 }}>{f.name}</div>
                  <div className="footnote muted">{formatBytes(f.size)}</div>
                </div>
                {previewable && (
                  <a className="icon-btn" href={`/f/${props.code}/d/${f.id}?inline=1`} target="_blank" rel="noopener" aria-label={t("view.preview")} title={t("view.preview")}>
                    <Icon name="eye" size={20} />
                  </a>
                )}
                <a className="btn tinted sm" href={`/f/${props.code}/d/${f.id}`} download>
                  <Icon name="download" size={15} strokeWidth={2} />
                  {t("view.download")}
                </a>
              </div>
            );
          })}
        </div>
        {props.files.length > 1 && (
          <button className="btn primary lg block" onClick={downloadAll}>
            <Icon name="download" size={20} /> {t("view.downloadAll")}
          </button>
        )}
      </div>
    </div>
  );
}
