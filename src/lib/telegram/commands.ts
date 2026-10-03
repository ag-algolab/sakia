// Menu des commandes affiché par Telegram (une liste par langue).

import { tg } from "./api";

const COMMANDS = {
  fr: [
    ["plan", "Plan d'irrigation des 7 jours"],
    ["bulletin", "Bulletin vocal"],
    ["pluie", "Signaler la pluie chez moi"],
    ["langue", "Changer de langue"],
    ["stop", "Arrêter le bulletin quotidien"],
    ["aide", "Aide"],
  ],
  ar: [
    ["plan", "خطة الري لـ 7 أيام"],
    ["bulletin", "النشرة الصوتية"],
    ["pluie", "الإبلاغ عن المطر عندي"],
    ["langue", "تغيير اللغة"],
    ["stop", "إيقاف النشرة اليومية"],
    ["aide", "مساعدة"],
  ],
  en: [
    ["plan", "7-day irrigation plan"],
    ["bulletin", "Voice bulletin"],
    ["pluie", "Report rain at my place"],
    ["langue", "Change language"],
    ["stop", "Stop the daily bulletin"],
    ["aide", "Help"],
  ],
} as const;

export async function registerCommands(): Promise<void> {
  const list = (l: keyof typeof COMMANDS) => COMMANDS[l].map(([command, description]) => ({ command, description }));
  await tg("setMyCommands", { commands: list("fr") }); // par défaut
  await tg("setMyCommands", { commands: list("ar"), language_code: "ar" });
  await tg("setMyCommands", { commands: list("en"), language_code: "en" });
}
