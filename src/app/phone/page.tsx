import type { Metadata } from "next";
import PhoneSimulator from "@/components/phone/PhoneSimulator";
import OfflinePlan from "@/components/phone/OfflinePlan";
import LanguageCoverage from "@/components/phone/LanguageCoverage";
import ServiceWorkerRegister from "@/components/phone/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: "Sakia · Téléphone SMS",
  description: "Un téléphone à touches simulé : on envoie « olivier kairouan » par SMS et le plan d'irrigation des 7 jours revient.",
};

export default function PhonePage() {
  return (
    <main className="flex-1 bg-[#f4efe6] text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      <PhoneSimulator />
      <OfflinePlan />
      <LanguageCoverage />
      <ServiceWorkerRegister />
    </main>
  );
}
