import "./env";
import { createServer } from "node:http";
import next from "next";
import { WebSocketServer } from "ws";
import { handleCodeConnection, sweepCodeDocs, flushCodeDocs } from "./code-sync";
import { handleRoomConnection, sweepRooms } from "./rooms";
import { cleanupExpired } from "../src/lib/cleanup";
import { isValidCode } from "../src/lib/codes";

const dev = process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT || 3000);
const hostname = process.env.HOSTNAME_BIND || "0.0.0.0";

const app = next({ dev, hostname: "localhost", port });
const handle = app.getRequestHandler();

async function main() {
  await app.prepare();
  const upgradeNext = app.getUpgradeHandler();

  const server = createServer((req, res) => {
    void handle(req, res);
  });

  const codeWss = new WebSocketServer({ noServer: true, maxPayload: 8 * 1024 * 1024 });
  const roomWss = new WebSocketServer({ noServer: true, maxPayload: 256 * 1024 });

  server.on("upgrade", (req, socket, head) => {
    const url = new URL(req.url || "/", "http://localhost");
    const m = url.pathname.match(/^\/ws\/(code|room)\/([^/]+)$/);
    if (!m) return void upgradeNext(req, socket, head); // Next.js HMR in dev
    const [, kind, code] = m;
    if (!isValidCode(code)) {
      socket.destroy();
      return;
    }
    const ip = (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() || req.socket.remoteAddress || "local";
    if (kind === "code") {
      codeWss.handleUpgrade(req, socket, head, (ws) => void handleCodeConnection(ws, req, code));
    } else {
      roomWss.handleUpgrade(req, socket, head, (ws) => handleRoomConnection(ws, req, code, ip));
    }
  });

  server.listen(port, hostname, () => {
    console.log(`> Overlink ready on http://localhost:${port} (${dev ? "dev" : "production"})`);
  });

  // Expiry housekeeping: delete expired rows + R2 objects, and drop live sessions that expired.
  const tick = async () => {
    try {
      const r = await cleanupExpired();
      if (r.shares || r.codes || r.rooms) console.log("[cleanup]", r);
      await sweepCodeDocs();
      await sweepRooms();
    } catch (e) {
      console.error("[cleanup] failed", e);
    }
  };
  setTimeout(tick, 5_000);
  const timer = setInterval(tick, 60_000);

  const shutdown = async () => {
    clearInterval(timer);
    await flushCodeDocs().catch(() => {});
    process.exit(0);
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
