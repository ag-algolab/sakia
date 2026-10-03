// Client de l'agent vocal ElevenLabs, dans le navigateur : WebSocket signée par notre serveur (la clé ne vient jamais ici),
// micro en PCM 16 kHz envoyé par morceaux, voix de l'agent jouée au fil de l'eau, outil get_irrigation_plan exécuté en appelant
// notre route /api/agent/plan. Pas de dépendance : le protocole est décrit dans la documentation ElevenLabs Agents.

export type AgentToolResult = {
  ok: boolean;
  spoken_text: string;
  english_text: string;
  ask_a_person: boolean;
  confidence: "ok" | "low" | "none";
  region_id: string;
  crop_id: string;
  last_irrigation_days_ago: number | null;
  language: "fr" | "ar";
  plan_date?: string;
  error?: string;
};

export type AgentEvent =
  | { type: "status"; status: "connecting" | "live" | "ended" | "error"; detail?: string; mic?: boolean }
  | { type: "user"; text: string }
  | { type: "agent"; text: string }
  | { type: "tool"; args: Record<string, unknown>; result: AgentToolResult }
  | { type: "speaking"; value: boolean };

// Découpe le micro en morceaux de 100 ms à 16 kHz (Int16) quel que soit le taux de la carte son.
const WORKLET = `
class SakiaPcm extends AudioWorkletProcessor {
  constructor() { super(); this.ratio = sampleRate / 16000; this.acc = 0; this.sum = 0; this.cnt = 0; this.out = new Int16Array(1600); this.k = 0; }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (!ch) return true;
    for (let i = 0; i < ch.length; i++) {
      this.sum += ch[i]; this.cnt++; this.acc += 1;
      if (this.acc >= this.ratio) {
        const v = Math.max(-1, Math.min(1, this.sum / this.cnt));
        this.sum = 0; this.cnt = 0; this.acc -= this.ratio;
        this.out[this.k++] = v < 0 ? v * 0x8000 : v * 0x7fff;
        if (this.k === 1600) { this.port.postMessage(this.out.slice().buffer); this.k = 0; }
      }
    }
    return true;
  }
}
registerProcessor("sakia-pcm", SakiaPcm);
`;

function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

function fromBase64(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}

export class AgentCall {
  private ws: WebSocket | null = null;
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private node: AudioWorkletNode | null = null;
  private sources = new Set<AudioBufferSourceNode>();
  private nextTime = 0;
  private outRate = 16000;
  private ended = false;
  private speaking = false;
  private timer: number | undefined;
  mic = false;

  constructor(private emit: (e: AgentEvent) => void) {}

  async start(): Promise<void> {
    this.emit({ type: "status", status: "connecting" });
    let session: { signedUrl: string; maxSeconds: number };
    try {
      const res = await fetch("/api/agent/session");
      const body = await res.json();
      if (!res.ok) throw new Error(body.message ?? body.error ?? `HTTP ${res.status}`);
      session = body;
    } catch (e) {
      this.fail((e as Error).message);
      return;
    }

    // audio (le clic de l'utilisateur autorise la lecture)
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctx();
    void this.ctx.resume();
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
      });
      const url = URL.createObjectURL(new Blob([WORKLET], { type: "application/javascript" }));
      await this.ctx.audioWorklet.addModule(url);
      URL.revokeObjectURL(url);
      this.node = new AudioWorkletNode(this.ctx, "sakia-pcm");
      this.ctx.createMediaStreamSource(this.stream).connect(this.node);
      this.mic = true;
    } catch {
      this.mic = false; // pas de micro ou refusé : l'agent reste utilisable en tapant
    }

    const ws = new WebSocket(session.signedUrl);
    this.ws = ws;
    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "conversation_initiation_client_data" }));
      if (this.node) {
        this.node.port.onmessage = (ev: MessageEvent<ArrayBuffer>) => {
          if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ user_audio_chunk: toBase64(ev.data) }));
        };
      }
      this.emit({ type: "status", status: "live", mic: this.mic });
      this.timer = window.setTimeout(() => this.stop(), (session.maxSeconds + 5) * 1000);
    };
    ws.onmessage = (ev) => void this.onMessage(ev.data);
    ws.onerror = () => this.fail("connexion impossible");
    ws.onclose = () => this.stop();
  }

  sendText(text: string) {
    if (this.ws?.readyState === WebSocket.OPEN && text.trim()) {
      this.ws.send(JSON.stringify({ type: "user_message", text }));
      this.emit({ type: "user", text });
    }
  }

  private async onMessage(raw: unknown) {
    // message du protocole ElevenLabs : forme variable selon `type`
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let m: any;
    try {
      m = JSON.parse(String(raw));
    } catch {
      return;
    }
    switch (m.type) {
      case "conversation_initiation_metadata": {
        const fmt: string = m.conversation_initiation_metadata_event?.agent_output_audio_format ?? "pcm_16000";
        const rate = Number(/^pcm_(\d+)$/.exec(fmt)?.[1]);
        if (rate) this.outRate = rate;
        break;
      }
      case "audio":
        this.play(m.audio_event?.audio_base_64);
        break;
      case "interruption":
        this.flush();
        break;
      case "user_transcript":
        if (m.user_transcription_event?.user_transcript) this.emit({ type: "user", text: m.user_transcription_event.user_transcript });
        break;
      case "agent_response":
        if (m.agent_response_event?.agent_response) this.emit({ type: "agent", text: m.agent_response_event.agent_response });
        break;
      case "ping":
        this.ws?.send(JSON.stringify({ type: "pong", event_id: m.ping_event?.event_id }));
        break;
      case "client_tool_call":
        await this.tool(m.client_tool_call);
        break;
    }
  }

  private async tool(call: { tool_name: string; tool_call_id: string; parameters?: Record<string, unknown> }) {
    if (call?.tool_name !== "get_irrigation_plan") {
      this.ws?.send(JSON.stringify({ type: "client_tool_result", tool_call_id: call?.tool_call_id, result: "unknown tool", is_error: true }));
      return;
    }
    const args = call.parameters ?? {};
    try {
      const res = await fetch("/api/agent/plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(args),
      });
      const result = (await res.json()) as AgentToolResult;
      this.emit({ type: "tool", args, result });
      this.ws?.send(JSON.stringify({ type: "client_tool_result", tool_call_id: call.tool_call_id, result: JSON.stringify(result), is_error: !res.ok }));
    } catch {
      this.ws?.send(JSON.stringify({ type: "client_tool_result", tool_call_id: call.tool_call_id, result: "plan unavailable: say you are not sure and ask a technician", is_error: true }));
    }
  }

  // --- voix de l'agent
  private play(b64?: string) {
    if (!b64 || !this.ctx) return;
    const pcm = new Int16Array(fromBase64(b64));
    const f32 = new Float32Array(pcm.length);
    for (let i = 0; i < pcm.length; i++) f32[i] = pcm[i] / 0x8000;
    const buf = this.ctx.createBuffer(1, f32.length, this.outRate);
    buf.copyToChannel(f32, 0);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.ctx.destination);
    const at = Math.max(this.ctx.currentTime + 0.02, this.nextTime);
    src.start(at);
    this.nextTime = at + buf.duration;
    this.sources.add(src);
    this.setSpeaking(true);
    src.onended = () => {
      this.sources.delete(src);
      if (this.sources.size === 0) this.setSpeaking(false);
    };
  }

  private flush() {
    for (const s of this.sources) {
      try {
        s.stop();
      } catch {
        // déjà arrêtée
      }
    }
    this.sources.clear();
    this.nextTime = 0;
    this.setSpeaking(false);
  }

  private setSpeaking(v: boolean) {
    if (v !== this.speaking) {
      this.speaking = v;
      this.emit({ type: "speaking", value: v });
    }
  }

  private fail(detail: string) {
    this.cleanup();
    this.emit({ type: "status", status: "error", detail });
  }

  private cleanup() {
    window.clearTimeout(this.timer);
    this.flush();
    this.stream?.getTracks().forEach((t) => t.stop());
    this.node?.disconnect();
    try {
      this.ws?.close();
    } catch {
      // déjà fermée
    }
    void this.ctx?.close();
    this.ctx = null;
    this.stream = null;
    this.node = null;
    this.ws = null;
  }

  stop() {
    if (this.ended) return;
    this.ended = true;
    this.cleanup();
    this.emit({ type: "status", status: "ended" });
  }
}
