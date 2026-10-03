import { buildPlan } from "../src/lib/plan";
import { planSms, planMessage, bulletinScript } from "../src/lib/messages";
(async () => {
  const plan = await buildPlan({ regionId: "kairouan", cropId: "olivier", lastIrrigationDaysAgo: 7 });
  for (const l of ["fr", "ar", "en"] as const) {
    const s = planSms(plan, l);
    console.log(`SMS ${l} (${s.length} car.) : ${s}`);
  }
  console.log("\n" + planMessage(plan, "fr"));
  console.log("\n--- bulletin (en) ---");
  for (const x of bulletinScript(plan, "en")) console.log(`[${x.id}] ${x.text}`);
})();
