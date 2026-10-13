"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { makeT, localePath, type Locale, type TFn } from "@/lib/i18n";
import { Icon } from "./Icon";

export type ClientUser = { id: string; name: string; email: string } | null;
type Toast = { id: number; text: string };

type AppCtx = {
  locale: Locale;
  t: TFn;
  lp: (path: string) => string;
  user: ClientUser;
  setUser: (u: ClientUser) => void;
  toast: (text: string) => void;
};

const Ctx = createContext<AppCtx | null>(null);

export function useApp(): AppCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp outside Providers");
  return v;
}

export function Providers({ locale, user: initialUser, children }: { locale: Locale; user: ClientUser; children: ReactNode }) {
  const [user, setUser] = useState<ClientUser>(initialUser);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const t = useMemo(() => makeT(locale), [locale]);
  const lp = useCallback((p: string) => localePath(locale, p), [locale]);

  const toast = useCallback((text: string) => {
    const id = Date.now() + Math.random();
    setToasts((l) => [...l, { id, text }]);
    setTimeout(() => setToasts((l) => l.filter((x) => x.id !== id)), 2200);
  }, []);

  const value = useMemo(() => ({ locale, t, lp, user, setUser, toast }), [locale, t, lp, user, toast]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="toasts" aria-live="polite">
        {toasts.map((x) => (
          <div key={x.id} className="toast glass">
            <Icon name="checkCircle" size={18} style={{ color: "var(--green)" }} />
            {x.text}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
