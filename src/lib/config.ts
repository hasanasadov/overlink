export const SITE_NAME = "Overlink";
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
export const AUTHOR = { name: "Hasanali Asadov", url: "https://asadov.vercel.app", label: "asadov.vercel.app" };

export const MB = 1024 * 1024;
export const limits = {
  anonFileBytes: Number(process.env.MAX_ANON_FILE_MB || 200) * MB,
  userFileBytes: Number(process.env.MAX_USER_FILE_MB || 2048) * MB,
  filesPerShare: Number(process.env.MAX_FILES_PER_SHARE || 20),
  maxCodeBytes: 1 * MB,
  maxRoomPeers: 50,
};

// Expiry presets in seconds. Anonymous visitors get shorter maximums.
export const EXPIRY_PRESETS = [
  { id: "1h", seconds: 60 * 60 },
  { id: "6h", seconds: 6 * 60 * 60 },
  { id: "1d", seconds: 24 * 60 * 60 },
  { id: "7d", seconds: 7 * 24 * 60 * 60 },
  { id: "30d", seconds: 30 * 24 * 60 * 60 },
] as const;
export type ExpiryId = (typeof EXPIRY_PRESETS)[number]["id"];

export const DAY = 24 * 60 * 60;
// "No expiry" is stored as a far-future date so every `expiresAt > now` query keeps working.
export const NEVER_EXPIRES = new Date("2125-01-01T00:00:00.000Z");
export const NEVER_THRESHOLD_MS = 50 * 365 * DAY * 1000;

export type ExpiryChoice = ExpiryId | "never" | "custom";

/** Turns the client's choice into an expiry date. Custom lengths are clamped to [5 min, maxSeconds]. */
export function resolveExpiry(
  id: unknown,
  customSeconds: unknown,
  opts: { allowNever?: boolean; maxSeconds?: number } = {},
): Date {
  const max = opts.maxSeconds ?? 365 * DAY;
  if (id === "never" && opts.allowNever) return NEVER_EXPIRES;
  if (id === "custom") {
    const n = Number(customSeconds);
    const seconds = Number.isFinite(n) && n > 0 ? Math.min(Math.max(Math.floor(n), 300), max) : DAY;
    return new Date(Date.now() + seconds * 1000);
  }
  const preset = EXPIRY_PRESETS.find((p) => p.id === id) ?? EXPIRY_PRESETS[2];
  return new Date(Date.now() + Math.min(preset.seconds, max) * 1000);
}

export const CODE_LANGUAGES = [
  "javascript", "typescript", "python", "html", "css", "json", "markdown", "java",
  "cpp", "rust", "go", "php", "sql", "xml", "yaml", "plain",
] as const;
export type CodeLanguage = (typeof CODE_LANGUAGES)[number];

export const LANGUAGE_LABELS: Record<CodeLanguage, string> = {
  javascript: "JavaScript", typescript: "TypeScript", python: "Python", html: "HTML", css: "CSS", json: "JSON",
  markdown: "Markdown", java: "Java", cpp: "C / C++", rust: "Rust", go: "Go", php: "PHP", sql: "SQL",
  xml: "XML", yaml: "YAML", plain: "Plain text",
};
