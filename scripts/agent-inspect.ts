// Affiche l'essentiel de la configuration de l'agent tel qu'ElevenLabs l'a enregistré (aucun secret, aucun crédit).
import { agentFile, getAgent } from "../src/lib/voiceagent/api";
(async () => {
  const f = agentFile();
  if (!f) throw new Error("agent non créé");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const a = (await getAgent(f.agentId)) as any;
  const c = a.conversation_config;
  const p = c.agent.prompt;
  console.log(JSON.stringify({
    name: a.name, language: c.agent.language, first_message: c.agent.first_message, llm: p.llm, temperature: p.temperature,
    tool_ids: p.tool_ids, tools: (p.tools ?? []).map((t: { name?: string; type?: string }) => t.name ?? t.type), built_in: Object.keys(p.built_in_tools ?? {}).filter((k) => p.built_in_tools[k]),
    tts: { voice: c.tts.voice_id, model: c.tts.model_id, fmt: c.tts.agent_output_audio_format },
    asr: c.asr, turn: c.turn, max: c.conversation.max_duration_seconds, client_events: c.conversation.client_events,
    presets: Object.keys(c.language_presets ?? {}), auth: a.platform_settings?.auth, overrides: a.platform_settings?.overrides,
  }, null, 1));
})().catch((e) => { console.error("ERREUR :", (e as Error).message); process.exit(1); });
