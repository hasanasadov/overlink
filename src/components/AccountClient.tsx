"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon, type IconName } from "./Icon";
import { useApp } from "./Providers";
import { Countdown } from "./Countdown";
import { useCopy } from "./CopyField";
import { LANGUAGE_LABELS, type CodeLanguage } from "@/lib/config";
import { formatBytes, type DictKey } from "@/lib/i18n";
import { fileIcon } from "@/lib/file-icon";

type ShareRow = { code: string; title: string | null; expiresAt: string; downloads: number; files: { name: string; size: number; mime: string }[] };
type CodeRow = { code: string; title: string | null; language: string; preview: string; expiresAt: string };
type RoomRow = { code: string; title: string | null; locked: boolean; expiresAt: string };
type Tab = "files" | "code" | "rooms" | "profile";

const ERR: Record<string, DictKey> = { weakPassword: "auth.err.weakPassword", wrongCurrent: "auth.err.wrongCurrent", tooMany: "auth.err.tooMany", nameRequired: "auth.err.nameRequired" };

function Empty({ icon, text, href, label }: { icon: IconName; text: DictKey; href: string; label: string }) {
  const { t } = useApp();
  return (
    <div className="empty">
      <span className="tile-icon xl bg-gray"><Icon name={icon} size={32} strokeWidth={1.4} /></span>
      <div className="headline" style={{ color: "var(--label)" }}>{t("account.empty")}</div>
      <p>{t(text)}</p>
      <Link href={href} className="btn primary sm"><Icon name="plus" size={15} strokeWidth={2.4} /> {label}</Link>
    </div>
  );
}

export function AccountClient({ shares, codes, rooms }: { shares: ShareRow[]; codes: CodeRow[]; rooms: RoomRow[] }) {
  const { t, lp, user, setUser, toast } = useApp();
  const router = useRouter();
  const copy = useCopy();
  const [tab, setTab] = useState<Tab>("files");
  const [name, setName] = useState(user?.name ?? "");
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const del = async (url: string, confirmKey: DictKey) => {
    if (!confirm(t(confirmKey))) return;
    const res = await fetch(url, { method: "DELETE" });
    if (res.ok) router.refresh();
  };

  const saveProfile = async () => {
    const res = await fetch("/api/auth/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
    const data = await res.json().catch(() => ({}));
    if (res.ok && user) {
      setUser({ ...user, name: data.name });
      toast(t("account.profile.saved"));
      router.refresh();
    } else setMsg({ ok: false, text: t(ERR[data.error] ?? "common.error") });
  };

  const changePassword = async () => {
    setMsg(null);
    const res = await fetch("/api/auth/password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ current: cur, next }) });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setCur("");
      setNext("");
      toast(t("account.profile.saved"));
    } else setMsg({ ok: false, text: t(ERR[data.error] ?? "common.error") });
  };

  const signOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push(lp("/"));
    router.refresh();
  };

  const deleteAccount = async () => {
    if (!confirm(t("account.confirmDeleteAccount"))) return;
    const res = await fetch("/api/auth/account", { method: "DELETE" });
    if (res.ok) {
      setUser(null);
      router.push(lp("/"));
      router.refresh();
    }
  };

  const tabs: { id: Tab; icon: IconName; label: DictKey; count?: number }[] = [
    { id: "files", icon: "files", label: "account.tab.files", count: shares.length },
    { id: "code", icon: "code", label: "account.tab.code", count: codes.length },
    { id: "rooms", icon: "screenShare", label: "account.tab.rooms", count: rooms.length },
    { id: "profile", icon: "person", label: "account.tab.profile" },
  ];

  const actions = (kind: "f" | "c" | "s", code: string, delUrl: string) => (
    <>
      <button className="icon-btn" aria-label={t("common.copy")} title={t("common.copy")} onClick={() => copy(`${origin}/${kind}/${code}`)}>
        <Icon name="copy" size={19} />
      </button>
      <Link className="icon-btn" aria-label={t("common.open")} title={t("common.open")} href={lp(`/${kind}/${code}`)}>
        <Icon name="chevronRight" size={19} />
      </Link>
      <button className="icon-btn" style={{ color: "var(--red)" }} aria-label={t("common.delete")} title={t("common.delete")} onClick={() => del(delUrl, kind === "f" ? "view.confirmDelete" : kind === "c" ? "code.confirmDelete" : "view.confirmDelete")}>
        <Icon name="trash" size={19} />
      </button>
    </>
  );

  return (
    <div className="container page" style={{ paddingTop: 16 }}>
      <div className="row-flex" style={{ marginBottom: 32, gap: 20 }}>
        <span className="avatar lg">{(user?.name ?? "?").slice(0, 1).toUpperCase()}</span>
        <div style={{ minWidth: 0 }}>
          <h1 className="large-title ellipsis">{t("account.hello", { name: user?.name ?? "" })}</h1>
          <p className="muted ellipsis">{user?.email}</p>
        </div>
      </div>

      <div className="tabs-scroll" style={{ marginBottom: 18 }}>
        <div className="seg">
          {tabs.map((x) => (
            <button key={x.id} className={tab === x.id ? "on" : ""} onClick={() => { setTab(x.id); setMsg(null); }}>
              <Icon name={x.icon} size={16} /> {t(x.label)}
              {x.count !== undefined && x.count > 0 && <span className="pill" style={{ padding: "0 7px", marginLeft: 2 }}>{x.count}</span>}
            </button>
          ))}
        </div>
      </div>

      {tab === "files" && (
        shares.length === 0 ? (
          <Empty icon="files" text="account.emptyFiles" href={lp("/files")} label={t("account.new")} />
        ) : (
          <div className="group">
            {shares.map((s) => {
              const first = s.files[0];
              const fi = fileIcon(first?.mime ?? "", first?.name ?? "");
              const total = s.files.reduce((n, f) => n + f.size, 0);
              return (
                <div key={s.code} className="item has-icon">
                  <span className={`tile-icon ${fi.color}`}><Icon name={fi.icon} size={20} /></span>
                  <div className="grow">
                    <div className="ellipsis headline" style={{ fontSize: 16 }}>{s.title || first?.name}{s.files.length > 1 && <span className="muted" style={{ fontWeight: 400 }}> +{s.files.length - 1}</span>}</div>
                    <div className="footnote muted">
                      /f/{s.code} · {formatBytes(total)} · {t("view.downloadsCount", { n: s.downloads })} · <Countdown expiresAt={s.expiresAt} />
                    </div>
                  </div>
                  {actions("f", s.code, `/api/files/${s.code}`)}
                </div>
              );
            })}
          </div>
        )
      )}

      {tab === "code" && (
        codes.length === 0 ? (
          <Empty icon="code" text="account.emptyCode" href={lp("/code")} label={t("account.new")} />
        ) : (
          <div className="group">
            {codes.map((c) => (
              <div key={c.code} className="item has-icon">
                <span className="tile-icon bg-indigo"><Icon name="code" size={20} /></span>
                <div className="grow">
                  <div className="ellipsis headline" style={{ fontSize: 16 }}>{c.title || c.preview.split("\n")[0] || t("code.untitled")}</div>
                  <div className="footnote muted">/c/{c.code} · {LANGUAGE_LABELS[c.language as CodeLanguage] ?? c.language} · <Countdown expiresAt={c.expiresAt} /></div>
                </div>
                {actions("c", c.code, `/api/code/${c.code}`)}
              </div>
            ))}
          </div>
        )
      )}

      {tab === "rooms" && (
        rooms.length === 0 ? (
          <Empty icon="screenShare" text="account.emptyRooms" href={lp("/screen")} label={t("account.new")} />
        ) : (
          <div className="group">
            {rooms.map((r) => (
              <div key={r.code} className="item has-icon">
                <span className="tile-icon bg-green"><Icon name="screenShare" size={20} /></span>
                <div className="grow">
                  <div className="ellipsis headline" style={{ fontSize: 16 }}>{r.title || t("nav.screen")} {r.locked && <Icon name="lock" size={13} />}</div>
                  <div className="footnote muted">/s/{r.code} · <Countdown expiresAt={r.expiresAt} /></div>
                </div>
                {actions("s", r.code, `/api/rooms/${r.code}`)}
              </div>
            ))}
          </div>
        )
      )}

      {tab === "profile" && (
        <div className="split" style={{ padding: 0, minHeight: 0 }}>
          <div className="split-body">
            <div className="group-title">{t("account.profile.info")}</div>
            <div className="stack">
              <div className="field">
                <label>{t("auth.name")}</label>
                <input className="input" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="field">
                <label>{t("auth.email")}</label>
                <input className="input" value={user?.email ?? ""} disabled />
              </div>
              <button className="btn primary" disabled={!name.trim() || name === user?.name} onClick={saveProfile}>{t("common.save")}</button>
            </div>
          </div>

          <div className="split-body">
            <div className="group-title">{t("account.profile.security")}</div>
            <div className="stack">
              <div className="field">
                <label>{t("account.profile.currentPassword")}</label>
                <input className="input" type="password" autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} />
              </div>
              <div className="field">
                <label>{t("auth.newPassword")}</label>
                <input className="input" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
              </div>
              {msg && <div className={msg.ok ? "form-ok" : "form-error"}>{msg.text}</div>}
              <button className="btn tinted" disabled={!cur || next.length < 8} onClick={changePassword}>
                <Icon name="key" size={18} /> {t("account.profile.changePassword")}
              </button>
            </div>
          </div>

          <div className="row-flex" style={{ flexWrap: "wrap", gridColumn: "1 / -1" }}>
            <button className="btn gray" onClick={signOut}><Icon name="signOut" size={18} /> {t("account.signOut")}</button>
            <button className="btn danger" onClick={deleteAccount}><Icon name="trash" size={18} /> {t("account.deleteAccount")}</button>
          </div>
        </div>
      )}
    </div>
  );
}
