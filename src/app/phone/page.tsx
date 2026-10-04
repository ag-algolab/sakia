import type { Metadata } from "next";
import OfflinePlan from "@/components/phone/OfflinePlan";
import PhoneSimulator from "@/components/phone/PhoneSimulator";
import { PhoneProfileProvider } from "@/components/phone/phoneProfile";
import ServiceWorkerRegister from "@/components/phone/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: "Sakia · Keypad phone (simulated)",
  description:
    "A simulated keypad phone: the 7-day irrigation plan arrives by SMS each morning, nothing to type, and you reply with the keys. No real SMS or call is made.",
};

// Les sections « langues comprises par le SMS » et « pour les curieux : écrire un SMS en arabizi » ont quitté la page (décision
// d'Anthony, 4 oct. : sur un téléphone à touches on ne tape pas ; pour changer de culture ou de région, on appelle Sakia et on le dit).
// Les messages écrits restent compris par le serveur (src/lib/sms).
export default function PhonePage() {
  return (
    <main className="flex-1">
      <PhoneProfileProvider>
        <PhoneSimulator />
        <OfflinePlan />
      </PhoneProfileProvider>
      <ServiceWorkerRegister />
    </main>
  );
}
