"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon, type IconName } from "./Icon";
import { Countdown } from "./Countdown";
import { useApp } from "./Providers";
import { formatBytes } from "@/lib/i18n";
import { LANGUAGE_LABELS, type CodeLanguage } from "@/lib/config";

type Owner = { name: string; email: string } | null;
type Share = { code: string; title: string | null; owner: Owner; downloads: number; createdAt: string; expiresAt: string; bytes: number; files: string[]; fileCount: number; expired: boolean };
type CodeRow = { code: string; title: string | null; language: string; preview: string; owner: Owner; createdAt: string; expiresAt: string; live: number; expired: boolean };
type RoomRow = { code: string; title: string | null; locked: boolean; owner: Owner; createdAt: string; expiresAt: string; live: number; expired: boolean };
type Overview = {
  liveAvailable: boolean;
  stats: { shares: number; files: number; bytes: number; users: number; codes: number; rooms: number; liveCodes: number; liveRooms: number; liveCodePeople: number; liveRoomPeople: number };
  shares: Share[]; codes: CodeRow[]; rooms: RoomRow[];
};
type Tab = "files" | "code" | "rooms";

const ownerLabel = (o: Owner) => (o ? `${o.name} · ${o.email}` : "Qonaq (hesabsız)");

export function AdminLogin({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (value: string) => {
    if (busy) return;
    setBusy(true);
    setError("");
    const res = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: value }) });
    if (res.ok) return router.refresh();
    const data = await res.json().catch(() => ({}));
    setError(data.error === "locked" ? "Çox yanlış cəhd. 15 dəqiqə sonra yenidən yoxlayın." : data.error === "notConfigured" ? "ADMIN_PASSCODE təyin edilməyib." : "Kod yanlışdır.");
    setCode("");
    setBusy(false);
  };

  return (
    <div className="container split">
      <div className="split-head">
        <span className="eyebrow">Overlink</span>
        <h1 className="large-title">Admin</h1>
        <p className="lead">8 rəqəmli giriş kodunu daxil edin.</p>
      </div>
      <form className="split-body" onSubmit={(e) => { e.preventDefault(); if (code.length === 8) void submit(code); }}>
        <div className="field">
          <label htmlFor="admin-code">Giriş kodu</label>
          <input
            id="admin-code"
            className="input mono"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            autoFocus
            maxLength={8}
            value={code}
            disabled={!configured}
            style={{ letterSpacing: "0.4em", fontSize: 22, textAlign: "center" }}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "").slice(0, 8);
              setCode(v);
              if (v.length === 8) void submit(v);
            }}
          />
        </div>
        {error && <div className="form-error" role="alert">{error}</div>}
        {!configured && <div className="form-error">Server tərəfdə ADMIN_PASSCODE (8 rəqəm) təyin edilməyib.</div>}
        <button className="btn primary lg block" disabled={code.length !== 8 || busy}>{busy ? "Yoxlanılır…" : "Daxil ol"}</button>
      </form>
    </div>
  );
}

function Live({ n }: { n: number }) {
  return n > 0 ? (
    <span className="pill green"><span className="dot" /> Canlı · {n} nəfər</span>
  ) : null;
}

export function AdminClient() {
  const router = useRouter();
  const { lp } = useApp();
  const [data, setData] = useState<Overview | null>(null);
  const [tab, setTab] = useState<Tab>("files");
  const [onlyLive, setOnlyLive] = useState(false);
  const [error, setError] = useState("");
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/overview", { cache: "no-store" });
    if (res.status === 401) return router.refresh(); // session expired → shows the login again
    if (!res.ok) return setError("Məlumat yüklənmədi.");
    setError("");
    setData(await res.json());
  }, [router]);

  useEffect(() => {
    void load();
    timer.current = setInterval(load, 8000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [load]);

  const remove = async (kind: "share" | "code" | "room", code: string) => {
    if (!confirm(`“${code}” həmişəlik silinsin?`)) return;
    const res = await fetch("/api/admin/item", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, code }) });
    if (res.ok) void load();
  };

  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.refresh();
  };

  const s = data?.stats;
  const tabs: { id: Tab; icon: IconName; label: string; count?: number; live?: number }[] = [
    { id: "files", icon: "files", label: "Fayllar", count: s?.shares },
    { id: "code", icon: "code", label: "Kod sessiyaları", count: s?.codes, live: s?.liveCodes },
    { id: "rooms", icon: "screenShare", label: "Ekranlar", count: s?.rooms, live: s?.liveRooms },
  ];

  const sortLive = <T extends { live: number; createdAt: string }>(rows: T[]) =>
    [...rows].sort((a, b) => b.live - a.live || +new Date(b.createdAt) - +new Date(a.createdAt)).filter((r) => !onlyLive || r.live > 0);

  return (
    <div className="container page" style={{ paddingTop: 16 }}>
      <div className="row-flex" style={{ marginBottom: 24, flexWrap: "wrap" }}>
        <div>
          <span className="eyebrow">Overlink</span>
          <h1 className="large-title">Admin panel</h1>
        </div>
        <span className="spacer" />
        <button className="btn gray" onClick={() => void load()}><Icon name="clock" size={17} /> Yenilə</button>
        <button className="btn gray" onClick={logout}><Icon name="signOut" size={17} /> Çıxış</button>
      </div>

      {s && (
        <div className="stats">
          <div className="stat"><span className="muted footnote">İstifadəçilər</span><strong>{s.users}</strong></div>
          <div className="stat"><span className="muted footnote">Fayl paylaşımları</span><strong>{s.shares}</strong><span className="footnote muted">{s.files} fayl · {formatBytes(s.bytes)}</span></div>
          <div className="stat"><span className="muted footnote">Aktiv kod sessiyaları</span><strong>{s.liveCodes}</strong><span className="footnote muted">{s.liveCodePeople} nəfər · cəmi {s.codes}</span></div>
          <div className="stat"><span className="muted footnote">Aktiv ekranlar</span><strong>{s.liveRooms}</strong><span className="footnote muted">{s.liveRoomPeople} nəfər · cəmi {s.rooms}</span></div>
        </div>
      )}
      {data && !data.liveAvailable && <p className="form-error" style={{ marginBottom: 12 }}>Canlı məlumat alınmadı (Pusher bağlantısı yoxdur) — “aktiv” göstəriciləri 0 görünəcək.</p>}
      {error && <p className="form-error" style={{ marginBottom: 12 }}>{error}</p>}

      <div className="tabs-scroll" style={{ margin: "20px 0 16px" }}>
        <div className="row-flex">
          <div className="seg">
            {tabs.map((x) => (
              <button key={x.id} className={tab === x.id ? "on" : ""} onClick={() => setTab(x.id)}>
                <Icon name={x.icon} size={16} /> {x.label}
                {x.count !== undefined && <span className="pill" style={{ padding: "0 7px", marginLeft: 2 }}>{x.count}</span>}
                {!!x.live && <span className="pill green" style={{ padding: "0 7px" }}>{x.live}</span>}
              </button>
            ))}
          </div>
          {tab !== "files" && (
            <label className="row-flex" style={{ gap: 8, cursor: "pointer", marginLeft: 8, whiteSpace: "nowrap" }}>
              <span className="switch"><input type="checkbox" checked={onlyLive} onChange={(e) => setOnlyLive(e.target.checked)} /><span /></span>
              <span className="subhead">Yalnız aktiv</span>
            </label>
          )}
        </div>
      </div>

      {!data ? (
        <p className="muted">Yüklənir…</p>
      ) : tab === "files" ? (
        data.shares.length === 0 ? <div className="empty">Fayl paylaşımı yoxdur.</div> : (
          <div className="group">
            {data.shares.map((x) => (
              <div key={x.code} className="item has-icon">
                <span className="tile-icon bg-blue"><Icon name="files" size={20} /></span>
                <div className="grow">
                  <div className="ellipsis headline" style={{ fontSize: 16 }}>{x.title || x.files[0]}{x.fileCount > 1 && <span className="muted" style={{ fontWeight: 400 }}> +{x.fileCount - 1}</span>}</div>
                  <div className="footnote muted ellipsis">{x.files.join(", ")}</div>
                  <div className="footnote muted">/f/{x.code} · {formatBytes(x.bytes)} · {x.downloads} yükləmə · <Countdown expiresAt={x.expiresAt} /> · {ownerLabel(x.owner)}</div>
                </div>
                <a className="icon-btn" href={lp(`/f/${x.code}`)} target="_blank" rel="noopener" aria-label="Aç"><Icon name="chevronRight" size={19} /></a>
                <button className="icon-btn" style={{ color: "var(--red)" }} aria-label="Sil" onClick={() => remove("share", x.code)}><Icon name="trash" size={19} /></button>
              </div>
            ))}
          </div>
        )
      ) : tab === "code" ? (
        (() => {
          const rows = sortLive(data.codes);
          return rows.length === 0 ? <div className="empty">{onlyLive ? "Hazırda aktiv kod sessiyası yoxdur." : "Kod sessiyası yoxdur."}</div> : (
            <div className="group">
              {rows.map((x) => (
                <div key={x.code} className="item has-icon">
                  <span className="tile-icon bg-indigo"><Icon name="code" size={20} /></span>
                  <div className="grow">
                    <div className="row-flex" style={{ gap: 8 }}>
                      <span className="ellipsis headline" style={{ fontSize: 16 }}>{x.title || x.preview.split("\n")[0] || "Adsız sessiya"}</span>
                      <Live n={x.live} />
                    </div>
                    <div className="footnote muted">/c/{x.code} · {LANGUAGE_LABELS[x.language as CodeLanguage] ?? x.language} · <Countdown expiresAt={x.expiresAt} /> · {ownerLabel(x.owner)}</div>
                  </div>
                  <a className="icon-btn" href={lp(`/c/${x.code}`)} target="_blank" rel="noopener" aria-label="Aç"><Icon name="chevronRight" size={19} /></a>
                  <button className="icon-btn" style={{ color: "var(--red)" }} aria-label="Sil" onClick={() => remove("code", x.code)}><Icon name="trash" size={19} /></button>
                </div>
              ))}
            </div>
          );
        })()
      ) : (
        (() => {
          const rows = sortLive(data.rooms);
          return rows.length === 0 ? <div className="empty">{onlyLive ? "Hazırda aktiv ekran paylaşımı yoxdur." : "Ekran otağı yoxdur."}</div> : (
            <div className="group">
              {rows.map((x) => (
                <div key={x.code} className="item has-icon">
                  <span className="tile-icon bg-green"><Icon name="screenShare" size={20} /></span>
                  <div className="grow">
                    <div className="row-flex" style={{ gap: 8 }}>
                      <span className="ellipsis headline" style={{ fontSize: 16 }}>{x.title || "Ekran otağı"}</span>
                      {x.locked && <Icon name="lock" size={13} />}
                      <Live n={x.live} />
                    </div>
                    <div className="footnote muted">/s/{x.code} · <Countdown expiresAt={x.expiresAt} /> · {ownerLabel(x.owner)}</div>
                  </div>
                  <a className="icon-btn" href={lp(`/s/${x.code}`)} target="_blank" rel="noopener" aria-label="Aç"><Icon name="chevronRight" size={19} /></a>
                  <button className="icon-btn" style={{ color: "var(--red)" }} aria-label="Sil" onClick={() => remove("room", x.code)}><Icon name="trash" size={19} /></button>
                </div>
              ))}
            </div>
          );
        })()
      )}
    </div>
  );
}
