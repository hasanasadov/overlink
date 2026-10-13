// Minimal WebRTC full-mesh helper using the "perfect negotiation" pattern.
// Only participants that are sharing send media; everybody else just receives.

export type SignalData = { description?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit };

type PeerState = {
  pc: RTCPeerConnection;
  polite: boolean;
  makingOffer: boolean;
  ignoreOffer: boolean;
  senders: RTCRtpSender[];
};

export function iceServers(): RTCIceServer[] {
  try {
    const custom = process.env.NEXT_PUBLIC_ICE_SERVERS;
    if (custom) return JSON.parse(custom);
  } catch {
    /* fall through to defaults */
  }
  return [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }];
}

export class Mesh {
  private peers = new Map<string, PeerState>();
  private local: MediaStream | null = null;

  constructor(
    private selfId: string,
    private send: (to: string, data: SignalData) => void,
    private onStream: (peerId: string, stream: MediaStream) => void,
    private onPeerGone: (peerId: string) => void,
  ) {}

  private ensure(id: string): PeerState {
    const existing = this.peers.get(id);
    if (existing) return existing;

    const pc = new RTCPeerConnection({ iceServers: iceServers() });
    const state: PeerState = { pc, polite: this.selfId > id, makingOffer: false, ignoreOffer: false, senders: [] };

    pc.onicecandidate = (e) => e.candidate && this.send(id, { candidate: e.candidate.toJSON() });
    pc.onnegotiationneeded = async () => {
      try {
        state.makingOffer = true;
        await pc.setLocalDescription();
        if (pc.localDescription) this.send(id, { description: pc.localDescription.toJSON() });
      } catch (e) {
        console.warn("[mesh] negotiation failed", e);
      } finally {
        state.makingOffer = false;
      }
    };
    pc.ontrack = ({ streams, track }) => {
      const stream = streams[0] ?? new MediaStream([track]);
      this.onStream(id, stream);
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed") pc.restartIce();
      if (pc.connectionState === "closed") this.onPeerGone(id);
    };

    this.peers.set(id, state);
    return state;
  }

  private attach(id: string) {
    const state = this.ensure(id);
    if (!this.local || state.senders.length) return;
    for (const track of this.local.getTracks()) {
      if (track.kind === "video") track.contentHint = "detail";
      const sender = state.pc.addTrack(track, this.local);
      state.senders.push(sender);
      if (track.kind === "video") {
        const params = sender.getParameters();
        if (!params.encodings?.length) params.encodings = [{}];
        params.encodings[0].maxBitrate = 2_500_000;
        sender.setParameters(params).catch(() => {});
      }
    }
  }

  private detach(id: string) {
    const state = this.peers.get(id);
    if (!state) return;
    for (const s of state.senders) {
      try {
        state.pc.removeTrack(s);
      } catch {
        /* connection already closed */
      }
    }
    state.senders = [];
  }

  /** Start (stream) or stop (null) sending our screen to everyone in `peerIds`. */
  setLocal(stream: MediaStream | null, peerIds: string[]) {
    if (!stream) {
      for (const id of this.peers.keys()) this.detach(id);
      this.local = null;
      return;
    }
    this.local = stream;
    for (const id of peerIds) {
      this.detach(id);
      this.attach(id);
    }
  }

  /** Called when someone joins: connect to them if we are currently sharing. */
  peerJoined(id: string) {
    if (this.local) this.attach(id);
  }

  async signal(from: string, data: SignalData) {
    const state = this.ensure(from);
    const { pc } = state;
    try {
      if (data.description) {
        const collision = data.description.type === "offer" && (state.makingOffer || pc.signalingState !== "stable");
        state.ignoreOffer = !state.polite && collision;
        if (state.ignoreOffer) return;
        await pc.setRemoteDescription(data.description);
        if (data.description.type === "offer") {
          await pc.setLocalDescription();
          if (pc.localDescription) this.send(from, { description: pc.localDescription.toJSON() });
        }
      } else if (data.candidate) {
        try {
          await pc.addIceCandidate(data.candidate);
        } catch (e) {
          if (!state.ignoreOffer) throw e;
        }
      }
    } catch (e) {
      console.warn("[mesh] signal error", e);
    }
  }

  removePeer(id: string) {
    const state = this.peers.get(id);
    if (!state) return;
    state.pc.onicecandidate = state.pc.onnegotiationneeded = state.pc.ontrack = state.pc.onconnectionstatechange = null;
    state.pc.close();
    this.peers.delete(id);
  }

  closeAll() {
    for (const id of Array.from(this.peers.keys())) this.removePeer(id);
  }
}
