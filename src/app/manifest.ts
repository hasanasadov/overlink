import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Overlink",
    short_name: "Overlink",
    description: "File, code and screen sharing with short links.",
    start_url: "/",
    display: "standalone",
    background_color: "#f2f2f7",
    theme_color: "#007aff",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
