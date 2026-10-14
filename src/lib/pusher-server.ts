import Pusher from "pusher";

const g = globalThis as unknown as { __pusher?: Pusher };

export function pusherConfigured(): boolean {
  return !!(process.env.PUSHER_APP_ID && process.env.PUSHER_SECRET && process.env.NEXT_PUBLIC_PUSHER_KEY && process.env.NEXT_PUBLIC_PUSHER_CLUSTER);
}

export function pusherServer(): Pusher {
  if (!g.__pusher) {
    const host = process.env.PUSHER_HOST; // optional: self-hosted Pusher-compatible server for local testing
    g.__pusher = new Pusher({
      appId: process.env.PUSHER_APP_ID || "",
      key: process.env.NEXT_PUBLIC_PUSHER_KEY || "",
      secret: process.env.PUSHER_SECRET || "",
      ...(host
        ? { host, port: process.env.PUSHER_PORT || "6001", useTLS: process.env.PUSHER_USE_TLS === "true" }
        : { cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "eu", useTLS: true }),
    });
  }
  return g.__pusher;
}
