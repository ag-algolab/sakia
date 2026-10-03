// Client de l'API HTTP de Telegram, avec fetch (aucune bibliothèque).
// Les erreurs ne contiennent jamais l'adresse d'appel (donc jamais le jeton).

import { botToken } from "./config";
import type { InlineKeyboard } from "./types";

const MAX_DOWNLOAD = 1_000_000; // un message vocal de 30 secondes pèse environ 100 Ko

export class TelegramError extends Error {
  constructor(
    readonly method: string,
    readonly status: number,
    readonly description: string,
    readonly retryAfter?: number,
  ) {
    super(`${method} : ${status} ${description}`);
  }
}

type Reply<T> = { ok: boolean; result?: T; description?: string; error_code?: number; parameters?: { retry_after?: number } };

async function call<T>(method: string, body: BodyInit, headers?: Record<string, string>, signal?: AbortSignal): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`https://api.telegram.org/bot${botToken()}/${method}`, { method: "POST", body, headers, signal });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new TelegramError(method, 0, "réseau indisponible");
  }
  const data = (await res.json().catch(() => null)) as Reply<T> | null;
  if (!data || !data.ok) {
    throw new TelegramError(method, data?.error_code ?? res.status, data?.description ?? "réponse invalide", data?.parameters?.retry_after);
  }
  return data.result as T;
}

export function tg<T = unknown>(method: string, params: Record<string, unknown> = {}, signal?: AbortSignal): Promise<T> {
  return call<T>(method, JSON.stringify(params), { "Content-Type": "application/json" }, signal);
}

// Ce que le robot sait faire, derrière une interface : le test à blanc la remplace par une fausse.
export interface BotApi {
  sendMessage(chatId: number, text: string, markup?: InlineKeyboard): Promise<void>;
  editMessage(chatId: number, messageId: number, text: string, markup?: InlineKeyboard): Promise<void>;
  answerCallback(id: string, text?: string): Promise<void>;
  sendChatAction(chatId: number, action: "typing" | "upload_voice"): Promise<void>;
  sendAudio(chatId: number, audio: Buffer, mime: string, caption: string, title: string): Promise<void>;
  downloadFile(fileId: string): Promise<{ data: Buffer; mime: string }>;
}

export const telegramApi: BotApi = {
  async sendMessage(chatId, text, markup) {
    await tg("sendMessage", { chat_id: chatId, text, reply_markup: markup, link_preview_options: { is_disabled: true } });
  },
  async editMessage(chatId, messageId, text, markup) {
    await tg("editMessageText", { chat_id: chatId, message_id: messageId, text, reply_markup: markup });
  },
  async answerCallback(id, text) {
    await tg("answerCallbackQuery", { callback_query_id: id, text });
  },
  async sendChatAction(chatId, action) {
    await tg("sendChatAction", { chat_id: chatId, action });
  },
  async sendAudio(chatId, audio, mime, caption, title) {
    const form = new FormData();
    form.set("chat_id", String(chatId));
    form.set("caption", caption.slice(0, 1000));
    form.set("title", title);
    form.set("performer", "Sakia");
    form.set("audio", new Blob([new Uint8Array(audio)], { type: mime }), mime.includes("mpeg") ? "sakia.mp3" : "sakia-audio");
    await call("sendAudio", form);
  },
  async downloadFile(fileId) {
    const f = await tg<{ file_path?: string; file_size?: number }>("getFile", { file_id: fileId });
    if (!f.file_path || (f.file_size ?? 0) > MAX_DOWNLOAD) throw new TelegramError("getFile", 0, "fichier absent ou trop gros");
    let res: Response;
    try {
      res = await fetch(`https://api.telegram.org/file/bot${botToken()}/${f.file_path}`);
    } catch {
      throw new TelegramError("download", 0, "réseau indisponible");
    }
    if (!res.ok) throw new TelegramError("download", res.status, "téléchargement refusé");
    return { data: Buffer.from(await res.arrayBuffer()), mime: "audio/ogg" };
  },
};
