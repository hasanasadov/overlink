import PusherJS from "pusher-js";

export function realtimeConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_PUSHER_KEY && process.env.NEXT_PUBLIC_PUSHER_CLUSTER);
}

/** One Pusher connection per room/session. `params` reach /api/pusher/auth (name, password, ownerKey). */
export function createPusher(params: Record<string, string>): PusherJS {
  const wsHost = process.env.NEXT_PUBLIC_PUSHER_WS_HOST; // optional: self-hosted server for local testing
  return new PusherJS(process.env.NEXT_PUBLIC_PUSHER_KEY || "", {
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "eu",
    channelAuthorization: { endpoint: "/api/pusher/auth", transport: "ajax", params },
    ...(wsHost
      ? { wsHost, wsPort: Number(process.env.NEXT_PUBLIC_PUSHER_WS_PORT || 6001), forceTLS: false, enabledTransports: ["ws"] as ("ws" | "wss")[], disableStats: true }
      : {}),
  });
}
