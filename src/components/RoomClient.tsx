"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "./Icon";
import { useApp } from "./Providers";
import { Countdown } from "./Countdown";
import { useCopy } from "./CopyField";
import type PusherJS from "pusher-js";
import { Mesh, type SignalData } from "@/lib/mesh";
import { Bus } from "@/lib/bus";
import { createPusher, realtimeConfigured } from "@/lib/pusher-client";
import { forgetOwnerKey, getOwnerKey, getSavedName, saveName } from "@/lib/client-keys";

type PeerInfo = { id: string; name: string; host: boolean; sharing: boolean; audio: boolean };
type ChatMsg = { id: string; from: string | null; name: string; text: string; ts: number; system?: "joined" | "left" | "started" };
type Phase = "join" | "connecting" | "in" | "closed";
type Closed = "ended" | "kicked" | "notFound";

function VideoTile({
  stream, label, self, audio, onClick, onFullscreen, clickable,
}: {
  stream: MediaStream | null; label: string; self?: boolean; audio?: boolean; onClick?: () => void; onFullscreen?: () => void; clickable?: boolean;
}) {
  const { t } = useApp();
  const ref = useRef<HTMLVideoElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [muted, setMuted] = useState(!!self);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (v.srcObject !== stream) v.srcObject = stream;
    if (stream) v.play().catch(() => { v.muted = true; setMuted(true); });
  }, [stream]);

  return (
    <div className={`vtile ${clickable ? "clickable" : ""}`} ref={box} onClick={onClick}>
      <video ref={ref} autoPlay playsInline muted={muted} />
      {!stream && <div className="wait">{t("screen.waitingVideo")}</div>}
      <div className="label">
        <Icon name="screen" size={14} />
        {label}
        {audio && <Icon name="speaker" size={14} />}
      </div>
      <div className="tools" onClick={(e) => e.stopPropagation()}>
        {!self && audio && (
          <button type="button" title={muted ? t("screen.unmute") : t("screen.muted")} aria-label={muted ? t("screen.unmute") : t("screen.muted")} onClick={() => setMuted((m) => !m)}>
            <Icon name={muted ? "speakerOff" : "speaker"} size={17} />
          </button>
        )}
        <button
          type="button"
          title={t("screen.fullscreen")}
          aria-label={t("screen.fullscreen")}
          onClick={() => { box.current?.requestFullscreen?.().catch(() => {}); onFullscreen?.(); }}
        >
          <Icon name="expand" size={17} />
        </button>
      </div>
    </div>
  );
}

export function RoomClient(props: { code: string; title: string | null; hasPassword: boolean; expiresAt: string; ownerSignedIn: boolean }) {
  const { t, lp, user, toast } = useApp();
  const router = useRouter();
  const copy = useCopy();

  const [phase, setPhase] = useState<Phase>("join");
  const [closed, setClosed] = useState<Closed | null>(null);
  const [name, setName] = useState(user?.name ?? "");
  const [password, setPassword] = useState("");
  const [needPassword, setNeedPassword] = useState(props.hasPassword);
  const [joinError, setJoinError] = useState("");

  const [selfId, setSelfId] = useState("");
  const [isHost, setIsHost] = useState(false);
  const [peers, setPeers] = useState<PeerInfo[]>([]);
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [streams, setStreams] = useState<Record<string, MediaStream>>({});
  const [local, setLocal] = useState<MediaStream | null>(null);
  const [shareAudio, setShareAudio] = useState(true);
  const [pinned, setPinned] = useState<string | null>(null);
  const [tab, setTab] = useState<"people" | "chat">("chat");
  const [unread, setUnread] = useState(0);
  const [sideOpen, setSideOpen] = useState(false); // mobile drawer
  const [reconnecting, setReconnecting] = useState(false);
  const [text, setText] = useState("");

  const pusherRef = useRef<PusherJS | null>(null);
  const busRef = useRef<Bus | null>(null);
  const meshRef = useRef<Mesh | null>(null);
  const localRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<PeerInfo[]>([]);
  const selfRef = useRef("");
  const phaseRef = useRef<Phase>("join");
  const joinRef = useRef({ name: "", password: "" });
  const tabRef = useRef(tab);
  tabRef.current = tab;
  const sideOpenRef = useRef(false);
  sideOpenRef.current = sideOpen;
  phaseRef.current = phase;
  const chatEnd = useRef<HTMLDivElement>(null);
  peersRef.current = peers;

  useEffect(() => {
    if (!user) setName(getSavedName());
  }, [user]);

  const addSystem = useCallback((system: NonNullable<ChatMsg["system"]>, who: string) => {
    setChat((l) => [...l.slice(-199), { id: `${Date.now()}${Math.random()}`, from: null, name: who, text: "", ts: Date.now(), system }]);
  }, []);

  const teardown = useCallback(() => {
    busRef.current?.destroy();
    busRef.current = null;
    pusherRef.current?.disconnect();
    pusherRef.current = null;
    meshRef.current?.closeAll();
    meshRef.current = null;
  }, []);

  // Pusher doesn't echo client events back to the sender, so our own sharing state is set locally.
  const markSelf = useCallback((sharing: boolean, audio: boolean) => {
    setPeers((l) => l.map((x) => (x.id === selfRef.current ? { ...x, sharing, audio: sharing && audio } : x)));
  }, []);

  const stopShare = useCallback(() => {
    const s = localRef.current;
    if (!s) return;
    s.getTracks().forEach((tr) => { tr.onended = null; tr.stop(); });
    localRef.current = null;
    setLocal(null);
    meshRef.current?.setLocal(null, []);
    markSelf(false, false);
    busRef.current?.send("sharing", { value: false, audio: false });
  }, [markSelf]);

  const close = useCallback(
    (reason: Closed) => {
      teardown();
      localRef.current?.getTracks().forEach((tr) => tr.stop());
      localRef.current = null;
      setLocal(null);
      setClosed(reason);
      setPhase("closed");
    },
    [teardown],
  );

  const join = () => {
    const n = name.trim().slice(0, 40);
    if (!n) return;
    if (!realtimeConfigured()) return setJoinError("Realtime is not configured (Pusher keys are missing).");
    if (props.hasPassword && !password) return setJoinError(t("screen.passwordRequired"));
    saveName(n);
    joinRef.current = { name: n, password };
    setJoinError("");
    setPhase("connecting");
    teardown();

    const pusher = createPusher({ name: n, password, ownerKey: getOwnerKey("s", props.code) ?? "" });
    pusherRef.current = pusher;
    const channel = pusher.subscribe(`presence-room-${props.code}`);

    const bus = new Bus(channel, (from, kind, p) => {
      switch (kind) {
        case "signal":
          if (p.to === selfRef.current) void meshRef.current?.signal(from, p.data as SignalData);
          break;
        case "sharing": {
          const who = peersRef.current.find((x) => x.id === from);
          if (p.value && who && !who.sharing) addSystem("started", who.name);
          setPeers((l) => l.map((x) => (x.id === from ? { ...x, sharing: !!p.value, audio: !!p.audio } : x)));
          if (!p.value) {
            setStreams((st) => { const { [from]: _gone, ...rest } = st; return rest; });
            setPinned((cur) => (cur === from ? null : cur));
          }
          break;
        }
        case "chat": {
          const who = peersRef.current.find((x) => x.id === from);
          setChat((l) => [...l.slice(-199), { id: String(p.id), from, name: who?.name ?? "?", text: String(p.text).slice(0, 1000), ts: Date.now() }]);
          {
            const desktop = typeof window !== "undefined" && window.matchMedia("(min-width: 861px)").matches;
            const seen = tabRef.current === "chat" && (desktop || sideOpenRef.current);
            if (!seen) setUnread((c) => c + 1);
          }
          break;
        }
      }
    });
    busRef.current = bus;

    channel.bind("pusher:subscription_succeeded", (members: any) => {
      const list: PeerInfo[] = [];
      members.each((m: any) => list.push({ id: m.id, name: m.info?.name ?? "?", host: !!m.info?.host, sharing: false, audio: false }));
      selfRef.current = members.myID;
      const resumed = localRef.current;
      if (resumed) {
        const me = list.find((x) => x.id === members.myID);
        if (me) { me.sharing = true; me.audio = resumed.getAudioTracks().length > 0; }
      }
      setSelfId(members.myID);
      setIsHost(!!members.me?.info?.host);
      setPeers(list);
      setStreams({});
      setPhase("in");
      setReconnecting(false);
      setJoinError("");

      meshRef.current?.closeAll();
      const mesh = new Mesh(
        members.myID,
        (to, data) => bus.send("signal", { to, data }),
        (peerId, stream) => setStreams((st) => (st[peerId] === stream ? st : { ...st, [peerId]: stream })),
        () => {},
      );
      meshRef.current = mesh;
      const ls = localRef.current; // resumed after a reconnect
      if (ls) {
        mesh.setLocal(ls, list.filter((x) => x.id !== members.myID).map((x) => x.id));
        bus.send("sharing", { value: true, audio: ls.getAudioTracks().length > 0 });
      }
    });

    channel.bind("pusher:subscription_error", (err: { status?: number }) => {
      const st = err?.status;
      teardown();
      if (st === 404) return close("notFound");
      setPhase("join");
      if (st === 401) { setNeedPassword(true); setJoinError(""); }
      else if (st === 403) { setNeedPassword(true); setJoinError(t("screen.wrongPassword")); }
      else if (st === 409) setJoinError(t("screen.roomFull"));
      else if (st === 429) setJoinError(t("auth.err.tooMany"));
      else if (st === 503) setJoinError("Realtime is not configured on the server.");
      else setJoinError(t("common.error"));
    });

    channel.bind("pusher:member_added", (m: any) => {
      setPeers((l) => [...l.filter((x) => x.id !== m.id), { id: m.id, name: m.info?.name ?? "?", host: !!m.info?.host, sharing: false, audio: false }]);
      addSystem("joined", m.info?.name ?? "?");
      meshRef.current?.peerJoined(m.id);
      const ls = localRef.current;
      if (ls) bus.send("sharing", { value: true, audio: ls.getAudioTracks().length > 0 }); // tell the newcomer we're presenting
    });
    channel.bind("pusher:member_removed", (m: any) => {
      addSystem("left", m.info?.name ?? peersRef.current.find((x) => x.id === m.id)?.name ?? "?");
      setPeers((l) => l.filter((x) => x.id !== m.id));
      meshRef.current?.removePeer(m.id);
      setStreams((st) => { const { [m.id]: _gone, ...rest } = st; return rest; });
      setPinned((cur) => (cur === m.id ? null : cur));
    });
    channel.bind("kick", (d: { id: string }) => d.id === selfRef.current && close("kicked"));
    channel.bind("ended", () => close("ended"));

    pusher.connection.bind("state_change", ({ current }: { current: string }) => {
      if (phaseRef.current === "in") setReconnecting(current !== "connected");
    });
  };

  useEffect(() => () => {
    teardown();
    localRef.current?.getTracks().forEach((tr) => tr.stop());
  }, [teardown]);

  // The room's lifetime is fixed, so close it locally when the time is up.
  useEffect(() => {
    const ms = new Date(props.expiresAt).getTime() - Date.now();
    if (ms <= 0 || ms > 2_000_000_000) return;
    const id = setTimeout(() => phaseRef.current === "in" && close("ended"), ms);
    return () => clearTimeout(id);
  }, [props.expiresAt, close]);

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ block: "end" });
  }, [chat, tab]);

  const startShare = async () => {
    if (!navigator.mediaDevices?.getDisplayMedia) return toast(t("screen.unsupported"));
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: { ideal: 30, max: 60 } }, audio: shareAudio });
    } catch {
      return toast(t("screen.shareDenied"));
    }
    stopShare();
    localRef.current = stream;
    setLocal(stream);
    stream.getVideoTracks()[0]?.addEventListener("ended", stopShare);
    const others = peersRef.current.filter((p) => p.id !== selfRef.current).map((p) => p.id);
    meshRef.current?.setLocal(stream, others);
    const hasAudio = stream.getAudioTracks().length > 0;
    markSelf(true, hasAudio);
    busRef.current?.send("sharing", { value: true, audio: hasAudio });
  };

  const leave = () => {
    stopShare();
    teardown();
    router.push(lp("/screen"));
  };

  const ownerHeaders = (): Record<string, string> => {
    const k = getOwnerKey("s", props.code);
    return k ? { "x-owner-key": k } : {};
  };

  const endSession = async () => {
    if (!confirm(t("screen.confirmEnd"))) return;
    await fetch(`/api/rooms/${props.code}`, { method: "DELETE", headers: ownerHeaders() });
    forgetOwnerKey("s", props.code);
  };

  const kick = (id: string) =>
    void fetch(`/api/rooms/${props.code}/kick`, { method: "POST", headers: { "Content-Type": "application/json", ...ownerHeaders() }, body: JSON.stringify({ id }) });

  const sendChat = () => {
    const v = text.trim();
    if (!v) return;
    const id = `${Date.now()}${Math.random()}`;
    busRef.current?.send("chat", { id, text: v });
    setChat((l) => [...l.slice(-199), { id, from: selfRef.current, name: joinRef.current.name, text: v, ts: Date.now() }]);
    setText("");
  };

  const everyone = useMemo(() => peers.slice().sort((a, b) => Number(b.id === selfId) - Number(a.id === selfId) || a.name.localeCompare(b.name)), [peers, selfId]);
  const sharers = peers.filter((p) => p.sharing);
  const streamFor = (id: string) => (id === selfId ? local : streams[id] ?? null);

  /* ---------------- Join / closed screens ---------------- */
  if (phase === "closed") {
    return (
      <div className="container fullpage">
        <span className="eyebrow">{t("nav.screen")}</span>
        <h1 className="display">{closed === "notFound" ? t("view.expired.title") : t("screen.ended")}</h1>
        <p className="lead">{closed === "kicked" ? t("screen.removed") : closed === "notFound" ? t("screen.notFound") : t("screen.endedDesc")}</p>
        <button className="btn primary lg" onClick={() => router.push(lp("/screen"))}>{t("nav.screen")}</button>
      </div>
    );
  }

  if (phase !== "in") {
    return (
      <div className="container split">
        <div className="split-head">
          <span className="eyebrow">{t("screen.joinTitle")}</span>
          <h1 className="large-title">{props.title || t("nav.screen")}</h1>
          <p className="lead"><Countdown expiresAt={props.expiresAt} /></p>
        </div>
        <form className="split-body" onSubmit={(e) => { e.preventDefault(); join(); }}>
          <div className="field">
            <label>{t("screen.yourName")}</label>
            <input className="input" autoFocus value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
          </div>
          {needPassword && (
            <div className="field">
              <label>{t("screen.roomPassword")}</label>
              <input className="input" type="password" autoComplete="off" value={password} onChange={(e) => setPassword(e.target.value)} />
              {!joinError && <span className="footnote muted" style={{ paddingLeft: 2 }}><Icon name="lock" size={12} /> {t("screen.passwordRequired")}</span>}
            </div>
          )}
          {joinError && <div className="form-error" role="alert">{joinError}</div>}
          <button className="btn primary lg block" disabled={!name.trim() || phase === "connecting"}>
            {phase === "connecting" ? t("screen.connecting") : t("screen.join")}
          </button>
        </form>
      </div>
    );
  }

  /* ---------------- Room ---------------- */
  const tiles = sharers.map((p) => (
    <VideoTile
      key={p.id}
      stream={streamFor(p.id)}
      label={p.id === selfId ? `${p.name} (${t("screen.you")})` : p.name}
      self={p.id === selfId}
      audio={p.audio}
      clickable={sharers.length > 1}
      onClick={() => sharers.length > 1 && setPinned((cur) => (cur === p.id ? null : p.id))}
    />
  ));
  const pinnedId = pinned && sharers.some((p) => p.id === pinned) ? pinned : null;
  const n = sharers.length;
  const gridClass = n <= 1 ? "n1" : n === 2 ? "n2" : n <= 4 ? "n4" : "nmany";

  return (
    <div className="room-shell">
      <section className="stage">
        <div className="room-top glass">
          <div style={{ minWidth: 0 }}>
            <div className="headline ellipsis" style={{ fontSize: 15 }}>{props.title || t("nav.screen")}</div>
            <div className="caption muted" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span className={`dot ${reconnecting ? "off" : ""}`} />
              {reconnecting ? t("screen.reconnecting") : t("code.live")}
              <span>·</span>
              <span>{t("code.expiresIn", { time: "" })}<Countdown expiresAt={props.expiresAt} /></span>
            </div>
          </div>
          <span className="spacer" />
          <span className="pill"><Icon name="people" size={13} strokeWidth={2} /> {peers.length}</span>
          <button className="btn primary sm" aria-label={t("screen.copyLink")} onClick={() => copy(`${window.location.origin}/s/${props.code}`)}>
            <Icon name="link" size={15} strokeWidth={2.1} /> <span className="lbl">{t("screen.copyLink")}</span>
          </button>
        </div>

        {n === 0 ? (
          <div className="room-empty">
            <div className="stack" style={{ alignItems: "center", gap: 8 }}>
              <span className="tile-icon xl bg-gray"><Icon name="screen" size={34} strokeWidth={1.4} /></span>
              <h2 className="title2">{t("screen.empty")}</h2>
              <p className="muted">{t("screen.emptyDesc")}</p>
            </div>
          </div>
        ) : pinnedId && n > 1 ? (
          <div className="stage-focus">
            <div className="main">{tiles.find((x) => x.key === pinnedId)}</div>
            <div className="strip">{tiles.filter((x) => x.key !== pinnedId)}</div>
          </div>
        ) : (
          <div className={`stage-grid ${gridClass}`}>{tiles}</div>
        )}

        <div className="controls glass">
          {local ? (
            <button className="btn danger solid" onClick={stopShare}>
              <Icon name="stop" size={16} /> <span>{t("screen.stop")}</span>
            </button>
          ) : (
            <>
              <button className="btn green" onClick={startShare}>
                <Icon name="screenShare" size={19} /> {t("screen.share")}
              </button>
              <label className="row-flex" style={{ gap: 8, cursor: "pointer" }} title={t("screen.audioNote")}>
                <span className="switch">
                  <input type="checkbox" checked={shareAudio} onChange={(e) => setShareAudio(e.target.checked)} />
                  <span />
                </span>
                <span className="subhead lbl-wide">{t("screen.shareAudio")}</span>
                <Icon name="speaker" size={20} className="aud-ico" />
              </label>
            </>
          )}
          <span style={{ width: 1, height: 24, background: "var(--separator)" }} />
          <button className="btn gray only-sm" aria-label={t("screen.chat")} onClick={() => { setTab("chat"); setUnread(0); setSideOpen(true); }}>
            <Icon name="message" size={18} />
            {unread > 0 && <span className="badge">{unread}</span>}
          </button>
          {isHost && (
            <button className="btn danger" aria-label={t("screen.end")} onClick={endSession}>
              <Icon name="phoneDown" size={18} /> <span className="lbl">{t("screen.end")}</span>
            </button>
          )}
          <button className="btn gray" aria-label={t("screen.leave")} onClick={leave}>
            <Icon name="signOut" size={18} /> <span className="lbl">{t("screen.leave")}</span>
          </button>
        </div>
      </section>

      <aside className={`side ${sideOpen ? "open" : ""}`}>
        <div className="side-tabs">
          <button className="icon-btn only-sm side-close" aria-label={t("common.close")} onClick={() => setSideOpen(false)}>
            <Icon name="xmark" size={20} />
          </button>
          <div className="seg block">
            <button className={tab === "chat" ? "on" : ""} onClick={() => { setTab("chat"); setUnread(0); }}>
              <Icon name="message" size={15} /> {t("screen.chat")}
              {unread > 0 && <span className="badge">{unread}</span>}
            </button>
            <button className={tab === "people" ? "on" : ""} onClick={() => setTab("people")}>
              <Icon name="people" size={15} /> {t("screen.participants")} · {peers.length}
            </button>
          </div>
        </div>

        {tab === "people" ? (
          <div className="side-body">
            {everyone.map((p) => (
              <div key={p.id} className="peer">
                <span className="avatar" style={{ background: p.host ? "var(--blue)" : undefined }}>{p.name.slice(0, 1).toUpperCase()}</span>
                <div className="grow" style={{ flex: 1, minWidth: 0 }}>
                  <div className="ellipsis headline" style={{ fontSize: 15 }}>
                    {p.name}{p.id === selfId && <span className="muted" style={{ fontWeight: 400 }}> ({t("screen.you")})</span>}
                  </div>
                  <div className="caption muted">
                    {p.host && <>{t("screen.host")}{p.sharing ? " · " : ""}</>}
                    {p.sharing && <span style={{ color: "var(--green)" }}>● {t("screen.sharing")}</span>}
                  </div>
                </div>
                {isHost && p.id !== selfId && (
                  <button className="icon-btn" title={t("screen.kick")} aria-label={t("screen.kick")} onClick={() => kick(p.id)}>
                    <Icon name="xmarkCircle" size={20} />
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="side-body">
              <div className="chat-list">
                {chat.length === 0 && <p className="muted center footnote" style={{ padding: 20 }}>{t("screen.noChat")}</p>}
                {chat.map((m) =>
                  m.system ? (
                    <div key={m.id} className="sys-msg">
                      {m.system === "joined" ? t("screen.joinedMsg", { name: m.name }) : m.system === "left" ? t("screen.leftMsg", { name: m.name }) : t("screen.startedMsg", { name: m.name })}
                    </div>
                  ) : (
                    <div key={m.id} className={`bubble ${m.from === selfId ? "me" : ""}`}>
                      {m.from !== selfId && <div className="who">{m.name}</div>}
                      {m.text}
                    </div>
                  ),
                )}
                <div ref={chatEnd} />
              </div>
            </div>
            <form className="chat-input" onSubmit={(e) => { e.preventDefault(); sendChat(); }}>
              <input className="input" value={text} maxLength={1000} placeholder={t("screen.messagePh")} onChange={(e) => setText(e.target.value)} />
              <button className="btn-circle blue" style={{ width: 40, height: 40, flex: "none" }} aria-label={t("screen.send")} disabled={!text.trim()}>
                <Icon name="send" size={18} />
              </button>
            </form>
          </>
        )}
      </aside>
      {sideOpen && <div className="side-backdrop" onClick={() => setSideOpen(false)} />}
    </div>
  );
}
