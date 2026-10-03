// Appels à l'API ElevenLabs Agents. La clé vient de KEY_ELEVENLABS (jamais écrite, jamais affichée, jamais envoyée au navigateur).
// SERVEUR / SCRIPTS SEULEMENT.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const BASE = "https://api.elevenlabs.io/v1";

function key(): string {
  const k = process.env.KEY_ELEVENLABS;
  if (!k) throw new Error("KEY_ELEVENLABS absente de l'environnement");
  return k;
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "xi-api-key": key(), "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`ElevenLabs ${method} ${path} : HTTP ${res.status} ${text.slice(0, 600)}`);
  return (text ? JSON.parse(text) : {}) as T;
}

export const createTool = (toolConfig: unknown) => call<{ id: string }>("POST", "/convai/tools", { tool_config: toolConfig });
export const createAgent = (body: unknown) => call<{ agent_id: string }>("POST", "/convai/agents/create", body);
export const patchAgent = (agentId: string, body: unknown) => call<unknown>("PATCH", `/convai/agents/${agentId}`, body);
export const getAgent = (agentId: string) => call<Record<string, unknown>>("GET", `/convai/agents/${agentId}`);
export const signedUrl = (agentId: string) =>
  call<{ signed_url: string }>("GET", `/convai/conversation/get-signed-url?agent_id=${encodeURIComponent(agentId)}`);

// Identifiant de l'agent : variable d'environnement, sinon le fichier écrit par scripts/agent-create.ts (ce n'est pas un secret).
export type AgentFile = { agentId: string; toolId: string; createdAt: string; llm: string; ttsModel: string; voiceId: string };
export function agentFile(): AgentFile | null {
  const file = join(process.cwd(), "src", "lib", "voiceagent", "agent.json");
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, "utf8")) as AgentFile;
  } catch {
    return null;
  }
}
export function agentId(): string | null {
  return process.env.ELEVENLABS_AGENT_ID || agentFile()?.agentId || null;
}
