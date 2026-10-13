// Anonymous owners get a secret key per created item. It is kept only in this browser
// so the creator can delete their share later without having an account.
const KEY = "overlink:owner-keys";

function read(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}

export function saveOwnerKey(kind: "f" | "c" | "s", code: string, key: string | null) {
  if (!key) return;
  try {
    const all = read();
    all[`${kind}:${code}`] = key;
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* storage unavailable */
  }
}

export function getOwnerKey(kind: "f" | "c" | "s", code: string): string | null {
  return read()[`${kind}:${code}`] ?? null;
}

export function forgetOwnerKey(kind: "f" | "c" | "s", code: string) {
  try {
    const all = read();
    delete all[`${kind}:${code}`];
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}

const NAME_KEY = "overlink:name";
export function getSavedName(): string {
  try {
    return localStorage.getItem(NAME_KEY) || "";
  } catch {
    return "";
  }
}
export function saveName(name: string) {
  try {
    localStorage.setItem(NAME_KEY, name);
  } catch {
    /* ignore */
  }
}
