import type { Metadata } from "next";
import CuriousDetails from "@/components/phone/CuriousDetails";
import LanguageCoverage from "@/components/phone/LanguageCoverage";
import OfflinePlan from "@/components/phone/OfflinePlan";
import PhoneSimulator from "@/components/phone/PhoneSimulator";
import { ProfileProvider } from "@/components/phone/profile";
import ServiceWorkerRegister from "@/components/phone/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: "Sakia · Keypad phone (simulated)",
  description:
    "A simulated keypad phone: the 7-day irrigation plan arrives by SMS each morning, nothing to type, and you reply with the keys. No real SMS or call is made.",
};

export default function PhonePage() {
  return (
    <main className="flex-1">
      <ProfileProvider>
        <PhoneSimulator />
        <OfflinePlan />
        <LanguageCoverage />
        <CuriousDetails />
      </ProfileProvider>
      <ServiceWorkerRegister />
    </main>
  );
}
