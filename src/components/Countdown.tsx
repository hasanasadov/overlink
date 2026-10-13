"use client";

import { useEffect, useState } from "react";
import { useApp } from "./Providers";
import { formatRemaining } from "@/lib/i18n";

export function useRemaining(expiresAt: string) {
  const [ms, setMs] = useState(() => new Date(expiresAt).getTime() - Date.now());
  useEffect(() => {
    const tick = () => setMs(new Date(expiresAt).getTime() - Date.now());
    tick();
    const id = setInterval(tick, 15_000);
    return () => clearInterval(id);
  }, [expiresAt]);
  return ms;
}

export function Countdown({ expiresAt }: { expiresAt: string }) {
  const { t } = useApp();
  const ms = useRemaining(expiresAt);
  return <>{ms <= 0 ? t("account.expired") : formatRemaining(ms, t)}</>;
}
