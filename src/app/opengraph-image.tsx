import { ImageResponse } from "next/og";

export const alt = "Overlink — file, code and screen sharing";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 96,
          background: "#ffffff", color: "#1d1d1f",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <div style={{ width: 116, height: 116, borderRadius: 28, display: "flex", alignItems: "center", justifyContent: "center", background: "#0071e3" }}>
            <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 14a4.5 4.5 0 0 0 6.4 0l3.1-3.1a4.5 4.5 0 0 0-6.4-6.4l-1 1" />
              <path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3.1 3.1a4.5 4.5 0 0 0 6.4 6.4l1-1" />
            </svg>
          </div>
          <div style={{ fontSize: 96, fontWeight: 600, letterSpacing: -5 }}>Overlink</div>
        </div>
        <div style={{ fontSize: 46, marginTop: 44, color: "#3c3c43", lineHeight: 1.25, maxWidth: 900 }}>
          Files · Code · Screen — shared with one short link.
        </div>
        <div style={{ fontSize: 28, marginTop: 40, color: "#007aff", fontWeight: 600 }}>Fayl · Kod · Ekran · Файлы · Код · Экран</div>
      </div>
    ),
    size,
  );
}
