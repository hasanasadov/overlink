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

export const ANON_MAX_EXPIRY = 7 * 24 * 60 * 60;
export const USER_MAX_EXPIRY = 30 * 24 * 60 * 60;

export function resolveExpiry(id: unknown, signedIn: boolean): Date {
  const preset = EXPIRY_PRESETS.find((p) => p.id === id) ?? EXPIRY_PRESETS[2];
  const max = signedIn ? USER_MAX_EXPIRY : ANON_MAX_EXPIRY;
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
