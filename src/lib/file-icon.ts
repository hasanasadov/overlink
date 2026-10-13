import type { IconName } from "@/components/Icon";

export function fileIcon(mime: string, name: string): { icon: IconName; color: string } {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (mime.startsWith("image/")) return { icon: "photo", color: "bg-pink" };
  if (mime.startsWith("video/")) return { icon: "film", color: "bg-purple" };
  if (mime.startsWith("audio/")) return { icon: "music", color: "bg-red" };
  if (["zip", "rar", "7z", "tar", "gz", "tgz"].includes(ext)) return { icon: "archive", color: "bg-orange" };
  if (["js", "ts", "tsx", "jsx", "py", "java", "c", "cpp", "rs", "go", "php", "html", "css", "json", "sql"].includes(ext)) return { icon: "code", color: "bg-indigo" };
  return { icon: "doc", color: "bg-blue" };
}
