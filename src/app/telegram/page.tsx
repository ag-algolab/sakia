import type { Metadata } from "next";
import TelegramView from "@/components/telegram/TelegramView";
import { WELCOME } from "@/lib/telegram/i18n";
import { langKeyboard } from "@/lib/telegram/keyboards";

export const metadata: Metadata = {
  title: "Sakia · Telegram",
  description:
    "Sakia on Telegram: pick your region and your crop with buttons and get the 7-day irrigation plan every morning. Try the bot here, with no Telegram account.",
};

export default function TelegramPage() {
  // Premier message du chat de démonstration : exactement celui que le bot envoie pour /start (même texte, mêmes boutons),
  // fabriqué ici côté serveur pour que la page ne soit jamais vide, même avant le premier appel.
  return (
    <main className="flex flex-1 flex-col">
      <TelegramView welcome={{ text: WELCOME, markup: langKeyboard("l") }} />
    </main>
  );
}
