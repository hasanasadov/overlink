import { NextResponse } from "next/server";
import { getUser, type SessionUser } from "./auth";
import { sha256 } from "./codes";

export const json = (data: unknown, status = 200) => NextResponse.json(data, { status });
export const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function readJson<T = Record<string, unknown>>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}

/** Owner check shared by files / code / rooms: signed-in owner or anonymous owner key. */
export function isOwner(
  item: { userId: string | null; ownerKeyHash: string | null },
  user: SessionUser | null,
  ownerKey: string | null | undefined,
): boolean {
  if (user && item.userId === user.id) return true;
  if (ownerKey && item.ownerKeyHash && sha256(ownerKey) === item.ownerKeyHash) return true;
  return false;
}

export { getUser };
