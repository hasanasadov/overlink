"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApp } from "./Providers";
import type { DictKey } from "@/lib/i18n";

type Mode = "login" | "register" | "forgot" | "reset";

const ERR: Record<string, DictKey> = {
  invalidCredentials: "auth.err.invalidCredentials",
  emailTaken: "auth.err.emailTaken",
  weakPassword: "auth.err.weakPassword",
  invalidEmail: "auth.err.invalidEmail",
  nameRequired: "auth.err.nameRequired",
  tooMany: "auth.err.tooMany",
  invalidToken: "auth.reset.invalid",
};

export function AuthForm({ mode, token, next }: { mode: Mode; token?: string; next?: string }) {
  const { t, lp, setUser } = useApp();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const target = next && next.startsWith("/") && !next.startsWith("//") ? next : lp("/account");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    setInfo("");
    try {
      const body =
        mode === "login" ? { email, password } : mode === "register" ? { name, email, password } : mode === "forgot" ? { email } : { token, password };
      const res = await fetch(`/api/auth/${mode}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(t(ERR[data.error as string] ?? "common.error"));
        return;
      }
      if (mode === "login" || mode === "register") {
        setUser(data.user);
        router.push(target);
        router.refresh();
      } else if (mode === "forgot") {
        setInfo(t("auth.forgot.sent"));
      } else {
        setInfo(t("auth.reset.done"));
        setTimeout(() => router.push(lp("/login")), 1500);
      }
    } finally {
      setBusy(false);
    }
  };

  const title: DictKey = mode === "login" ? "auth.signIn.title" : mode === "register" ? "auth.signUp.title" : mode === "forgot" ? "auth.forgot.title" : "auth.reset.title";
  const sub: DictKey | null = mode === "login" ? "auth.signIn.sub" : mode === "register" ? "auth.signUp.sub" : mode === "forgot" ? "auth.forgot.sub" : null;
  const cta: DictKey = mode === "login" ? "auth.signIn.button" : mode === "register" ? "auth.signUp.button" : mode === "forgot" ? "auth.forgot.button" : "auth.reset.button";
  const linkNext = next ? `?next=${encodeURIComponent(next)}` : "";

  return (
    <div className="container split">
      <div className="split-head">
        <span className="eyebrow">Overlink</span>
        <h1 className="large-title">{t(title)}</h1>
        {sub && <p className="lead">{t(sub)}</p>}
      </div>

      <div className="split-body">
        <form className="stack" onSubmit={submit} noValidate>
          {mode === "register" && (
            <div className="field">
              <label htmlFor="name">{t("auth.name")}</label>
              <input id="name" className="input" autoComplete="name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} required />
            </div>
          )}
          {mode !== "reset" && (
            <div className="field">
              <label htmlFor="email">{t("auth.email")}</label>
              <input id="email" className="input" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
          )}
          {mode !== "forgot" && (
            <div className="field">
              <label htmlFor="password">{mode === "reset" ? t("auth.newPassword") : t("auth.password")}</label>
              <input
                id="password"
                className="input"
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                value={password}
                minLength={mode === "login" ? undefined : 8}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          )}

          {error && <div className="form-error" role="alert">{error}</div>}
          {info && <div className="form-ok" role="status">{info}</div>}

          <button className="btn primary lg block" disabled={busy || (mode === "reset" && !token)}>
            {busy ? t("common.loading") : t(cta)}
          </button>

          {mode === "login" && <Link href={lp("/forgot")} className="subhead">{t("auth.forgot")}</Link>}
        </form>

        <p className="subhead muted">
          {mode === "login" && <>{t("auth.noAccount")} <Link href={lp("/register") + linkNext}>{t("nav.signUp")}</Link></>}
          {mode === "register" && <>{t("auth.haveAccount")} <Link href={lp("/login") + linkNext}>{t("nav.signIn")}</Link></>}
          {(mode === "forgot" || mode === "reset") && <Link href={lp("/login")}>{t("auth.backToSignIn")}</Link>}
        </p>
      </div>
    </div>
  );
}
