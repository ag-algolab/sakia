// Types minimaux de l'API Telegram (seulement ce que le bot lit ou envoie).

export type TgUser = { id: number; is_bot?: boolean; language_code?: string };
export type TgChat = { id: number; type: string };
export type TgVoice = { file_id: string; duration: number; mime_type?: string; file_size?: number };
export type TgMessage = { message_id: number; chat: TgChat; from?: TgUser; text?: string; voice?: TgVoice; date: number };
export type TgCallback = { id: string; from: TgUser; message?: TgMessage; data?: string };
export type TgUpdate = { update_id: number; message?: TgMessage; callback_query?: TgCallback };

export type InlineButton = { text: string; callback_data: string };
export type InlineKeyboard = { inline_keyboard: InlineButton[][] };
