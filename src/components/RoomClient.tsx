"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "./Icon";
import { useApp } from "./Providers";
import { Countdown } from "./Countdown";
import { useCopy } from "./CopyField";
import { Mesh, type SignalData } from "@/lib/mesh";
import { forgetOwnerKey, getOwnerKey, getSavedName, saveName } from "@/lib/client-keys";

type PeerInfo = { id: string; name: string; host: boolean; sharing: boolean; audio: boolean };
type ChatMsg = { id: string; from: string | null; name: string; text: string; ts: number; system?: "joined" | "left" | "started" };
type Phase = "join" | "connecting" | "in" | "closed";
type Closed = "ended" | "kicked" | "notFound";

const NO_RETRY_CODES = new Set([4401, 4403, 4404, 4408, 4410]);

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
  const [reconnecting, setReconnecting] = useState(false);
  const [text, setText] = useState("");

  const wsRef = useRef<WebSocket | null>(null);
  const meshRef = useRef<Mesh | null>(null);
  const localRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<PeerInfo[]>([]);
  const selfRef = useRef("");
  const intentional = useRef(false);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const joinRef = useRef({ name: "", password: "" });
  const tabRef = useRef(tab);
  tabRef.current = tab;
  const chatEnd = useRef<HTMLDivElement>(null);
  peersRef.current = peers;

  useEffect(() => {
    if (!user) setName(getSavedName());
  }, [user]);

  const wsSend = useCallback((msg: unknown) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
  }, []);

  const stopShare = useCallback(() => {
    const s = localRef.current;
    if (!s) return;
    s.getTracks().forEach((tr) => { tr.onended = null; tr.stop(); });
    localRef.current = null;
    setLocal(null);
    meshRef.current?.setLocal(null, []);
    wsSend({ t: "sharing", value: false });
  }, [wsSend]);

  const handleMessage = useCallback(
    (msg: any) => {
      switch (msg.t) {
        case "joined": {
          selfRef.current = msg.id;
          setSelfId(msg.id);
          setIsHost(!!msg.host);
          setPeers(msg.peers);
          setChat(msg.chat);
          setStreams({});
          setPhase("in");
          setReconnecting(false);
          setJoinError("");
          meshRef.current?.closeAll();
          const mesh = new Mesh(
            msg.id,
            (to, data) => wsSend({ t: "signal", to, data }),
            (peerId, stream) => setStreams((s) => (s[peerId] === stream ? s : { ...s, [peerId]: stream })),
            () => {},
          );
          meshRef.current = mesh;
          const ls = localRef.current;
          if (ls) {
            const others = (msg.peers as PeerInfo[]).filter((p) => p.id !== msg.id).map((p) => p.id);
            mesh.setLocal(ls, others);
            wsSend({ t: "sharing", value: true, audio: ls.getAudioTracks().length > 0 });
          }
          break;
        }
        case "error": {
          intentional.current = true; // don't auto-retry a rejected join
          if (msg.reason === "password") {
            setNeedPassword(true);
            setJoinError("");
          } else if (msg.reason === "wrongPassword") {
            setNeedPassword(true);
            setJoinError(t("screen.wrongPassword"));
          } else if (msg.reason === "full") setJoinError(t("screen.roomFull"));
          else if (msg.reason === "notFound") { setClosed("notFound"); setPhase("closed"); return; }
          else setJoinError(t("common.error"));
          setPhase("join");
          break;
        }
        case "peer-joined":
          setPeers((l) => [...l.filter((p) => p.id !== msg.peer.id), msg.peer]);
          meshRef.current?.peerJoined(msg.peer.id);
          break;
        case "peer-left":
          setPeers((l) => l.filter((p) => p.id !== msg.id));
          meshRef.current?.removePeer(msg.id);
          setStreams((s) => { const { [msg.id]: _gone, ...rest } = s; return rest; });
          setPinned((p) => (p === msg.id ? null : p));
          break;
        case "sharing":
          setPeers((l) => l.map((p) => (p.id === msg.id ? { ...p, sharing: msg.value, audio: msg.audio } : p)));
          if (!msg.value) {
            setStreams((s) => { const { [msg.id]: _gone, ...rest } = s; return rest; });
            setPinned((p) => (p === msg.id ? null : p));
          }
          break;
        case "signal":
          void meshRef.current?.signal(msg.from, msg.data as SignalData);
          break;
        case "chat":
          setChat((l) => [...l.slice(-199), msg.msg]);
          if (tabRef.current !== "chat" && !msg.msg.system) setUnread((n) => n + 1);
          break;
        case "kicked":
          intentional.current = true;
          setClosed("kicked");
          setPhase("closed");
          break;
        case "ended":
          intentional.current = true;
          setClosed("ended");
          setPhase("closed");
          break;
      }
    },
    [t, wsSend],
  );

  const connect = useCallback(() => {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${proto}//${window.location.host}/ws/room/${props.code}`);
    wsRef.current = ws;
    ws.onopen = () => {
      ws.send(JSON.stringify({ t: "join", name: joinRef.current.name, password: joinRef.current.password, ownerKey: getOwnerKey("s", props.code) }));
    };
    ws.onmessage = (ev) => {
      try { handleMessage(JSON.parse(ev.data)); } catch { /* ignore malformed */ }
    };
    ws.onclose = (ev) => {
      if (wsRef.current !== ws) return;
      if (intentional.current || NO_RETRY_CODES.has(ev.code)) return;
      meshRef.current?.closeAll();
      setStreams({});
      setReconnecting(true);
      retryTimer.current = setTimeout(connect, 1500);
    };
  }, [handleMessage, props.code]);

  const join = () => {
    const n = name.trim().slice(0, 40);
    if (!n) return;
    if (props.hasPassword && !password) return setJoinError(t("screen.passwordRequired"));
    saveName(n);
    joinRef.current = { name: n, password };
    intentional.current = false;
    setJoinError("");
    setPhase("connecting");
    connect();
  };

  useEffect(() => {
    return () => {
      intentional.current = true;
      if (retryTimer.current) clearTimeout(retryTimer.current);
      wsRef.current?.close();
      meshRef.current?.closeAll();
      localRef.current?.getTracks().forEach((tr) => tr.stop());
    };
  }, []);

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
    wsSend({ t: "sharing", value: true, audio: stream.getAudioTracks().length > 0 });
  };

  const leave = () => {
    intentional.current = true;
    stopShare();
    wsRef.current?.close();
    router.push(lp("/screen"));
  };

  const endSession = () => {
    if (!confirm(t("screen.confirmEnd"))) return;
    wsSend({ t: "end" });
    forgetOwnerKey("s", props.code);
  };

  const sendChat = () => {
    const v = text.trim();
    if (!v) return;
    wsSend({ t: "chat", text: v });
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
          <button className="btn primary sm" onClick={() => copy(`${window.location.origin}/s/${props.code}`)}>
            <Icon name="link" size={15} strokeWidth={2.1} /> {t("screen.copyLink")}
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
              <Icon name="stop" size={16} /> {t("screen.stop")}
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
                <span className="subhead">{t("screen.shareAudio")}</span>
              </label>
            </>
          )}
          <span style={{ width: 1, height: 24, background: "var(--separator)" }} />
          {isHost && (
            <button className="btn danger" onClick={endSession}>
              <Icon name="phoneDown" size={18} /> {t("screen.end")}
            </button>
          )}
          <button className="btn gray" onClick={leave}>
            <Icon name="signOut" size={18} /> {t("screen.leave")}
          </button>
        </div>
      </section>

      <aside className="side">
        <div className="side-tabs">
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
                  <button className="icon-btn" title={t("screen.kick")} aria-label={t("screen.kick")} onClick={() => wsSend({ t: "kick", id: p.id })}>
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
    </div>
  );
}
