// Crée (ou met à jour) l'agent vocal ElevenLabs de Sakia : voix Rima M, arabe (darija) et français, consigne stricte,
// durée maximale 2 minutes, outil get_irrigation_plan. L'agent comprend ; le moteur calcule ; l'agent lit la réponse sans la changer.
//
//   node --env-file=.env.local node_modules/tsx/dist/cli.mjs scripts/agent-create.ts                  → simulation : affiche la configuration, ne crée rien
//   node --env-file=.env.local node_modules/tsx/dist/cli.mjs scripts/agent-create.ts --go             → crée l'outil et l'agent (écrit src/lib/voiceagent/agent.json)
//   node --env-file=.env.local node_modules/tsx/dist/cli.mjs scripts/agent-create.ts --go --update    → met à jour l'agent existant (consigne, voix, modèle)
//   options : --llm <modèle> --tts <modèle> --webhook-url https://<site>/api/agent/plan   (outil « serveur » joignable par ElevenLabs, une fois le site en ligne)
//
// Créer un agent ne consomme aucun crédit : seules les conversations en consomment.

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { agentFile, createAgent, createTool, patchAgent } from "../src/lib/voiceagent/api";
import type { AgentFile } from "../src/lib/voiceagent/api";
import { AGENT_MAX_SECONDS, FIRST_MESSAGE, TOOL_DESCRIPTION, TOOL_NAME, systemPrompt, toolParameters } from "../src/lib/voiceagent/prompt";
import { SELECTED_VOICE } from "../src/lib/voice/voices";

const arg = (name: string, fallback: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[i + 1] : fallback;
};
const GO = process.argv.includes("--go");
const UPDATE = process.argv.includes("--update");
const LLM = arg("llm", "claude-sonnet-4-5");
const TTS = arg("tts", "eleven_v4_turbo");
const WEBHOOK = arg("webhook-url", "");

function toolConfig() {
  if (WEBHOOK) {
    // outil « serveur » : ElevenLabs appelle notre route (adresse publique obligatoire)
    return {
      type: "webhook",
      name: TOOL_NAME,
      description: TOOL_DESCRIPTION,
      response_timeout_secs: 20,
      api_schema: {
        url: WEBHOOK,
        method: "POST",
        request_headers: { "content-type": "application/json" },
        request_body_schema: toolParameters(),
      },
    };
  }
  // outil « client » : la page /call/talk l'exécute en appelant /api/agent/plan
  return { type: "client", name: TOOL_NAME, description: TOOL_DESCRIPTION, parameters: toolParameters(), expects_response: true, response_timeout_secs: 20 };
}

function agentConfig(toolId: string) {
  return {
    name: "Sakia - voice line",
    tags: ["sakia", "hack-nation-7"],
    conversation_config: {
      agent: {
        first_message: FIRST_MESSAGE.ar,
        language: "ar",
        prompt: {
          prompt: systemPrompt(),
          llm: LLM,
          temperature: 0,
          tool_ids: [toolId],
          built_in_tools: {
            language_detection: { type: "system", name: "language_detection", description: "", params: { system_tool_type: "language_detection" } },
          },
        },
      },
      tts: { voice_id: SELECTED_VOICE.id, model_id: TTS, agent_output_audio_format: "pcm_16000" },
      asr: { quality: "high", user_input_audio_format: "pcm_16000" },
      turn: { turn_timeout: 7 },
      conversation: {
        max_duration_seconds: AGENT_MAX_SECONDS,
        client_events: ["conversation_initiation_metadata", "user_transcript", "agent_response", "agent_response_correction", "interruption", "ping", "audio"],
      },
      language_presets: {
        fr: { overrides: { agent: { first_message: FIRST_MESSAGE.fr, language: "fr" } } },
      },
    },
    platform_settings: {
      auth: { enable_auth: true }, // adresse signée obligatoire : personne ne peut consommer nos minutes avec l'identifiant seul
      overrides: { conversation_config_override: { conversation: { text_only: true } } }, // pour mesurer la compréhension sans voix
    },
  };
}

(async () => {
  const existing = agentFile();
  console.log(`Voix ${SELECTED_VOICE.name} (${SELECTED_VOICE.id.slice(0, 6)}…), LLM ${LLM}, synthèse ${TTS}, durée max ${AGENT_MAX_SECONDS} s, outil ${WEBHOOK ? "serveur " + WEBHOOK : "client"}.`);
  console.log(`Consigne : ${systemPrompt().length} caractères.`);
  if (!GO) {
    console.log("Simulation seulement. Relancer avec --go pour créer l'agent (ne consomme aucun crédit).");
    if (existing) console.log(`Agent existant : ${existing.agentId}`);
    return;
  }
  if (existing && !UPDATE) {
    console.log(`Un agent existe déjà (${existing.agentId}). Utiliser --update pour le mettre à jour.`);
    return;
  }
  const tool = existing && UPDATE ? { id: existing.toolId } : await createTool(toolConfig());
  const body = agentConfig(tool.id);
  let agentId: string;
  if (existing && UPDATE) {
    await patchAgent(existing.agentId, { conversation_config: body.conversation_config, platform_settings: body.platform_settings, name: body.name });
    agentId = existing.agentId;
    console.log("Agent mis à jour.");
  } else {
    agentId = (await createAgent(body)).agent_id;
    console.log("Agent créé.");
  }
  const file: AgentFile = { agentId, toolId: tool.id, createdAt: existing?.createdAt ?? new Date().toISOString(), llm: LLM, ttsModel: TTS, voiceId: SELECTED_VOICE.id };
  writeFileSync(join(process.cwd(), "src", "lib", "voiceagent", "agent.json"), JSON.stringify(file, null, 1));
  console.log(`Identifiant de l'agent : ${agentId} (écrit dans src/lib/voiceagent/agent.json ; ce n'est pas un secret).`);
})().catch((e) => {
  console.error("ERREUR :", (e as Error).message);
  process.exit(1);
});
