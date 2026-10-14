"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as Y from "yjs";
import { PusherYProvider } from "@/lib/pusher-yjs";
import { realtimeConfigured } from "@/lib/pusher-client";
import { yCollab, yUndoManagerKeymap } from "y-codemirror.next";
import { EditorState, Compartment } from "@codemirror/state";
import { EditorView, keymap, placeholder, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection, dropCursor } from "@codemirror/view";
import { defaultKeymap, indentWithTab } from "@codemirror/commands";
import { bracketMatching, indentOnInput, indentUnit } from "@codemirror/language";
import { Icon } from "./Icon";
import { useApp } from "./Providers";
import { Countdown } from "./Countdown";
import { useCopy } from "./CopyField";
import { CODE_LANGUAGES, LANGUAGE_LABELS } from "@/lib/config";
import { loadLanguage } from "@/lib/editor-langs";
import { editorTheme } from "@/lib/editor-theme";
import { forgetOwnerKey, getOwnerKey, getSavedName, saveName } from "@/lib/client-keys";

const COLORS = ["#007aff", "#34c759", "#ff9500", "#ff2d55", "#af52de", "#30b0c7", "#5856d6", "#ff3b30"];

type Person = { id: number; name: string; color: string; self: boolean };

function useIsDark() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const calc = () => {
      const attr = document.documentElement.getAttribute("data-theme");
      setDark(attr ? attr === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches);
    };
    calc();
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", calc);
    const mo = new MutationObserver(calc);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => {
      mq.removeEventListener("change", calc);
      mo.disconnect();
    };
  }, []);
  return dark;
}

export function CodeRoom(props: { code: string; title: string | null; language: string; expiresAt: string; ownerSignedIn: boolean; anonOwned: boolean }) {
  const { t, lp, user } = useApp();
  const router = useRouter();
  const copy = useCopy();
  const dark = useIsDark();

  const [name, setName] = useState<string | null>(user?.name ?? null);
  const [draftName, setDraftName] = useState("");
  const [status, setStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");
  const [people, setPeople] = useState<Person[]>([]);
  const [language, setLanguage] = useState(props.language);
  const [gone, setGone] = useState(false);
  const [ownerKey, setOwnerKey] = useState<string | null>(null);

  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const metaRef = useRef<Y.Map<unknown> | null>(null);
  const langComp = useRef(new Compartment());
  const themeComp = useRef(new Compartment());
  const darkRef = useRef(dark);
  darkRef.current = dark;

  useEffect(() => {
    setOwnerKey(getOwnerKey("c", props.code));
    if (!user) {
      const saved = getSavedName();
      if (saved) setName(saved);
      else setDraftName("");
    }
  }, [props.code, user]);

  // Connect + mount the editor once we know the participant's name.
  useEffect(() => {
    if (!name || !hostRef.current) return;

    const ydoc = new Y.Doc();
    const provider = new PusherYProvider(props.code, ydoc, name, setStatus, () => setGone(true));
    const ytext = ydoc.getText("code");
    const meta = ydoc.getMap("meta");
    metaRef.current = meta;
    const awareness = provider.awareness;
    const color = COLORS[awareness.clientID % COLORS.length];
    awareness.setLocalStateField("user", { name, color, colorLight: `${color}33` });

    const undoManager = new Y.UndoManager(ytext);
    const view = new EditorView({
      parent: hostRef.current,
      state: EditorState.create({
        doc: ytext.toString(),
        extensions: [
          lineNumbers(),
          highlightActiveLineGutter(),
          highlightActiveLine(),
          drawSelection(),
          dropCursor(),
          indentOnInput(),
          bracketMatching(),
          indentUnit.of("  "),
          EditorState.tabSize.of(2),
          EditorView.lineWrapping,
          keymap.of([...yUndoManagerKeymap, indentWithTab, ...defaultKeymap]),
          langComp.current.of([]),
          themeComp.current.of(editorTheme(darkRef.current)),
          placeholder(t("code.shareHint")),
          yCollab(ytext, awareness, { undoManager }),
        ],
      }),
    });
    viewRef.current = view;
    view.focus();

    const applyLanguage = async () => {
      const id = String(meta.get("language") ?? props.language);
      setLanguage(id);
      const ext = await loadLanguage(id);
      view.dispatch({ effects: langComp.current.reconfigure(ext) });
    };
    meta.observe(applyLanguage);
    void provider.loadSnapshot().then(applyLanguage).catch(() => {});
    void applyLanguage();

    const updatePeople = () => {
      const list: Person[] = [];
      awareness.getStates().forEach((st: unknown, id: number) => {
        const u = (st as { user?: { name: string; color: string } }).user;
        if (u) list.push({ id, name: u.name, color: u.color, self: id === awareness.clientID });
      });
      list.sort((a, b) => Number(b.self) - Number(a.self) || a.id - b.id);
      setPeople(list);
    };
    awareness.on("change", updatePeople);
    updatePeople();

    return () => {
      awareness.off("change", updatePeople);
      view.destroy();
      viewRef.current = null;
      provider.destroy();
      ydoc.destroy();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, props.code, props.language]);

  useEffect(() => {
    viewRef.current?.dispatch({ effects: themeComp.current.reconfigure(editorTheme(dark)) });
  }, [dark]);

  const changeLanguage = useCallback((id: string) => {
    setLanguage(id);
    metaRef.current?.set("language", id);
  }, []);

  const remove = async () => {
    if (!confirm(t("code.confirmDelete"))) return;
    const res = await fetch(`/api/code/${props.code}`, { method: "DELETE", headers: ownerKey ? { "x-owner-key": ownerKey } : {} });
    if (res.ok) {
      forgetOwnerKey("c", props.code);
      router.push(lp("/code"));
      router.refresh();
    }
  };

  const canDelete = props.ownerSignedIn || (props.anonOwned && !!ownerKey);

  if (!realtimeConfigured()) {
    return (
      <div className="container fullpage">
        <span className="eyebrow">Pusher</span>
        <h1 className="large-title">Realtime is not configured</h1>
        <p className="lead">Set NEXT_PUBLIC_PUSHER_KEY and NEXT_PUBLIC_PUSHER_CLUSTER (and PUSHER_APP_ID / PUSHER_SECRET on the server).</p>
      </div>
    );
  }

  if (gone) {
    return (
      <div className="container fullpage">
        <span className="eyebrow">404</span>
        <h1 className="display">{t("view.expired.title")}</h1>
        <p className="lead">{t("code.expired")}</p>
      </div>
    );
  }

  if (!name) {
    const submit = () => {
      const v = draftName.trim();
      if (!v) return;
      saveName(v);
      setName(v.slice(0, 40));
    };
    return (
      <div className="overlay">
        <form className="sheet glass" onSubmit={(e) => { e.preventDefault(); submit(); }} style={{ background: "var(--glass-strong)" }}>
          <h2 className="title2">{t("code.nameTitle")}</h2>
          <p className="muted subhead" style={{ marginBottom: 16 }}>{t("code.nameDesc")}</p>
          <input className="input" autoFocus placeholder={t("code.namePh")} maxLength={40} value={draftName} onChange={(e) => setDraftName(e.target.value)} />
          <button className="btn primary lg block" style={{ marginTop: 14 }} disabled={!draftName.trim()}>{t("common.continue")}</button>
        </form>
      </div>
    );
  }

  return (
    <div className="code-shell">
      <div className="code-bar glass">
        <div style={{ minWidth: 0 }}>
          <div className="headline ellipsis" style={{ fontSize: 15 }}>{props.title || t("code.untitled")}</div>
          <div className="caption muted" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className={`dot ${status === "connected" ? "" : "off"}`} />
            {status === "connected" ? t("code.live") : status === "connecting" ? t("code.connecting") : t("code.offline")}
            <span>·</span>
            <span>{t("code.expiresIn", { time: "" })}<Countdown expiresAt={props.expiresAt} /></span>
          </div>
        </div>
        <span className="spacer" />
        <div className="presence" title={people.map((p) => p.name).join(", ")}>
          {people.slice(0, 6).map((p) => (
            <span key={p.id} className="avatar sm" style={{ background: p.color }} title={p.self ? `${p.name} (${t("code.you")})` : p.name}>
              {p.name.slice(0, 1).toUpperCase()}
            </span>
          ))}
        </div>
        <span className="pill hide-sm" style={{ flex: "none" }}>{t("code.participants", { n: people.length || 1 })}</span>
        <select className="select" value={language} onChange={(e) => changeLanguage(e.target.value)} aria-label={t("code.language")}>
          {CODE_LANGUAGES.map((l) => (
            <option key={l} value={l}>{LANGUAGE_LABELS[l]}</option>
          ))}
        </select>
        <button className="btn primary sm" onClick={() => copy(`${window.location.origin}/c/${props.code}`)}>
          <Icon name="link" size={15} strokeWidth={2.1} /> {t("code.copyLink")}
        </button>
        {canDelete && (
          <button className="icon-btn" onClick={remove} aria-label={t("code.delete")} title={t("code.delete")} style={{ color: "var(--red)" }}>
            <Icon name="trash" size={20} />
          </button>
        )}
      </div>
      <div className="code-pane" ref={hostRef} />
    </div>
  );
}
